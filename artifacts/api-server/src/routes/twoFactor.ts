import { Router, type Response } from "express";
import rateLimit from "express-rate-limit";
import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import jwt from "jsonwebtoken";
import { requireAuth } from "../middlewares/auth";
import { issueTokens, mapUserWithLedger } from "./auth";
import { createTotpSecret, totpAuthUri, verifyTotpCode } from "../helpers/totpUtil";
import {
  generateBackupCodes, hashBackupCodes, consumeBackupCode, isLikelyBackupCode,
  trustedDeviceCookieName, TRUSTED_DEVICE_DAYS,
} from "../helpers/backupCodesUtil";
import {
  createTrustedDevice, listTrustedDevices, revokeTrustedDevice, revokeAllTrustedDevices,
} from "../helpers/trustedDeviceService";
import {
  recordSuccessfulLogin, maybeSendLoginAlert, isNewLoginDevice, listActiveSessions, revokeSession,
  recordFailedLogin, isAccountLocked,
} from "../helpers/loginSecurityService";
import { setTrustedDeviceCookie } from "../helpers/trustedDeviceCookie";
import { createEmailOtp, verifyEmailOtp, sendOtpEmail } from "../helpers/authHelpers";
import { JWT_SECRET } from "../lib/jwtSecret";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  TotpCodeBody,
  TwoFactorVerifyLoginBody,
  TwoFactorSendLoginOtpBody,
} from "../lib/routeBodySchemas";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: { error: "Too many OTP requests. Try again later." },
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many verification attempts. Try again later." },
});

function readTrustedDeviceToken(req: any): string | undefined {
  return req.body?.trustedDeviceToken
    || req.headers["x-trusted-device"]
    || req.cookies?.[trustedDeviceCookieName()];
}

async function completeLogin(user: typeof usersTable.$inferSelect, req: any, res: Response, opts?: { trustDevice?: boolean }) {
  const isNewDevice = await isNewLoginDevice(user.id, req);
  const tokens = await issueTokens(user, { login: true, req });
  await recordSuccessfulLogin(user.id, req);
  await maybeSendLoginAlert({ user, req, isNewDevice });

  const payload: Record<string, unknown> = {
    user: await mapUserWithLedger(user),
    ...tokens,
  };

  if (opts?.trustDevice) {
    const { token, expiresAt } = await createTrustedDevice({ userId: user.id, req });
    setTrustedDeviceCookie(res, token, expiresAt);
    payload.trustedDeviceExpiresAt = expiresAt.toISOString();
  }

  res.json(payload);
}

async function verifySecondFactor(user: typeof usersTable.$inferSelect, code: string, method?: string): Promise<{ ok: boolean; backupUpdated?: string }> {
  const normalizedMethod = method || (isLikelyBackupCode(code) ? "backup" : "totp");

  if (normalizedMethod === "email" || normalizedMethod === "email_otp") {
    const valid = await verifyEmailOtp({ email: user.email, otp: code, purpose: "login" });
    return { ok: valid };
  }

  if ((normalizedMethod === "sms" || normalizedMethod === "sms_otp") && user.phone) {
    const valid = await verifyEmailOtp({ email: `sms:${user.phone}`, otp: code, purpose: "login" });
    return { ok: valid };
  }

  if ((normalizedMethod === "whatsapp" || normalizedMethod === "whatsapp_otp") && user.phone) {
    const valid = await verifyEmailOtp({ email: `sms:${user.phone}`, otp: code, purpose: "login" });
    return { ok: valid };
  }

  if (normalizedMethod === "backup" || isLikelyBackupCode(code)) {
    const updated = await consumeBackupCode(code, user.twoFactorBackupCodes);
    if (!updated) return { ok: false };
    await db.update(usersTable).set({ twoFactorBackupCodes: updated, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    return { ok: true, backupUpdated: updated };
  }

  if (!user.twoFactorSecret) return { ok: false };
  return { ok: verifyTotpCode(user.twoFactorSecret, String(code)) };
}

router.post("/setup", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const secret = createTotpSecret();
  const qrUri = totpAuthUri(user.email, secret);
  await db.update(usersTable).set({ twoFactorTempSecret: secret }).where(eq(usersTable.id, userId));
  res.json({ secret, otpauthUri: qrUri });
});

router.post("/enable", requireAuth, validateBody(TotpCodeBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { code } = getValidatedBody<{ code: string }>(req);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.twoFactorTempSecret) {
    res.status(400).json({ error: "No pending 2FA setup found. Start setup first." }); return;
  }

  if (!verifyTotpCode(user.twoFactorTempSecret, String(code))) {
    res.status(400).json({ error: "Invalid TOTP code. Check your authenticator app." }); return;
  }

  const backupCodes = generateBackupCodes();
  const backupHashes = await hashBackupCodes(backupCodes);

  await db.update(usersTable).set({
    twoFactorEnabled: true,
    twoFactorSecret: user.twoFactorTempSecret,
    twoFactorTempSecret: null,
    twoFactorBackupCodes: backupHashes,
  }).where(eq(usersTable.id, userId));

  res.json({
    message: "Two-factor authentication enabled successfully",
    backupCodes,
  });
});

router.post("/disable", requireAuth, validateBody(TotpCodeBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { code } = getValidatedBody<{ code: string }>(req);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.twoFactorEnabled) {
    res.status(400).json({ error: "2FA is not enabled" }); return;
  }

  const check = await verifySecondFactor(user, String(code));
  if (!check.ok) { res.status(400).json({ error: "Invalid verification code" }); return; }

  await db.update(usersTable).set({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null,
    twoFactorBackupCodes: null,
  }).where(eq(usersTable.id, userId));
  await revokeAllTrustedDevices(userId);

  res.json({ message: "Two-factor authentication disabled" });
});

router.post("/send-login-otp", otpLimiter, validateBody(TwoFactorSendLoginOtpBody), async (req, res) => {
  const { tempToken, channel = "email" } = getValidatedBody<{
    tempToken: string;
    channel?: "email" | "sms" | "whatsapp";
  }>(req);

  let payload: any;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET + "-2fa-temp") as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please login again." }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.twoFactorEnabled) {
    res.status(400).json({ error: "2FA not configured for this account" }); return;
  }

  const { otp } = await createEmailOtp({
    email: channel === "email" ? user.email : `sms:${user.phone}`,
    userId: user.id,
    purpose: "login",
    ttlMinutes: 10,
  });

  const { sendOtpViaChannel } = await import("../helpers/otpDeliveryService");
  const deliveryChannel = channel === "whatsapp" ? "whatsapp" : channel === "sms" ? "sms" : "email";
  const delivery = await sendOtpViaChannel({
    channel: deliveryChannel,
    email: user.email,
    phone: user.phone || undefined,
    name: user.fullName,
    otp,
    purpose: "Login Verification",
    ttlMinutes: 10,
  });

  if (!delivery.ok) {
    res.status(503).json({ error: delivery.message });
    return;
  }

  res.json({
    message: delivery.message,
    channel: delivery.channel,
    maskedEmail: user.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    maskedPhone: user.phone ? user.phone.replace(/(.{2}).+(.{2})/, "$1***$2") : undefined,
    devOtp: delivery.devOtp,
  });
});

router.post("/verify-login", verifyLimiter, validateBody(TwoFactorVerifyLoginBody), async (req, res) => {
  const { tempToken, code, method, trustDevice } = getValidatedBody<{
    tempToken: string;
    code: string;
    method?: string;
    trustDevice?: boolean;
  }>(req);

  let payload: any;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET + "-2fa-temp") as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please login again." }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.twoFactorEnabled) {
    res.status(400).json({ error: "2FA not configured for this account" }); return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Account is suspended. Please contact support." });
    return;
  }
  if (await isAccountLocked(user)) {
    res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    return;
  }

  const check = await verifySecondFactor(user, String(code), method);
  if (!check.ok) {
    await recordFailedLogin(user.id, req, "2fa_failed");
    const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (fresh && await isAccountLocked(fresh)) {
      res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
      return;
    }
    res.status(400).json({ error: "Invalid verification code" });
    return;
  }

  await completeLogin(user, req, res, { trustDevice: Boolean(trustDevice) });
});

router.post("/regenerate-backup-codes", requireAuth, validateBody(TotpCodeBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { code } = getValidatedBody<{ code: string }>(req);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ error: "2FA is not enabled" }); return;
  }
  if (!verifyTotpCode(user.twoFactorSecret, String(code))) {
    res.status(400).json({ error: "Invalid authenticator code" }); return;
  }

  const backupCodes = generateBackupCodes();
  const backupHashes = await hashBackupCodes(backupCodes);
  await db.update(usersTable).set({ twoFactorBackupCodes: backupHashes, updatedAt: new Date() }).where(eq(usersTable.id, userId));
  res.json({ backupCodes, message: "New backup codes generated. Store them securely." });
});

router.get("/trusted-devices", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await listTrustedDevices(userId));
});

router.delete("/trusted-devices/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const ok = await revokeTrustedDevice(userId, Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Device not found" }); return; }
  res.json({ message: "Trusted device removed" });
});

router.get("/sessions", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await listActiveSessions(userId));
});

router.delete("/sessions/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const ok = await revokeSession(userId, Number(req.params.id));
  if (!ok) { res.status(404).json({ error: "Session not found" }); return; }
  res.json({ message: "Session revoked" });
});

export { readTrustedDeviceToken, completeLogin, verifySecondFactor, TRUSTED_DEVICE_DAYS };
export default router;
