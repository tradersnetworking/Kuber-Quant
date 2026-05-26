import { createHash, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { db, emailOtpsTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { sendTransactionalEmail } from "./mailer";

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateOtp(): string {
  return String(randomInt(100000, 999999));
}

export async function createEmailOtp(opts: {
  email: string;
  userId?: number;
  purpose: "password_reset" | "email_verify" | "login" | "registration" | "mobile_verify";
  ttlMinutes?: number;
}): Promise<{ otp: string; expiresAt: Date }> {
  const otp = generateOtp();
  const codeHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + (opts.ttlMinutes || 15) * 60 * 1000);

  await db.insert(emailOtpsTable).values({
    email: opts.email.toLowerCase(),
    userId: opts.userId || null,
    codeHash,
    purpose: opts.purpose,
    expiresAt,
  });

  return { otp, expiresAt };
}

export async function verifyEmailOtp(opts: {
  email: string;
  otp: string;
  purpose: "password_reset" | "email_verify" | "login" | "registration" | "mobile_verify";
}): Promise<boolean> {
  const now = new Date();
  const rows = await db.select().from(emailOtpsTable)
    .where(and(
      eq(emailOtpsTable.email, opts.email.toLowerCase()),
      eq(emailOtpsTable.purpose, opts.purpose),
      isNull(emailOtpsTable.usedAt),
      gt(emailOtpsTable.expiresAt, now),
    ))
    .orderBy(emailOtpsTable.createdAt);

  for (const row of rows.reverse()) {
    const valid = await bcrypt.compare(opts.otp, row.codeHash);
    if (valid) {
      await db.update(emailOtpsTable).set({ usedAt: now }).where(eq(emailOtpsTable.id, row.id));
      return true;
    }
  }
  return false;
}

export async function createRefreshToken(userId: number, rawToken: string, days = 30) {
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.insert(refreshTokensTable).values({ userId, tokenHash, expiresAt });
  return expiresAt;
}

export async function revokeRefreshToken(rawToken: string) {
  const tokenHash = hashToken(rawToken);
  await db.update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.tokenHash, tokenHash));
}

export async function validateRefreshToken(rawToken: string): Promise<number | null> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const [row] = await db.select().from(refreshTokensTable)
    .where(and(
      eq(refreshTokensTable.tokenHash, tokenHash),
      isNull(refreshTokensTable.revokedAt),
      gt(refreshTokensTable.expiresAt, now),
    ))
    .limit(1);
  return row?.userId ?? null;
}

export function buildOtpEmail(opts: { name: string; otp: string; purpose: string }): string {
  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:40px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:32px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 16px">Kuber Quant</h2>
    <p>Hi ${opts.name},</p>
    <p>Your verification code for ${opts.purpose}:</p>
    <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#D4AF37;margin:24px 0">${opts.otp}</div>
    <p style="color:rgba(255,255,255,0.5);font-size:13px">This code expires in 15 minutes. Do not share it with anyone.</p>
  </div>
</body></html>`;
}

export async function sendOtpEmail(opts: { to: string; name: string; otp: string; purpose: string }) {
  const sent = await sendTransactionalEmail({
    to: opts.to,
    purpose: "otp",
    subject: `Kuber Quant — ${opts.purpose} code`,
    html: buildOtpEmail(opts),
    text: `Your Kuber Quant verification code: ${opts.otp}`,
  });
  return sent;
}

export function buildDepositEmail(opts: { name: string; amount: number; currency: string; status: string }): string {
  return `<p>Hi ${opts.name}, your deposit of ${opts.amount} ${opts.currency} is now <strong>${opts.status}</strong>.</p>`;
}

export function buildWithdrawalEmail(opts: { name: string; amount: number; currency: string; status: string }): string {
  return `<p>Hi ${opts.name}, your withdrawal of ${opts.amount} ${opts.currency} is <strong>${opts.status}</strong>.</p>`;
}
