import { db, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import {
  PERMISSION_KEYS,
  ROLE_PERMISSIONS,
  type PermissionKey,
} from "./roleHierarchy";
import { getCachedJson, invalidateRedisCacheByPrefix } from "./redisCache";
import { logger } from "../lib/logger";

const CACHE_PREFIX = "rbac:role:";
const CACHE_TTL = 300;

const PERMISSION_LABELS: Record<PermissionKey, { name: string; category: string }> = {
  manage_users: { name: "Manage Users", category: "users" },
  approve_withdrawals: { name: "Approve Withdrawals", category: "finance" },
  manage_brokers: { name: "Manage Brokers", category: "trading" },
  edit_investments: { name: "Edit Investments", category: "investments" },
  manage_promoters: { name: "Manage Promoters", category: "marketing" },
  compile_ea: { name: "Compile EA", category: "trading" },
  manage_licenses: { name: "Manage Licenses", category: "trading" },
  access_reports: { name: "Access Reports", category: "analytics" },
  manage_tickets: { name: "Manage Tickets", category: "support" },
  view_analytics: { name: "View Analytics", category: "analytics" },
  manage_payments: { name: "Manage Payments", category: "finance" },
  manage_security: { name: "Manage Security", category: "security" },
  manage_credentials: { name: "Manage Credentials", category: "security" },
};

export async function ensureRbacSeed(): Promise<void> {
  try {
    for (const key of PERMISSION_KEYS) {
      const meta = PERMISSION_LABELS[key];
      await db.insert(permissionsTable).values({
        key,
        name: meta.name,
        category: meta.category,
      }).onConflictDoNothing();
    }

    const permRows = await db.select().from(permissionsTable);
    const permByKey = new Map(permRows.map(p => [p.key, p.id]));

    for (const [role, keys] of Object.entries(ROLE_PERMISSIONS)) {
      for (const key of keys) {
        const permissionId = permByKey.get(key);
        if (!permissionId) continue;
        await db.insert(rolePermissionsTable).values({ role, permissionId }).onConflictDoNothing();
      }
    }
  } catch (err) {
    logger.warn({ err }, "RBAC seed skipped (tables may not exist yet — run db:push)");
  }
}

async function loadPermissionsForRole(role: string): Promise<PermissionKey[]> {
  const rows = await db.select({ key: permissionsTable.key })
    .from(rolePermissionsTable)
    .innerJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
    .where(eq(rolePermissionsTable.role, role));

  if (rows.length === 0) {
    return ROLE_PERMISSIONS[role] ?? [];
  }
  return rows.map(r => r.key as PermissionKey);
}

export async function getPermissionsForRole(role: string): Promise<PermissionKey[]> {
  return getCachedJson(`${CACHE_PREFIX}${role}`, CACHE_TTL, () => loadPermissionsForRole(role));
}

export async function userHasPermission(role: string, permission: PermissionKey): Promise<boolean> {
  const perms = await getPermissionsForRole(role);
  return perms.includes(permission);
}

export async function getRbacMatrix(): Promise<{
  permissions: Array<{ key: string; name: string; category: string }>;
  roles: Record<string, PermissionKey[]>;
}> {
  const permRows = await db.select().from(permissionsTable);
  const permissions = permRows.length
    ? permRows.map(p => ({ key: p.key, name: p.name, category: p.category }))
    : PERMISSION_KEYS.map(key => ({ key, ...PERMISSION_LABELS[key] }));

  const roles: Record<string, PermissionKey[]> = {};
  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    roles[role] = await getPermissionsForRole(role);
  }

  return { permissions, roles };
}

export async function setRolePermissions(role: string, permissionKeys: PermissionKey[]): Promise<void> {
  if (role === "superadmin") {
    throw new Error("Super admin permissions cannot be modified");
  }

  const permRows = await db.select().from(permissionsTable);
  const validKeys = new Set(permRows.map(p => p.key));
  const filtered = permissionKeys.filter(k => validKeys.has(k));

  await db.delete(rolePermissionsTable).where(eq(rolePermissionsTable.role, role));

  for (const key of filtered) {
    const perm = permRows.find(p => p.key === key);
    if (!perm) continue;
    await db.insert(rolePermissionsTable).values({ role, permissionId: perm.id });
  }

  await invalidateRedisCacheByPrefix(CACHE_PREFIX);
}
