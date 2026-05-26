import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";
import { getEncryptionKey } from "../lib/env";

const ALGO = "aes-256-gcm";
const KEY = scryptSync(getEncryptionKey(), "kq-salt", 32);

export function encryptSensitive(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptSensitive(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(":");
  if (!ivHex || !tagHex || !dataHex) throw new Error("Invalid encrypted payload");
  const decipher = createDecipheriv(ALGO, KEY, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

export function generateInvestorId(userId: number): string {
  const year = new Date().getFullYear();
  return `KQ-INV-${year}-${String(userId).padStart(6, "0")}`;
}
