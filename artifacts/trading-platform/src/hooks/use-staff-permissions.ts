import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authFetchJson } from "@/lib/token-store";
import { can, type PermissionAction } from "@/lib/permissions";
import type { PermissionKey } from "@/lib/staff-permissions";

type PermissionsResponse = {
  role: string;
  permissions: PermissionKey[];
};

const STAFF_PERMISSION_TO_ACTION: Partial<Record<PermissionKey, PermissionAction>> = {
  manage_users: "users.manage",
  approve_withdrawals: "finance.approve",
  edit_investments: "investment.manage",
  manage_tickets: "support.ticket.manage",
  view_analytics: "investment.view",
  manage_payments: "finance.approve",
  manage_security: "settings.site",
  manage_credentials: "settings.credentials",
  manage_promoters: "referral.manage",
};

export function useStaffPermissions() {
  const { user, token } = useAuth();

  const query = useQuery({
    queryKey: ["/api/auth/permissions", user?.role],
    queryFn: () => authFetchJson<PermissionsResponse>("/auth/permissions"),
    enabled: !!user && !!token,
    staleTime: 120_000,
  });

  const permissionSet = new Set(query.data?.permissions ?? []);

  const hasStaffPermission = (key: PermissionKey): boolean => {
    if (!user) return false;
    if (permissionSet.size > 0) return permissionSet.has(key);
    const action = STAFF_PERMISSION_TO_ACTION[key];
    return action ? can(user.role as string, action) : false;
  };

  return {
    permissions: query.data?.permissions ?? [],
    isLoading: query.isLoading,
    hasStaffPermission,
  };
}
