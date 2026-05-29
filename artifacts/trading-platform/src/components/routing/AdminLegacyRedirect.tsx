import { Redirect, useLocation } from "wouter";
import { ADMIN_TO_SUPER_ADMIN } from "@/lib/nav-config";

/** Legacy /admin/* URLs → super-admin equivalents */
export function AdminLegacyRedirect() {
  const [location] = useLocation();
  const path = location.split("?")[0].split("#")[0];

  const userMatch = path.match(/^\/admin\/users\/(\d+)$/);
  if (userMatch) {
    return <Redirect to={`/super-admin/users?user=${userMatch[1]}`} />;
  }

  const target = ADMIN_TO_SUPER_ADMIN[path]
    ?? (path.startsWith("/admin") ? "/super-admin" : null);
  if (!target) return <Redirect to="/super-admin" />;
  return <Redirect to={target} />;
}
