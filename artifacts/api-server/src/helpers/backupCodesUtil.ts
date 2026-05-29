import { randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";

const BACKUP_CODE_COUNT = 10;

export function generateBackupCodes(count = BACKUP_CODE_COUNT): string[] {
  return Array.from({ length: count }, () => {
    const part = randomBytes(4).toString("hex").toUpperCase();
    return `${part.slice(0, 4)}-${part.slice(4, 8)}`;
  });
}

export async function hashBackupCodes(codes: string[]): Promise<string> {
  const hashed = await Promise.all(codes.map(c => bcrypt.hash(c.replace(/-/g, ""), 10)));
  return JSON.stringify(hashed);
}

export async function verifyBackupCode(rawCode: string, storedJson: string | null): Promise<boolean> {
  if (!storedJson) return false;
  let hashes: string[];
  try {
    hashes = JSON.parse(storedJson);
    if (!Array.isArray(hashes)) return false;
  } catch {
    return false;
  }
  const normalized = rawCode.replace(/[\s-]/g, "").toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    if (!hash) continue;
    const match = await bcrypt.compare(normalized, hash);
    if (match) {
      hashes.splice(i, 1);
      return true;
    }
  }
  return false;
}

export async function consumeBackupCode(rawCode: string, storedJson: string | null): Promise<string | null> {
  if (!storedJson) return null;
  let hashes: string[];
  try {
    hashes = JSON.parse(storedJson);
    if (!Array.isArray(hashes)) return null;
  } catch {
    return null;
  }
  const normalized = rawCode.replace(/[\s-]/g, "").toUpperCase();
  for (let i = 0; i < hashes.length; i++) {
    const hash = hashes[i];
    if (!hash) continue;
    const match = await bcrypt.compare(normalized, hash);
    if (match) {
      hashes.splice(i, 1);
      return JSON.stringify(hashes);
    }
  }
  return null;
}

/** Normalize backup code input for display validation. */
export function normalizeBackupCodeInput(code: string): string {
  return code.replace(/[\s-]/g, "").toUpperCase();
}

export function isLikelyBackupCode(code: string): boolean {
  const n = normalizeBackupCodeInput(code);
  return n.length >= 8 && !/^\d{6}$/.test(n);
}

export function generateDeviceToken(): string {
  return randomBytes(32).toString("hex");
}

export function trustedDeviceCookieName(): string {
  return "kuber_trusted_device";
}

export const TRUSTED_DEVICE_DAYS = 30;
