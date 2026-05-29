/** Backend permission keys — mirrors api-server roleHierarchy PERMISSION_KEYS */
export type PermissionKey =
  | "manage_users"
  | "approve_withdrawals"
  | "manage_brokers"
  | "edit_investments"
  | "manage_promoters"
  | "compile_ea"
  | "manage_licenses"
  | "access_reports"
  | "manage_tickets"
  | "view_analytics"
  | "manage_payments"
  | "manage_security"
  | "manage_credentials";

/** Super-admin nav href → required permission (admin role only). */
export const STAFF_NAV_PERMISSIONS: Partial<Record<string, PermissionKey>> = {
  "/super-admin/users": "manage_users",
  "/super-admin/kyc": "manage_users",
  "/super-admin/transactions": "approve_withdrawals",
  "/super-admin/wallet": "approve_withdrawals",
  "/super-admin/payment-gateways": "manage_payments",
  "/super-admin/investments": "edit_investments",
  "/super-admin/investment-plans": "edit_investments",
  "/super-admin/support": "manage_tickets",
  "/super-admin/referrals": "manage_promoters",
  "/super-admin/audit-logs": "access_reports",
  "/super-admin/backup": "manage_security",
  "/super-admin/site-config": "manage_security",
  "/super-admin/settings": "manage_credentials",
};

export function filterNavByStaffPermissions<T extends { href: string }>(
  role: string,
  permissions: PermissionKey[],
  items: T[],
): T[] {
  if (role !== "admin") return items;
  const set = new Set(permissions);
  return items.filter(item => {
    const required = STAFF_NAV_PERMISSIONS[item.href];
    return !required || set.has(required);
  });
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  manage_users: "Manage Users",
  approve_withdrawals: "Approve Withdrawals",
  manage_brokers: "Manage Brokers",
  edit_investments: "Edit Investments",
  manage_promoters: "Manage Promoters",
  compile_ea: "Compile EA",
  manage_licenses: "Manage Licenses",
  access_reports: "Access Reports",
  manage_tickets: "Manage Tickets",
  view_analytics: "View Analytics",
  manage_payments: "Manage Payments",
  manage_security: "Manage Security",
  manage_credentials: "Manage Credentials",
};
