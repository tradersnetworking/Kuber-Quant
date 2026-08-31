import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { fetchMaintenanceConfig, useMaintenanceMode } from "@/hooks/use-maintenance-mode";
import { MaintenancePage } from "@/pages/maintenance";
const LOGIN_PATHS = ["/login", "/staff-login", "/forgot-password"];

function isSuperAdminRole(role?: string): boolean {
  return role === "superadmin" || role === "admin";
}

/** Shows the maintenance page to all users except Super Admin when maintenance mode is on. */
export function MaintenanceModeGuard({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [location] = useLocation();
  const { config, enabled } = useMaintenanceMode();

  // Never block first paint — defaults assume maintenance is off until API confirms.
  if (!enabled || isSuperAdminRole(user?.role as string | undefined)) {
    return <>{children}</>;
  }

  if (LOGIN_PATHS.some((p) => location === p || location.startsWith(`${p}/`))) {
    return <>{children}</>;
  }

  return (
    <MaintenancePage
      config={config}
      onRefresh={() => {
        fetchMaintenanceConfig().then((next) => {
          if (!next.enabled) window.location.reload();
        });
      }}
    />
  );
}
