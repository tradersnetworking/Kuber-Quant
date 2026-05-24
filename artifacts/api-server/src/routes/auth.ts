import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "kubercapital-secret-key";

function generateReferralCode(): string {
  return "KQ" + randomBytes(3).toString("hex").toUpperCase();
}

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
    twoFactorEnabled: user.twoFactorEnabled || false,
    createdAt: user.createdAt.toISOString(),
  };
}

router.post("/register", async (req, res) => {
  const { email, password, fullName, referralCode, phone } = req.body;
  if (!email || !password || !fullName) {
    res.status(400).json({ error: "email, password, fullName are required" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  let referredBy: number | undefined;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (referrer) {
      referredBy = referrer.id;
      await db.update(usersTable)
        .set({ referralCount: (referrer.referralCount || 0) + 1 })
        .where(eq(usersTable.id, referrer.id));
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newReferralCode = generateReferralCode();
  const [user] = await db.insert(usersTable).values({
    email,
    passwordHash,
    fullName,
    phone: phone || null,
    referralCode: newReferralCode,
    referredBy: referredBy || null,
  }).returning();

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({ user: mapUser(user), token });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
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
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  // If 2FA is enabled, return temp token instead of full token
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const tempToken = jwt.sign({ userId: user.id }, JWT_SECRET + "-2fa-temp", { expiresIn: "5m" });
    res.json({ requiresTwoFactor: true, tempToken });
    return;
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ user: mapUser(user), token });
});

router.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
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

  const token = signToken({ userId: user.id, role: user.role });
  res.json({ user: mapUser(user), token });
});

router.post("/logout", (_req, res) => {
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

export default router;
