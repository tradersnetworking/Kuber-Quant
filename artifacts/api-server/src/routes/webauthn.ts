import { Router } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { requireAuth, requirePlatformAdmin } from "../middlewares/auth";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  WebauthnRegisterVerifyBody,
  WebauthnLoginBeginBody,
  WebauthnLoginFinishBody,
  Webauthn2faVerifyBody,
  WebauthnRenameCredentialBody,
  WebauthnPrefsBody,
  WebauthnActionVerifyBody,
} from "../lib/routeBodySchemas";
import {
  createRegistrationOptions,
  verifyRegistration,
  createAuthenticationOptionsByEmail,
  createAuthenticationOptions,
  verifyAuthentication,
  listUserCredentials,
  removeCredential,
  renameCredential,
  listUserBiometricLogs,
  getUserBiometricPrefs,
  updateUserBiometricPrefs,
  createActionVerificationOptions,
  verifyActionWithPasskey,
  userHasPasskeys,
  logBiometricEvent,
} from "../helpers/webauthnService";
import { resolveLoginEmail } from "../helpers/defaultUsers";
import {
  issueTokens,
  mapUserWithLedger,
} from "./auth";
import { completeLogin } from "./twoFactor";
import {
  recordFailedLogin,
  isAccountLocked,
  recordSuccessfulLogin,
  maybeSendLoginAlert,
  isNewLoginDevice,
} from "../helpers/loginSecurityService";
import { JWT_SECRET } from "../lib/jwtSecret";
import { biometricLoginLogsTable } from "@workspace/db";
import { desc } from "@workspace/db/orm";

const router = Router();

const webauthnLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many biometric attempts. Try again later." },
});

router.get("/available", (_req, res) => {
  res.json({
    supported: true,
    rpId: process.env.WEBAUTHN_RP_ID || "localhost",
  });
});

router.get("/credentials", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [creds, prefs] = await Promise.all([
    listUserCredentials(userId),
    getUserBiometricPrefs(userId),
  ]);
  res.json({ credentials: creds, preferences: prefs });
});

router.get("/login-history", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await listUserBiometricLogs(userId));
});

router.patch("/preferences", requireAuth, validateBody(WebauthnPrefsBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<{
    quickLoginEnabled?: boolean;
    biometricWithdrawalsEnabled?: boolean;
    withdrawalThresholdInr?: number;
  }>(req);
  res.json(await updateUserBiometricPrefs(userId, body));
});

router.post("/register/begin", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const { options, challengeKey } = await createRegistrationOptions(userId, user.email, user.fullName);
  res.json({ options, challengeKey });
});

router.post("/register/finish", requireAuth, validateBody(WebauthnRegisterVerifyBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<{
    response: any;
    challengeKey: string;
    deviceName?: string;
  }>(req);
  const result = await verifyRegistration(userId, body.response, body.challengeKey, req, body.deviceName);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ ok: true, credentialId: result.credentialId, message: "Passkey registered successfully" });
});

router.post("/login/begin", webauthnLimiter, validateBody(WebauthnLoginBeginBody), async (req, res) => {
  const { email } = getValidatedBody<{ email: string }>(req);
  const loginEmail = resolveLoginEmail(email);
  try {
    const { options, challengeKey, userId } = await createAuthenticationOptionsByEmail(loginEmail);
    res.json({ options, challengeKey, userId });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Passkey login unavailable" });
  }
});

router.post("/login/finish", webauthnLimiter, validateBody(WebauthnLoginFinishBody), async (req, res) => {
  const body = getValidatedBody<{
    email: string;
    response: any;
    challengeKey: string;
    userId: number;
  }>(req);
  const loginEmail = resolveLoginEmail(body.email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, loginEmail)).limit(1);
  if (!user || user.id !== body.userId || !user.isActive) {
    res.status(401).json({ error: "Invalid account" });
    return;
  }
  if (await isAccountLocked(user)) {
    res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    return;
  }

  const verified = await verifyAuthentication(user.id, body.response, body.challengeKey, req, "login");
  if (!verified.ok) {
    await recordFailedLogin(user.id, req, "passkey_failed");
    res.status(401).json({ error: verified.error || "Passkey verification failed" });
    return;
  }

  const tokens = await issueTokens(user, { login: true, req });
  const isNewDevice = await isNewLoginDevice(user.id, req);
  await recordSuccessfulLogin(user.id, req);
  await maybeSendLoginAlert({ user, req, isNewDevice });

  res.json({
    user: await mapUserWithLedger(user),
    ...tokens,
    passkeyUsed: true,
  });
});

router.post("/2fa/begin", webauthnLimiter, async (req, res) => {
  const { tempToken } = req.body ?? {};
  if (!tempToken) {
    res.status(400).json({ error: "tempToken required" });
    return;
  }
  let payload: any;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET + "-2fa-temp") as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please login again." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !(await userHasPasskeys(user.id))) {
    res.status(400).json({ error: "No passkeys registered" });
    return;
  }
  const { options, challengeKey } = await createAuthenticationOptions(user.id);
  res.json({ options, challengeKey, userId: user.id });
});

router.post("/2fa/finish", webauthnLimiter, validateBody(Webauthn2faVerifyBody), async (req, res) => {
  const body = getValidatedBody<{
    tempToken: string;
    response: any;
    challengeKey: string;
    trustDevice?: boolean;
  }>(req);

  let payload: any;
  try {
    payload = jwt.verify(body.tempToken, JWT_SECRET + "-2fa-temp") as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please login again." });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.twoFactorEnabled || !user.isActive) {
    res.status(400).json({ error: "2FA not configured for this account" });
    return;
  }

  const verified = await verifyAuthentication(user.id, body.response, body.challengeKey, req, "2fa");
  if (!verified.ok) {
    await recordFailedLogin(user.id, req, "passkey_2fa_failed");
    res.status(400).json({ error: verified.error || "Passkey verification failed" });
    return;
  }

  await completeLogin(user, req, res, { trustDevice: Boolean(body.trustDevice) });
});

router.post("/action/begin", requireAuth, webauthnLimiter, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const { options, challengeKey } = await createActionVerificationOptions(userId);
    res.json({ options, challengeKey });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/action/verify", requireAuth, webauthnLimiter, validateBody(WebauthnActionVerifyBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<{ response: any; challengeKey: string }>(req);
  const result = await verifyActionWithPasskey(userId, body.response, body.challengeKey, req);
  if (!result.ok) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({ verified: true, actionToken: jwt.sign({ userId, purpose: "biometric_action" }, JWT_SECRET, { expiresIn: "5m" }) });
});

router.patch("/credentials/:id", requireAuth, validateBody(WebauthnRenameCredentialBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { deviceName } = getValidatedBody<{ deviceName: string }>(req);
  const row = await renameCredential(userId, Number(req.params.id), deviceName);
  if (!row) {
    res.status(404).json({ error: "Credential not found" });
    return;
  }
  res.json({ id: row.id, deviceName: row.deviceName });
});

router.delete("/credentials/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const ok = await removeCredential(userId, Number(req.params.id));
  if (!ok) {
    res.status(404).json({ error: "Credential not found" });
    return;
  }
  await logBiometricEvent({ userId, eventType: "revoke", success: true, req });
  res.json({ message: "Passkey removed" });
});

const admin = Router();
admin.use(requireAuth, requirePlatformAdmin);

admin.get("/logs", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 200, 500);
  const rows = await db
    .select()
    .from(biometricLoginLogsTable)
    .orderBy(desc(biometricLoginLogsTable.createdAt))
    .limit(limit);
  res.json(rows);
});

router.use("/admin", admin);

export default router;
