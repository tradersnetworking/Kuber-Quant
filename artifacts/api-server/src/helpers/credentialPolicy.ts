/** Roles: superadmin > admin > support | manager > user */

export function isSuperAdmin(role: string): boolean {
  return role === "superadmin";
}

export function isPlatformAdmin(role: string): boolean {
  return role === "superadmin" || role === "admin";
}

/** Roles a viewer may assign (never above self, never superadmin unless superadmin). */
export function assignableRolesFor(viewerRole: string): string[] {
  if (isSuperAdmin(viewerRole)) {
    return ["user", "manager", "support", "admin", "superadmin"];
  }
  if (viewerRole === "admin") {
    return ["user", "manager", "support", "admin"];
  }
  return [];
}

export function assertCanAssignRole(viewerRole: string, targetRole: string): void {
  const allowed = assignableRolesFor(viewerRole);
  if (!allowed.includes(targetRole)) {
    throw new Error(
      viewerRole === "admin"
        ? "Admins cannot assign or modify Super Admin accounts"
        : "Insufficient permission to assign this role",
    );
  }
}

export function assertCanManageCredentials(viewerRole: string): void {
  if (!isSuperAdmin(viewerRole)) {
    throw new Error("Forbidden — credential and security settings require Super Admin");
  }
}

export function assertCanSetPassword(viewerRole: string): void {
  if (!isSuperAdmin(viewerRole)) {
    throw new Error("Forbidden — only Super Admin can set or reset user passwords");
  }
}

const CREDENTIAL_SETTING_PREFIXES = [
  "smtp_",
  "google_",
  "support_imap",
  "support_inbox",
  "mail_desk",
  "encryption",
  "system_reviewer",
];

const CREDENTIAL_SETTING_KEYS = new Set([
  "google_oauth_enabled",
  "google_client_id",
  "auto_approve_gateway_deposits",
]);

export function isCredentialSiteSetting(key: string): boolean {
  const k = key.toLowerCase();
  if (CREDENTIAL_SETTING_KEYS.has(k)) return true;
  return CREDENTIAL_SETTING_PREFIXES.some(p => k.startsWith(p));
}

/** Express paths (mounted at /super-admin) blocked for admin write operations. */
export const ADMIN_WRITE_BLOCKED_PATHS: RegExp[] = [
  /^\/backup(\/|$)/,
  /^\/backup\/run$/,
  /^\/settings\/smtp/,
  /^\/settings\/support-inbox/,
  /^\/settings\/email-communication/,
  /^\/settings\/mail-desk$/,
  /^\/settings\/trade-copier/,
  /^\/settings\/vps-bridge/,
  /^\/settings\/market-data/,
  /^\/settings\/mt5-endpoint/,
  /^\/settings\/mt5-relay-form/,
  /^\/users$/,
  /^\/support-team$/,
  /^\/users\/[^/]+\/role$/,
];

export function isAdminWriteBlockedPath(method: string, path: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  const clean = path.split("?")[0];
  return ADMIN_WRITE_BLOCKED_PATHS.some(r => r.test(clean));
}
