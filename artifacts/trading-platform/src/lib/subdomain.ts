/**
 * Detects which staff subdomain the app is running on.
 * Works for:
 *   - admin.kuberquant.com  → super-admin portal (legacy subdomain)
 *   - manager.kuberquant.com → "manager"
 *   - support.kuberquant.com → "support"
 *   - kuberquant.com / localhost / *.replit.dev → null (main app)
 *
 * Note: In Replit preview, no subdomain is detected — all portals are accessible
 * via /staff-login and role-based redirects. Subdomain logic activates on
 * production custom domains.
 */
import { getPostLoginPath } from "@/lib/nav-config";

export type StaffPortal = "admin" | "manager" | "support" | null;

const STAFF_SUBDOMAINS: StaffPortal[] = ["admin", "manager", "support"];

export function getStaffPortal(): StaffPortal {
  try {
    const hostname = window.location.hostname;
    const parts = hostname.split(".");
    // Need at least sub.domain.tld → 3 parts
    if (parts.length >= 3) {
      const sub = parts[0].toLowerCase() as StaffPortal;
      if (STAFF_SUBDOMAINS.includes(sub)) {
        return sub;
      }
    }
  } catch {}
  return null;
}

export function isStaffPortal(): boolean {
  return getStaffPortal() !== null;
}

/** Expected staff subdomain for a role (null = main app / investor). */
export function getStaffPortalForRole(role: string): StaffPortal | null {
  if (role === "superadmin" || role === "admin") return "admin";
  if (role === "manager") return "manager";
  if (role === "support") return "support";
  return null;
}

/**
 * When a user is on the wrong staff subdomain, return full URL for their home portal.
 * Returns null on main domain / localhost (path-based routing handles access there).
 */
export function getCrossPortalRedirectTarget(role: string): string | null {
  const current = getStaffPortal();
  const expected = getStaffPortalForRole(role);
  if (!current || !expected || current === expected) return null;

  try {
    const { protocol, hostname, port } = window.location;
    const parts = hostname.split(".");
    if (parts.length < 3) return null;

    const baseDomain = parts.slice(1).join(".");
    const portSuffix = port && !["80", "443", ""].includes(port) ? `:${port}` : "";
    return `${protocol}//${expected}.${baseDomain}${portSuffix}${getPostLoginPath(role)}`;
  } catch {
    return null;
  }
}

