/** Normalize relative upload paths to absolute URLs for API responses. */
export function resolvePublicAssetUrl(storedUrl: string | null | undefined): string | null {
  if (!storedUrl?.trim()) return null;
  const u = storedUrl.trim();
  if (/^(https?:|data:|blob:)/i.test(u)) return u;

  const base = (
    process.env.PUBLIC_APP_URL
    || process.env.APP_ORIGIN
    || process.env.FRONTEND_URL
    || ""
  ).replace(/\/+$/, "");

  if (!base) return u.startsWith("/") ? u : `/${u}`;
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}
