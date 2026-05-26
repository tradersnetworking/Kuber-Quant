/** Role hierarchy: superadmin > admin > support > manager > user */
export const ROLE_RANK: Record<string, number> = {
  user: 1,
  manager: 2,
  support: 3,
  admin: 4,
  superadmin: 5,
};

export const PERMISSION_KEYS = [
  "manage_users", "approve_withdrawals", "manage_brokers", "edit_investments",
  "manage_promoters", "compile_ea", "manage_licenses", "access_reports",
  "manage_tickets", "view_analytics", "manage_payments", "manage_security",
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

/** Default permissions per role (static RBAC map; DB tables for dynamic overrides) */
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  superadmin: [...PERMISSION_KEYS],
  admin: [
    "manage_users", "approve_withdrawals", "edit_investments", "manage_promoters",
    "access_reports", "manage_tickets", "view_analytics", "manage_payments",
  ],
  support: ["manage_tickets", "view_analytics"],
  manager: ["view_analytics", "manage_tickets"],
  user: [],
};

export function hasPermission(role: string, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getRoleRank(role: string): number {
  return ROLE_RANK[role] ?? 0;
}

export function canViewRole(viewerRole: string, targetRole: string): boolean {
  return getRoleRank(targetRole) <= getRoleRank(viewerRole);
}

export function filterUsersByViewerRole<T extends { role: string }>(
  viewerRole: string,
  users: T[],
): T[] {
  return users.filter((user) => canViewRole(viewerRole, user.role));
}

export function assignableRoles(viewerRole: string): string[] {
  const viewerRank = getRoleRank(viewerRole);
  return Object.entries(ROLE_RANK)
    .filter(([, rank]) => rank <= viewerRank)
    .sort(([, a], [, b]) => b - a)
    .map(([role]) => role);
}
