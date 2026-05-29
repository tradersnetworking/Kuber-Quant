/**
 * Frontend permission policy — mirrors backend credentialPolicy + roleHierarchy.
 */

export type AppRole = "user" | "manager" | "support" | "admin" | "superadmin" | "promoter";

export type PermissionAction =
  | "portal.superadmin"
  | "portal.manager"
  | "portal.support"
  | "portal.investor"
  | "finance.deposit"
  | "finance.withdraw"
  | "finance.approve"
  | "investment.view"
  | "investment.manage"
  | "kyc.submit"
  | "kyc.approve"
  | "support.ticket.create"
  | "support.ticket.manage"
  | "support.user.lookup"
  | "users.manage"
  | "settings.site"
  | "settings.credentials"
  | "exchange.trade"
  | "exchange.manage"
  | "referral.view"
  | "referral.manage"
  | "notifications.manage"
  | "backup.export";

const ROLE_PERMISSIONS: Record<string, Set<PermissionAction>> = {
  user: new Set([
    "portal.investor", "finance.deposit", "finance.withdraw", "investment.view",
    "kyc.submit", "support.ticket.create", "exchange.trade", "referral.view",
  ]),
  promoter: new Set([
    "portal.investor", "finance.deposit", "finance.withdraw", "investment.view",
    "kyc.submit", "support.ticket.create", "exchange.trade", "referral.view",
  ]),
  manager: new Set([
    "portal.manager", "portal.investor", "finance.deposit", "finance.withdraw",
    "investment.view", "kyc.approve", "support.ticket.manage", "exchange.trade", "referral.view",
  ]),
  support: new Set([
    "portal.support", "support.ticket.manage", "support.user.lookup",
    "investment.view", "exchange.trade",
  ]),
  admin: new Set([
    "portal.superadmin", "portal.investor", "finance.deposit", "finance.withdraw",
    "finance.approve", "investment.view", "investment.manage", "kyc.approve",
    "support.ticket.manage", "support.user.lookup", "users.manage",
    "exchange.trade", "exchange.manage", "referral.view", "referral.manage",
    "notifications.manage",
  ]),
  superadmin: new Set([
    "portal.superadmin", "portal.investor", "finance.deposit", "finance.withdraw",
    "finance.approve", "investment.view", "investment.manage", "kyc.approve",
    "support.ticket.manage", "support.user.lookup", "users.manage", "settings.site",
    "settings.credentials", "exchange.trade", "exchange.manage", "referral.view",
    "referral.manage", "notifications.manage", "backup.export",
  ]),
};

export function isPlatformAdminRole(role: string): boolean {
  return role === "superadmin" || role === "admin";
}

export function isSuperAdminRole(role: string): boolean {
  return role === "superadmin";
}

export function can(role: string, action: PermissionAction, opts?: { isPromoter?: boolean }): boolean {
  if (opts?.isPromoter && ROLE_PERMISSIONS.promoter?.has(action)) return true;
  const set = ROLE_PERMISSIONS[role];
  return set?.has(action) ?? false;
}

export function permissionsForRole(role: string, opts?: { isPromoter?: boolean }): PermissionAction[] {
  const base = ROLE_PERMISSIONS[role] ?? new Set<PermissionAction>();
  const merged = new Set(base);
  if (opts?.isPromoter) {
    for (const p of ROLE_PERMISSIONS.promoter ?? []) merged.add(p);
  }
  return [...merged];
}

/** Super-admin nav hrefs hidden from Platform Admin (read-only / credential areas). */
export const ADMIN_RESTRICTED_HREFS = new Set([
  "/super-admin/backup",
  "/super-admin/site-config",
  "/super-admin/api",
  "/super-admin/settings",
  "/super-admin/payment-gateways",
  "/super-admin/communication",
]);

export function filterPlatformNavForRole<T extends { href: string }>(role: string, items: T[]): T[] {
  if (role !== "admin") return items;
  return items.filter(item => !ADMIN_RESTRICTED_HREFS.has(item.href));
}
