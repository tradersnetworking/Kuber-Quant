import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { resolveRouteRedirect } from "@/lib/nav-config";

/** Redirects users away from routes outside their role portal. */
export function SuperAdminInvestorRedirect() {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const path = location.split("?")[0].split("#")[0];
  const target = resolveRouteRedirect(user.role as string, location);
  if (!target || target === path) return null;
  return <Redirect to={target} />;
}
