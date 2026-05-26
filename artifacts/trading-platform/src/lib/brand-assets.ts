/** Bundled Kuber Quant brand assets served from /public. */
export const DEFAULT_BRAND_LOGO_URL = "/kuber-quant-logo.png";
export const DEFAULT_FAVICON_URL = "/favicon.png";

export function resolveBrandLogoUrl(logoUrl?: string | null): string {
  const trimmed = logoUrl?.trim();
  return trimmed || DEFAULT_BRAND_LOGO_URL;
}

export function resolveFaviconUrl(faviconUrl?: string | null): string {
  const trimmed = faviconUrl?.trim();
  return trimmed || DEFAULT_FAVICON_URL;
}
