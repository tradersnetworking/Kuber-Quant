import { db, usersTable, loginHistoryTable, refreshTokensTable } from "@workspace/db";
import { eq, and, isNull, gt, desc } from "@workspace/db/orm";
import { sendMail } from "./mailer";
import { clientIp, parseUserAgent } from "./trustedDeviceService";
import { emitSiemEvent } from "./siemExportService";
import { scoreLoginAnomaly } from "./fraudAnomalyService";

function deviceFingerprint(req: any): string | undefined {
  const raw = req.headers["x-device-fingerprint"];
  if (typeof raw === "string" && raw.trim()) return raw.trim().slice(0, 128);
  return undefined;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

export async function isAccountLocked(user: typeof usersTable.$inferSelect): Promise<boolean> {
  if ((user.failedLoginAttempts ?? 0) < MAX_FAILED_ATTEMPTS) return false;
  const elapsed = Date.now() - new Date(user.updatedAt).getTime();
  return elapsed < LOCKOUT_MINUTES * 60 * 1000;
}

export async function recordFailedLogin(userId: number, req: any, reason: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  const attempts = (user.failedLoginAttempts ?? 0) + 1;
  await db.update(usersTable)
    .set({ failedLoginAttempts: attempts, updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  await trackLogin(userId, req, false, reason);
}

export async function recordSuccessfulLogin(userId: number, req: any) {
  const ua = req.headers["user-agent"] || "";
  const ip = clientIp(req);
  const { device, label } = parseUserAgent(ua);
  await db.update(usersTable)
    .set({
      failedLoginAttempts: 0,
      lastLoginIp: ip,
      lastLoginDevice: label || device,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));
  await trackLogin(userId, req, true);
  void scoreLoginAnomaly(userId, req);
}

export async function trackLogin(userId: number, req: any, success: boolean, failReason?: string) {
  try {
    const ua = req.headers["user-agent"] || "";
    const ip = clientIp(req);
    const fingerprint = deviceFingerprint(req);
    const { browser, device } = parseUserAgent(ua);
    await db.insert(loginHistoryTable).values({
      userId,
      ipAddress: ip,
      userAgent: ua.slice(0, 512),
      browser,
      device: fingerprint ? `fp:${fingerprint}` : device,
      success,
      failReason: failReason || null,
    });

    emitSiemEvent({
      category: "auth",
      action: success ? "login.success" : "login.failed",
      severity: success ? "info" : "warning",
      userId,
      ipAddress: ip,
      metadata: {
        browser,
        device: fingerprint ? "fingerprint" : device,
        failReason: failReason || undefined,
      },
    });
  } catch { /* non-fatal */ }
}

export async function maybeSendLoginAlert(opts: {
  user: typeof usersTable.$inferSelect;
  req: any;
  isNewDevice: boolean;
}) {
  if (opts.user.loginAlertsEnabled === false) return;
  if (!opts.isNewDevice) return;

  const ip = clientIp(opts.req);
  const ua = opts.req.headers["user-agent"] || "";
  const { label } = parseUserAgent(ua);
  const when = new Date().toUTCString();

  await sendMail({
    to: opts.user.email,
    subject: "Kuber Quant — New sign-in to your account",
    html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:40px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:32px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 16px">New sign-in detected</h2>
    <p>Hi ${opts.user.fullName},</p>
    <p>Your Kuber Quant account was just signed in from a new device or location:</p>
    <ul style="color:rgba(255,255,255,0.8);line-height:1.8">
      <li><strong>Device:</strong> ${label}</li>
      <li><strong>IP:</strong> ${ip}</li>
      <li><strong>Time:</strong> ${when}</li>
    </ul>
    <p style="color:rgba(255,255,255,0.5);font-size:13px">If this wasn't you, change your password immediately and contact support.</p>
  </div>
</body></html>`,
    text: `New sign-in to Kuber Quant: ${label}, IP ${ip}, ${when}`,
  });
}

export async function isNewLoginDevice(userId: number, req: any): Promise<boolean> {
  const ip = clientIp(req);
  const ua = req.headers["user-agent"] || "";
  const { label } = parseUserAgent(ua);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return true;

  if (user.lastLoginIp && user.lastLoginIp !== ip) return true;
  if (user.lastLoginDevice && user.lastLoginDevice !== label) return true;

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const recent = await db.select().from(loginHistoryTable)
    .where(and(
      eq(loginHistoryTable.userId, userId),
      eq(loginHistoryTable.success, true),
      gt(loginHistoryTable.createdAt, since),
    ))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(10);

  if (recent.length === 0) return true;
  const knownIps = new Set(recent.map(r => r.ipAddress).filter(Boolean));
  return knownIps.size > 0 && !knownIps.has(ip);
}

export async function listActiveSessions(userId: number) {
  const now = new Date();
  const rows = await db.select().from(refreshTokensTable)
    .where(and(
      eq(refreshTokensTable.userId, userId),
      isNull(refreshTokensTable.revokedAt),
      gt(refreshTokensTable.expiresAt, now),
    ))
    .orderBy(desc(refreshTokensTable.createdAt));

  return rows.map(r => ({
    id: r.id,
    deviceLabel: r.deviceLabel || "Unknown device",
    ipAddress: r.ipAddress,
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
  }));
}

export async function revokeSession(userId: number, sessionId: number): Promise<boolean> {
  const [row] = await db.select().from(refreshTokensTable)
    .where(and(eq(refreshTokensTable.id, sessionId), eq(refreshTokensTable.userId, userId)))
    .limit(1);
  if (!row || row.revokedAt) return false;
  await db.update(refreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokensTable.id, sessionId));
  return true;
}
