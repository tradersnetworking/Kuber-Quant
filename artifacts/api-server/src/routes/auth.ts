import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { db, usersTable, userProfilesTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { requireAuth, signToken, signRefreshToken, verifyRefreshToken } from "../middlewares/auth";
import { OAuth2Client } from "google-auth-library";
import {
  createEmailOtp, verifyEmailOtp, createRefreshToken, revokeRefreshToken,
  validateRefreshToken, sendOtpEmail, revokeAllRefreshTokensForUser,
} from "../helpers/authHelpers";
import { invalidateUserSessions } from "../helpers/sessionService";
import { sendMail, buildWelcomeEmail, buildPasswordResetEmail } from "../helpers/mailer";
import { getSiteSettings } from "../helpers/siteSettings";
import { getPermissionsForRole } from "../helpers/rbacService";
import { getUserProfile, updateUserProfile } from "../helpers/profileService";
import { resolveLoginEmail } from "../helpers/defaultUsers";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { syncPassportPhotoUrl, copyPassportPhotoToAvatar } from "../helpers/passportPhotoService";
import { resolvePublicAssetUrl } from "../helpers/publicAssetUrl";
import { getWalletFinancialSummary } from "../helpers/walletService";
import { resolveReferrerId } from "../helpers/referralAttribution";
import { mapUserServiceFlags } from "../helpers/userAccessControl";
import {
  isAccountLocked, recordFailedLogin, recordSuccessfulLogin, maybeSendLoginAlert, isNewLoginDevice,
} from "../helpers/loginSecurityService";
import { validateTrustedDevice, parseUserAgent, clientIp } from "../helpers/trustedDeviceService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { LoginBody, GoogleAuthBody } from "@workspace/api-zod";
import { readTrustedDeviceToken } from "./twoFactor";

const router = Router();
const profileUpload = createUploadMiddleware("profile_images");
import { JWT_SECRET } from "../lib/jwtSecret";

function generateReferralCode(): string {
  return "KQ" + randomBytes(3).toString("hex").toUpperCase();
}

export { generateReferralCode };

export function mapUser(user: any) {
  const role = user.role === "admin" ? "admin" : user.role;
  const services = mapUserServiceFlags(user);
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || null,
    role,
    kycStatus: user.kycStatus,
    balanceFiat: Number(user.balanceFiat),
    balanceCrypto: Number(user.balanceCrypto),
    totalProfit: Number(user.totalProfit),
    referralCode: user.referralCode || null,
    referralCount: user.referralCount || 0,
    referralEarnings: Number(user.referralEarnings || 0),
    avatarUrl: resolvePublicAssetUrl(user.avatarUrl),
    managerId: user.managerId || null,
    isPromoter: user.isPromoter ?? false,
    promoterCommissionType: user.promoterCommissionType || null,
    twoFactorEnabled: user.twoFactorEnabled || false,
    ...services,
    createdAt: user.createdAt.toISOString(),
  };
}

/** Returns user payload with balances derived from the wallet ledger (source of truth). */
export async function mapUserWithLedger(user: typeof usersTable.$inferSelect) {
  const summary = await getWalletFinancialSummary(user.id);
  return mapUser({
    ...user,
    balanceFiat: summary.fiatBalance,
    balanceCrypto: summary.cryptoBalance,
  });
}


async function bumpSessionForLogin(user: typeof usersTable.$inferSelect): Promise<number> {
  if (user.role === "superadmin") {
    return user.sessionVersion ?? 1;
  }
  await revokeAllRefreshTokensForUser(user.id);
  const next = (user.sessionVersion ?? 1) + 1;
  await db.update(usersTable)
    .set({ sessionVersion: next, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));
  return next;
}

async function issueTokens(
  user: { id: number; role: string; sessionVersion?: number | null },
  opts?: { login?: boolean; req?: any },
) {
  let sessionVersion = user.sessionVersion ?? 1;
  if (opts?.login) {
    const [fresh] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
    if (!fresh) throw new Error("User not found");
    sessionVersion = await bumpSessionForLogin(fresh);
    user = { ...user, role: fresh.role };
  }
  const role = user.role;
  const payload = { userId: user.id, role, sessionVersion };
  const token = signToken(payload);
  const refreshToken = signRefreshToken(payload);

  let deviceMeta: { ipAddress?: string; userAgent?: string; deviceLabel?: string } | undefined;
  if (opts?.req) {
    const ua = opts.req.headers["user-agent"] || "";
    const { label } = parseUserAgent(ua);
    deviceMeta = { ipAddress: clientIp(opts.req), userAgent: ua, deviceLabel: label };
  }
  await createRefreshToken(user.id, refreshToken, 30, deviceMeta);
  return { token, refreshToken };
}

export { issueTokens };

router.post("/register", async (_req, res) => {
  res.status(410).json({
    error: "Legacy registration is disabled. Please use the full onboarding flow.",
    redirectTo: "/register",
  });
});

router.post("/login", validateBody(LoginBody), async (req, res) => {
  const { email, password } = getValidatedBody<{ email: string; password: string }>(req);
  const loginEmail = resolveLoginEmail(email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, loginEmail)).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Account is suspended. Please contact support." });
    return;
  }
  if (await isAccountLocked(user)) {
    res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await recordFailedLogin(user.id, req, "Invalid password");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const trusted = await validateTrustedDevice(user.id, readTrustedDeviceToken(req));
    if (trusted) {
      const tokens = await issueTokens(user, { login: true, req });
      await recordSuccessfulLogin(user.id, req);
      res.json({ user: await mapUserWithLedger(user), ...tokens, trustedDeviceUsed: true });
      return;
    }
    const { getLogin2faMethods } = await import("../helpers/otpDeliveryService");
    const tempToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET + "-2fa-temp", { expiresIn: "5m" });
    res.json({
      requiresTwoFactor: true,
      tempToken,
      methods: await getLogin2faMethods(user),
      maskedEmail: user.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
      maskedPhone: user.phone ? user.phone.replace(/(.{2}).+(.{2})/, "$1***$2") : undefined,
    });
    return;
  }

  const tokens = await issueTokens(user, { login: true, req });
  const isNewDevice = await isNewLoginDevice(user.id, req);
  await recordSuccessfulLogin(user.id, req);
  await maybeSendLoginAlert({ user, req, isNewDevice });
  res.json({ user: await mapUserWithLedger(user), ...tokens });
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }
  const userId = await validateRefreshToken(refreshToken);
  if (!userId) {
    res.status(401).json({ error: "Invalid or expired refresh token" });
    return;
  }
  let jwtPayload;
  try {
    jwtPayload = verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  if (user.role !== "superadmin") {
    if ((jwtPayload.sessionVersion ?? 1) !== (user.sessionVersion ?? 1)) {
      res.status(401).json({
        error: "Your account was signed in on another device. Please sign in again.",
        code: "SESSION_REPLACED",
      });
      return;
    }
  }
  await revokeRefreshToken(refreshToken);
  const tokens = await issueTokens(user);
  res.json({ user: await mapUserWithLedger(user), ...tokens });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const loginEmail = resolveLoginEmail(email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, loginEmail)).limit(1);
  // Always return success to prevent email enumeration
  if (!user) {
    res.json({ message: "If an account exists, a verification code has been sent." });
    return;
  }
  const { otp } = await createEmailOtp({ email: user.email, userId: user.id, purpose: "password_reset" });
  await sendOtpEmail({ to: user.email, name: user.fullName, otp, purpose: "Password Reset" });
  res.json({ message: "If an account exists, a verification code has been sent." });
});

router.post("/verify-otp", async (req, res) => {
  const { email, otp, purpose } = req.body;
  if (!email || !otp) {
    res.status(400).json({ error: "email and otp are required" });
    return;
  }
  const valid = await verifyEmailOtp({
    email: email.toLowerCase(),
    otp,
    purpose: purpose || "password_reset",
  });
  if (!valid) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }
  const resetToken = jwt.sign({ email: email.toLowerCase(), purpose: "password_reset" }, JWT_SECRET + "-reset", { expiresIn: "15m" });
  res.json({ resetToken, message: "OTP verified successfully" });
});

router.post("/reset-password", async (req, res) => {
  const { resetToken, newPassword, email, otp } = req.body;
  if (!newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  let userEmail: string | null = null;
  if (resetToken) {
    try {
      const payload = jwt.verify(resetToken, JWT_SECRET + "-reset") as { email: string; purpose: string };
      if (payload.purpose !== "password_reset") throw new Error("invalid");
      userEmail = payload.email;
    } catch {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
  } else if (email && otp) {
    const valid = await verifyEmailOtp({ email: email.toLowerCase(), otp, purpose: "password_reset" });
    if (!valid) {
      res.status(400).json({ error: "Invalid or expired verification code" });
      return;
    }
    userEmail = email.toLowerCase();
  } else {
    res.status(400).json({ error: "resetToken or email+otp required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, userEmail!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  await invalidateUserSessions(user.id);
  res.json({ message: "Password reset successfully" });
});

router.get("/config", async (_req, res) => {
  const settings = await getSiteSettings(["google_oauth_enabled", "google_client_id"]);
  const envClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleClientId = settings.google_client_id?.trim() || envClientId;
  res.json({
    googleOAuthEnabled: settings.google_oauth_enabled === "true",
    googleClientId,
    otp: await import("../helpers/otpCommunicationSettings").then(m => m.getPublicOtpConfig()),
  });
});

router.post("/google", validateBody(GoogleAuthBody), async (req, res) => {
  const { idToken, referralCode } = getValidatedBody<{ idToken: string; referralCode?: string }>(req);

  const settings = await getSiteSettings(["google_oauth_enabled", "google_client_id"]);
  if (settings.google_oauth_enabled !== "true") {
    res.status(403).json({ error: "Google sign-in is currently disabled." });
    return;
  }

  const clientId = settings.google_client_id?.trim()
    || process.env.GOOGLE_CLIENT_ID
    || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(500).json({ error: "Google OAuth is not configured on the server." });
    return;
  }

  const client = new OAuth2Client(clientId);
  let payload: any;
  try {
    const ticket = await client.verifyIdToken({ idToken, audience: clientId });
    payload = ticket.getPayload();
  } catch {
    res.status(401).json({ error: "Invalid Google token. Please try again." });
    return;
  }

  if (!payload?.email) {
    res.status(401).json({ error: "Google account has no email address." });
    return;
  }

  const googleEmail = payload.email as string;
  const googleName = (payload.name as string) || googleEmail.split("@")[0];
  const avatarUrl = (payload.picture as string) || null;

  let [user] = await db.select().from(usersTable).where(eq(usersTable.email, googleEmail)).limit(1);

  let isNewUser = false;
  if (!user) {
    isNewUser = true;
    const newReferralCode = generateReferralCode();
    const referrerId = referralCode ? await resolveReferrerId(referralCode) : null;
    const [created] = await db.insert(usersTable).values({
      email: googleEmail,
      passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10),
      fullName: googleName,
      avatarUrl,
      referralCode: newReferralCode,
      referredBy: referrerId,
    }).returning();
    user = created;
    if (referrerId) {
      const [referrer] = await db.select().from(usersTable).where(eq(usersTable.id, referrerId)).limit(1);
      if (referrer) {
        await db.update(usersTable)
          .set({ referralCount: (referrer.referralCount || 0) + 1 })
          .where(eq(usersTable.id, referrerId));
      }
    }
  } else {
    if (!user.isActive) {
      res.status(403).json({ error: "Account is suspended. Please contact support." });
      return;
    }
    if (avatarUrl && !user.avatarUrl) {
      await db.update(usersTable).set({ avatarUrl }).where(eq(usersTable.id, user.id));
      user = { ...user, avatarUrl };
    }
  }

  const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, user.id)).limit(1);
  const needsOnboarding = isNewUser || !profile?.onboardingCompletedAt;

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET + "-2fa-temp", { expiresIn: "5m" });
    res.json({
      requiresTwoFactor: true,
      tempToken,
      methods: ["totp", "email_otp", "backup"],
      maskedEmail: user.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
      needsOnboarding,
    });
    return;
  }

  const tokens = await issueTokens(user, { login: true, req });
  const isNewDevice = await isNewLoginDevice(user.id, req);
  await recordSuccessfulLogin(user.id, req);
  await maybeSendLoginAlert({ user, req, isNewDevice });
  res.json({
    user: await mapUserWithLedger(user),
    ...tokens,
    needsOnboarding,
  });
});

router.put("/change-password", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash, passwordChangedAt: new Date(), updatedAt: new Date() }).where(eq(usersTable.id, userId));
  await invalidateUserSessions(userId);
  const { logAudit } = await import("../helpers/audit");
  await logAudit({ req, userId, role: (req as any).user.role, action: "password_changed", entity: "user", entityId: userId });
  res.json({ message: "Password changed successfully" });
});

router.post("/logout", requireAuth, async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await revokeRefreshToken(refreshToken);
  }
  res.json({ message: "Logged out successfully" });
});

router.get("/me", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(await mapUserWithLedger(user));
});

router.get("/permissions", requireAuth, async (req, res) => {
  const { role } = (req as any).user;
  const permissions = await getPermissionsForRole(role);
  res.json({ role, permissions });
});

router.get("/data-export", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { buildUserDataExport } = await import("../helpers/gdprExportService");
  const data = await buildUserDataExport(userId);
  if (!data) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="kuber-data-export-${userId}.json"`);
  res.json(data);
});

router.get("/profile", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const profile = await getUserProfile(userId);
  if (!profile) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(profile);
});

router.patch("/profile", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const profile = await updateUserProfile(userId, req.body);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to update profile" });
  }
});

router.post("/profile/avatar", requireAuth, profileUpload.single("avatar"), async (req, res) => {
  const { userId } = (req as any).user;
  if (!req.file) {
    res.status(400).json({ error: "avatar image file is required" });
    return;
  }
  const avatarUrl = getUploadUrl("profile_images", req.file.filename);
  const [user] = await db.update(usersTable)
    .set({ avatarUrl, updatedAt: new Date() })
    .where(eq(usersTable.id, userId))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await syncPassportPhotoUrl(userId, avatarUrl, { onlyIfEmpty: true });
  const profile = await getUserProfile(userId);
  res.json(profile);
});

router.post("/profile/avatar/from-kyc", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  try {
    await copyPassportPhotoToAvatar(userId);
    const profile = await getUserProfile(userId);
    if (!profile) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(profile);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to use KYC passport photo" });
  }
});

export default router;
