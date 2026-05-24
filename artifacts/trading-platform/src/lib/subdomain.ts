/**
 * Detects which staff subdomain the app is running on.
 * Works for:
 *   - admin.kuberquant.com  → "admin"
 *   - manager.kuberquant.com → "manager"
 *   - support.kuberquant.com → "support"
 *   - kuberquant.com / localhost / *.replit.dev → null (main app)
 *
 * Note: In Replit preview, no subdomain is detected — all portals are accessible
 * via /staff-login and role-based redirects. Subdomain logic activates on
 * production custom domains.
 */
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
