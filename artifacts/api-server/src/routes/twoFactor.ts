import { Router } from "express";
import { createHmac, randomBytes } from "crypto";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, signToken } from "../middlewares/auth";
import jwt from "jsonwebtoken";

const router = Router();
const JWT_SECRET = process.env.SESSION_SECRET || "kubercapital-secret-key";
const APP_NAME = "Kuber Quant";

// Base32 encoding/decoding for TOTP secrets
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31];
  return output;
}

function base32Decode(str: string): Buffer {
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  const upper = str.toUpperCase().replace(/=+$/, "");
  for (const char of upper) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: string, counter: bigint): string {
  const key = base32Decode(secret);
  const msg = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    msg[i] = Number(c & 0xffn);
    c >>= 8n;
  }
  const hmac = createHmac("sha1", key).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function totp(secret: string): string {
  const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
  return hotp(secret, counter);
}

function verifyTotp(secret: string, code: string): boolean {
  const counter = BigInt(Math.floor(Date.now() / 1000 / 30));
  // Allow 1 window drift (30s before/after)
  for (let delta = -1n; delta <= 1n; delta++) {
    if (hotp(secret, counter + delta) === String(code)) return true;
  }
  return false;
}

function otpauthUri(email: string, secret: string): string {
  const label = encodeURIComponent(`${APP_NAME}:${email}`);
  const issuer = encodeURIComponent(APP_NAME);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

// Generate setup: create a temp secret + return QR code URI
router.post("/setup", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const secret = generateSecret();
  const qrUri = otpauthUri(user.email, secret);

  await db.update(usersTable).set({ twoFactorTempSecret: secret }).where(eq(usersTable.id, userId));

  res.json({ secret, otpauthUri: qrUri });
});

// Verify TOTP code and enable 2FA
router.post("/enable", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "TOTP code required" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.twoFactorTempSecret) {
    res.status(400).json({ error: "No pending 2FA setup found. Start setup first." }); return;
  }

  const isValid = verifyTotp(user.twoFactorTempSecret, String(code));
  if (!isValid) { res.status(400).json({ error: "Invalid TOTP code. Check your authenticator app." }); return; }

  await db.update(usersTable).set({
    twoFactorEnabled: true,
    twoFactorSecret: user.twoFactorTempSecret,
    twoFactorTempSecret: null,
  }).where(eq(usersTable.id, userId));

  res.json({ message: "Two-factor authentication enabled successfully" });
});

// Disable 2FA (requires current TOTP code)
router.post("/disable", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { code } = req.body;
  if (!code) { res.status(400).json({ error: "TOTP code required to disable 2FA" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ error: "2FA is not enabled" }); return;
  }

  const isValid = verifyTotp(user.twoFactorSecret, String(code));
  if (!isValid) { res.status(400).json({ error: "Invalid TOTP code" }); return; }

  await db.update(usersTable).set({
    twoFactorEnabled: false,
    twoFactorSecret: null,
    twoFactorTempSecret: null,
  }).where(eq(usersTable.id, userId));

  res.json({ message: "Two-factor authentication disabled" });
});

// Second step login: verify TOTP code with temp token
router.post("/verify-login", async (req, res) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) { res.status(400).json({ error: "tempToken and code are required" }); return; }

  let payload: any;
  try {
    payload = jwt.verify(tempToken, JWT_SECRET + "-2fa-temp") as any;
  } catch {
    res.status(401).json({ error: "Invalid or expired session. Please login again." }); return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ error: "2FA not configured for this account" }); return;
  }

  const isValid = verifyTotp(user.twoFactorSecret, String(code));
  if (!isValid) { res.status(400).json({ error: "Invalid authenticator code" }); return; }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    user: {
      id: user.id, email: user.email, fullName: user.fullName, phone: user.phone || null,
      role: user.role, kycStatus: user.kycStatus,
      balanceFiat: Number(user.balanceFiat), balanceCrypto: Number(user.balanceCrypto),
      totalProfit: Number(user.totalProfit), referralCode: user.referralCode || null,
      referralCount: user.referralCount || 0, referralEarnings: Number(user.referralEarnings || 0),
      avatarUrl: user.avatarUrl || null, managerId: user.managerId || null,
      isActive: user.isActive, twoFactorEnabled: user.twoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
    },
    token,
  });
});

export default router;
