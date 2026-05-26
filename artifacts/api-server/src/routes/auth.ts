import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { db, usersTable, loginHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken, signRefreshToken, verifyRefreshToken } from "../middlewares/auth";
import { OAuth2Client } from "google-auth-library";
import {
  createEmailOtp, verifyEmailOtp, createRefreshToken, revokeRefreshToken,
  validateRefreshToken, sendOtpEmail,
} from "../helpers/authHelpers";
import { sendMail, buildWelcomeEmail, buildPasswordResetEmail } from "../helpers/mailer";
import { getSiteSettings } from "../helpers/siteSettings";
import { getUserProfile, updateUserProfile } from "../helpers/profileService";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";

const router = Router();
const profileUpload = createUploadMiddleware("profile_images");
import { JWT_SECRET } from "../lib/jwtSecret";

function generateReferralCode(): string {
  return "KQ" + randomBytes(3).toString("hex").toUpperCase();
}

export { generateReferralCode };

export function mapUser(user: any) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone || null,
    role: user.role,
    kycStatus: user.kycStatus,
    balanceFiat: Number(user.balanceFiat),
    balanceCrypto: Number(user.balanceCrypto),
    totalProfit: Number(user.totalProfit),
    referralCode: user.referralCode || null,
    referralCount: user.referralCount || 0,
    referralEarnings: Number(user.referralEarnings || 0),
    avatarUrl: user.avatarUrl || null,
    managerId: user.managerId || null,
    isActive: user.isActive,
    isPromoter: user.isPromoter ?? false,
    promoterCommissionType: user.promoterCommissionType || null,
    twoFactorEnabled: user.twoFactorEnabled || false,
    createdAt: user.createdAt.toISOString(),
  };
}

async function issueTokens(user: { id: number; role: string }) {
  const token = signToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  await createRefreshToken(user.id, refreshToken);
  return { token, refreshToken };
}

export { issueTokens };

async function trackLogin(userId: number, req: any, success: boolean, failReason?: string) {
  try {
    const ua = req.headers["user-agent"] || "";
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || "unknown";
    const browser = ua.includes("Chrome") ? "Chrome" : ua.includes("Firefox") ? "Firefox" : ua.includes("Safari") ? "Safari" : "Other";
    const device = ua.includes("Mobile") ? "Mobile" : "Desktop";
    await db.insert(loginHistoryTable).values({ userId, ipAddress: ip, userAgent: ua, browser, device, success, failReason: failReason || null });
  } catch { /* non-fatal */ }
}

router.post("/register", async (_req, res) => {
  res.status(410).json({
    error: "Legacy registration is disabled. Please use the full onboarding flow.",
    redirectTo: "/register",
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (!user.isActive) {
    res.status(403).json({ error: "Account is suspended. Please contact support." });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await trackLogin(user.id, req, false, "Invalid password");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = jwt.sign({ userId: user.id }, JWT_SECRET + "-2fa-temp", { expiresIn: "5m" });
    res.json({ requiresTwoFactor: true, tempToken });
    return;
  }

  const tokens = await issueTokens(user);
  await trackLogin(user.id, req, true);
  res.json({ user: mapUser(user), ...tokens });
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
  try {
    verifyRefreshToken(refreshToken);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.isActive) {
    res.status(401).json({ error: "User not found or inactive" });
    return;
  }
  await revokeRefreshToken(refreshToken);
  const tokens = await issueTokens(user);
  res.json({ user: mapUser(user), ...tokens });
});

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
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
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password reset successfully" });
});

router.get("/config", async (_req, res) => {
  const settings = await getSiteSettings(["google_oauth_enabled", "google_client_id"]);
  const envClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || "";
  const googleClientId = settings.google_client_id?.trim() || envClientId;
  res.json({
    googleOAuthEnabled: settings.google_oauth_enabled === "true",
    googleClientId,
  });
});

router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

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

  if (!user) {
    const newReferralCode = generateReferralCode();
    const [created] = await db.insert(usersTable).values({
      email: googleEmail,
      passwordHash: await bcrypt.hash(randomBytes(16).toString("hex"), 10),
      fullName: googleName,
      avatarUrl,
      referralCode: newReferralCode,
    }).returning();
    user = created;
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

  const tokens = await issueTokens(user);
  res.json({ user: mapUser(user), ...tokens });
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
  await db.update(usersTable).set({ passwordHash, updatedAt: new Date() }).where(eq(usersTable.id, userId));
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
  res.json(mapUser(user));
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
  const profile = await getUserProfile(userId);
  res.json(profile);
});

export default router;
