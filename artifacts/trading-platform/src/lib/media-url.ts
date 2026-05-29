/** Resolve stored public asset paths for use in img src (profile photos, branding, QR codes). */
export function resolveMediaUrl(src?: string | null): string | undefined {
  if (!src?.trim()) return undefined;
  const s = src.trim();

  if (/^(https?:|data:|blob:)/i.test(s)) return s;

  // Secure KYC/payment uploads require authenticated fetch — not valid as img src.
  if (s.includes("uploads-secure")) return undefined;

  const basePath = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  let path = s.startsWith("/") ? s : `/${s}`;

  if (basePath && basePath !== "/" && path.startsWith(`${basePath}/`)) {
    path = path.slice(basePath.length);
  }

  const fullPath = basePath === "/" ? path : `${basePath}${path}`;

  if (typeof window !== "undefined") {
    return `${window.location.origin}${fullPath}`;
  }

  return fullPath;
}

/** Profile avatars always come from users.avatarUrl — never KYC secure paths. */
export function resolveAvatarUrl(avatarUrl?: string | null): string | undefined {
  return resolveMediaUrl(avatarUrl);
}
