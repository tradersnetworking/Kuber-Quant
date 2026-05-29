import { createHash } from "crypto";
import { db, trustedDevicesTable } from "@workspace/db";
import { and, eq, gt, isNull } from "@workspace/db/orm";
import { generateDeviceToken, TRUSTED_DEVICE_DAYS } from "./backupCodesUtil";

export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function parseUserAgent(ua: string): { browser: string; device: string; label: string } {
  const browser = ua.includes("Chrome") ? "Chrome"
    : ua.includes("Firefox") ? "Firefox"
      : ua.includes("Safari") ? "Safari"
        : ua.includes("Edge") ? "Edge"
          : "Browser";
  const device = ua.includes("Mobile") || ua.includes("Android") || ua.includes("iPhone") ? "Mobile" : "Desktop";
  return { browser, device, label: `${browser} on ${device}` };
}

export function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket?.remoteAddress
    || "unknown";
}

export async function createTrustedDevice(opts: {
  userId: number;
  req: any;
}): Promise<{ token: string; expiresAt: Date }> {
  const ua = opts.req.headers["user-agent"] || "";
  const { browser, device, label } = parseUserAgent(ua);
  const ip = clientIp(opts.req);
  const token = generateDeviceToken();
  const expiresAt = new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(trustedDevicesTable).values({
    userId: opts.userId,
    tokenHash: hashDeviceToken(token),
    deviceLabel: label,
    browser,
    ipAddress: ip,
    userAgent: ua.slice(0, 512),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function validateTrustedDevice(userId: number, rawToken: string | undefined): Promise<boolean> {
  if (!rawToken) return false;
  const now = new Date();
  const [row] = await db.select().from(trustedDevicesTable)
    .where(and(
      eq(trustedDevicesTable.userId, userId),
      eq(trustedDevicesTable.tokenHash, hashDeviceToken(rawToken)),
      isNull(trustedDevicesTable.revokedAt),
      gt(trustedDevicesTable.expiresAt, now),
    ))
    .limit(1);
  if (!row) return false;
  await db.update(trustedDevicesTable)
    .set({ lastUsedAt: now })
    .where(eq(trustedDevicesTable.id, row.id));
  return true;
}

export async function listTrustedDevices(userId: number) {
  const rows = await db.select().from(trustedDevicesTable)
    .where(and(eq(trustedDevicesTable.userId, userId), isNull(trustedDevicesTable.revokedAt)))
    .orderBy(trustedDevicesTable.lastUsedAt);
  const now = Date.now();
  return rows
    .filter(r => new Date(r.expiresAt).getTime() > now)
    .map(r => ({
      id: r.id,
      deviceLabel: r.deviceLabel,
      browser: r.browser,
      ipAddress: r.ipAddress,
      lastUsedAt: r.lastUsedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    }));
}

export async function revokeTrustedDevice(userId: number, deviceId: number): Promise<boolean> {
  const [row] = await db.select().from(trustedDevicesTable)
    .where(and(eq(trustedDevicesTable.id, deviceId), eq(trustedDevicesTable.userId, userId)))
    .limit(1);
  if (!row) return false;
  await db.update(trustedDevicesTable)
    .set({ revokedAt: new Date() })
    .where(eq(trustedDevicesTable.id, deviceId));
  return true;
}

export async function revokeAllTrustedDevices(userId: number) {
  await db.update(trustedDevicesTable)
    .set({ revokedAt: new Date() })
    .where(and(eq(trustedDevicesTable.userId, userId), isNull(trustedDevicesTable.revokedAt)));
}
