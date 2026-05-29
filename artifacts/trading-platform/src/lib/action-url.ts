import {
  getRoleAwareHref,
  getPostLoginPath,
  isSupportRoute,
  resolveRouteRedirect,
} from "@/lib/nav-config";

/** Map notification / deep-link targets to support-team equivalents. */
const SUPPORT_ACTION_MAP: Record<string, string> = {
  "/super-admin/support": "/support-team/tickets",
  "/super-admin/kyc": "/support-team/kyc",
  "/super-admin/users": "/support-team/users",
  "/super-admin/transactions": "/support-team/transactions",
  "/super-admin/upcoming-transactions": "/support-team/upcoming-transactions",
  "/super-admin/wallet": "/support-team/transactions",
  "/super-admin/investments": "/support-team/investments",
  "/super-admin/exchange": "/support-team/exchange",
  "/kyc": "/support-team/kyc",
  "/transactions": "/support-team/transactions",
  "/wallet": "/support-team/transactions",
  "/money": "/support-team/transactions",
  "/support": "/support-team/tickets",
  "/investments": "/support-team/investments",
  "/exchange": "/support-team/exchange",
};

function splitPathQuery(url: string): { path: string; suffix: string } {
  const q = url.indexOf("?");
  const h = url.indexOf("#");
  const cut = q >= 0 ? q : h >= 0 ? h : url.length;
  return { path: url.slice(0, cut), suffix: url.slice(cut) };
}

/** Role-correct in-app link for notification CTAs and deep links. */
export function resolveActionUrl(role: string, actionUrl: string): string {
  if (!actionUrl || actionUrl.startsWith("http://") || actionUrl.startsWith("https://")) {
    return actionUrl;
  }

  const { path, suffix } = splitPathQuery(actionUrl);

  if (/^\/admin\/users\/(\d+)$/.test(path)) {
    const id = path.match(/^\/admin\/users\/(\d+)$/)![1];
    return getRoleAwareHref(role, `/super-admin/users?user=${id}`);
  }

  if (role === "support") {
    if (isSupportRoute(path)) return actionUrl;
    if (SUPPORT_ACTION_MAP[path]) return SUPPORT_ACTION_MAP[path] + suffix;
    if (path.startsWith("/super-admin/users") || path.startsWith("/admin/users")) {
      return "/support-team/users" + suffix;
    }
    const mapped = resolveRouteRedirect(role, path);
    if (mapped && mapped !== path) return mapped + suffix;
    return "/support-team";
  }

  const redirected = resolveRouteRedirect(role, path);
  const resolved = redirected ?? getRoleAwareHref(role, path);
  return resolved + suffix;
}

export { getPostLoginPath };
