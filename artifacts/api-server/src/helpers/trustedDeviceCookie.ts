import type { Response } from "express";
import { trustedDeviceCookieName, TRUSTED_DEVICE_DAYS } from "./backupCodesUtil";

export function setTrustedDeviceCookie(res: Response, token: string, expiresAt: Date): void {
  const secure = process.env.NODE_ENV === "production" || process.env.COOKIE_SECURE === "true";
  res.cookie(trustedDeviceCookieName(), token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearTrustedDeviceCookie(res: Response): void {
  res.clearCookie(trustedDeviceCookieName(), { path: "/" });
}
