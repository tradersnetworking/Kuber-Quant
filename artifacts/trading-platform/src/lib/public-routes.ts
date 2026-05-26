/** Paths that render without the dashboard shell (no sidebar). */
const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/staff-login",
  "/forgot-password",
  "/register",
  "/register/manager",
  "/privacy-policy",
  "/terms-of-service",
  "/risk-disclosure",
  "/cookie-policy",
]);

function normalizePath(location: string): string {
  let path = location.split("?")[0].split("#")[0] || "/";
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
}

export function isPublicPath(location: string): boolean {
  return PUBLIC_EXACT.has(normalizePath(location));
}

/** Staff subdomain root — login gate only, no dashboard shell. */
export function isStaffPortalEntry(location: string): boolean {
  return normalizePath(location) === "/";
}

export function isStaffPortalPublic(location: string): boolean {
  const path = normalizePath(location);
  return path === "/login" || path === "/staff-login" || path === "/";
}
