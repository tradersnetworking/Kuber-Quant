import { generateSecret, generateURI, verifySync } from "otplib";

const APP_NAME = "Kuber Quant";

export function createTotpSecret(): string {
  return generateSecret();
}

export function totpAuthUri(email: string, secret: string): string {
  return generateURI({ issuer: APP_NAME, label: email, secret });
}

export function verifyTotpCode(secret: string, code: string): boolean {
  try {
    const result = verifySync({ token: String(code), secret }) as boolean | { valid?: boolean };
    if (typeof result === "boolean") return result;
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}
