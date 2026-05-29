import fs from "fs";
import path from "path";
import { getUploadRoot } from "../middlewares/upload";

/** Turn stored upload path into absolute URL for HTML/email previews. */
export function resolveAgreementAssetUrl(
  storedUrl: string | null | undefined,
  baseOrigin?: string,
): string {
  if (!storedUrl?.trim()) return "—";
  const u = storedUrl.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  const base =
    baseOrigin
    || process.env.PUBLIC_APP_URL
    || process.env.APP_ORIGIN
    || process.env.FRONTEND_URL
    || "";
  if (base) {
    return `${base.replace(/\/$/, "")}${u.startsWith("/") ? u : `/${u}`}`;
  }
  return u;
}

/** Resolve local filesystem path for an uploaded asset (disk or hybrid storage). */
export function resolveLocalUploadPath(storedUrl: string | null | undefined): string | null {
  if (!storedUrl?.trim()) return null;
  const u = storedUrl.trim();

  const secure = u.match(/^\/api\/uploads-secure\/([^/]+)\/(.+)$/);
  if (secure) {
    return path.join(getUploadRoot(), secure[1], decodeURIComponent(secure[2]));
  }

  const pub = u.match(/^\/uploads\/([^/]+)\/(.+)$/);
  if (pub) {
    return path.join(getUploadRoot(), pub[1], decodeURIComponent(pub[2]));
  }

  try {
    if (fs.existsSync(u)) return u;
  } catch { /* ignore */ }

  return null;
}

export function loadUploadImageBuffer(storedUrl: string | null | undefined): Buffer | null {
  const local = resolveLocalUploadPath(storedUrl);
  if (!local) return null;
  try {
    if (!fs.existsSync(local)) return null;
    return fs.readFileSync(local);
  } catch {
    return null;
  }
}

export function documentOnFileLabel(url: string | null | undefined): string {
  return url?.trim() ? "On file" : "Not provided";
}
