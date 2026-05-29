import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
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
  const { config, isLoading, enabled } = useMaintenanceMode();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading platform…</p>
      </div>
    );
  }
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
