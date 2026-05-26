import {
  LayoutDashboard,
  Wallet,
  Briefcase,
  TrendingUp,
  Users,
  Cpu,
  Activity,
  History,
  ArrowRightLeft,
  Users2,
  Headset,
  ShieldCheck,
  LineChart,
  FileText,
  Settings,
  ShieldAlert,
  FileCheck,
  ClipboardList,
  ArrowLeftRight,
  Tag,
  FileSearch,
  Link2,
  CreditCard,
  Mail,
  Bell,
  Home,
} from "lucide-react";

export type AppRole = "user" | "manager" | "support" | "admin" | "superadmin";

export interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  color?: string;
  section?: string;
  onClick?: () => void;
  promoterOnly?: boolean;
}

/** Trading services — shown in header on every dashboard */
export const TRADING_SERVICES_NAV: NavItem[] = [
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
  { name: "MT4/MT5 Account Handling", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
];

export function getHeaderTradingNav(role: string, location: string): NavItem[] {
  const onPlatformView = role === "superadmin" && !isInvestorRoute(location);
  if (onPlatformView) {
    return [
      { name: "Investment Plans", href: "/super-admin/investment-plans", icon: TrendingUp, color: "text-yellow-400" },
      { name: "Copy Trading", href: "/super-admin/copy-trading", icon: Users, color: "text-cyan-400" },
      { name: "User MT Accounts", href: "/super-admin/mt5-accounts", icon: LineChart, color: "text-violet-400" },
      { name: "Algo Trading", href: "/super-admin/algo-trading", icon: Cpu, color: "text-indigo-400" },
      { name: "EA Strategies", href: "/super-admin/ea-strategies", icon: Activity, color: "text-purple-400" },
    ];
  }
  return TRADING_SERVICES_NAV;
}

/** Regular investor — personal trading & investments */
export const USER_NAV: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
  { name: "Wallet", href: "/wallet", icon: Wallet, color: "text-emerald-400" },
  { name: "Investments", href: "/investments", icon: Briefcase, color: "text-amber-400" },
  { name: "Investment Plans", href: "/plans", icon: TrendingUp, color: "text-yellow-400" },
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
  { name: "MT4/MT5 Account Handling", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
  { name: "Link MT4/MT5 Account", href: "/mt5-accounts", icon: History, color: "text-sky-400" },
  { name: "Algo Trading", href: "/algo-trading", icon: Cpu, color: "text-indigo-400" },
  { name: "EA Strategies", href: "/ea-strategies", icon: Activity, color: "text-purple-400" },
  { name: "Transactions", href: "/transactions", icon: ArrowRightLeft, color: "text-orange-400" },
  { name: "Trade History", href: "/trades", icon: History, color: "text-slate-400" },
  { name: "Notifications", href: "/notifications", icon: ClipboardList, color: "text-yellow-400" },
  { name: "Referral Program", href: "/referral", icon: Users2, color: "text-pink-400" },
  { name: "Promoter Hub", href: "/promoter", icon: Tag, color: "text-fuchsia-400", promoterOnly: true },
  { name: "Support", href: "/support", icon: Headset, color: "text-rose-400" },
  { name: "KYC Verification", href: "/kyc", icon: ShieldCheck, color: "text-teal-400" },
  { name: "Legal Agreements", href: "/agreements", icon: FileText, color: "text-lime-400" },
  { name: "My Account", href: "/account", icon: Settings, color: "text-zinc-400" },
];

/** Support Team — tickets, complaints, queries, user lookup */
export const SUPPORT_NAV: NavItem[] = [
  { name: "Support Dashboard", href: "/support-team", icon: LayoutDashboard, color: "text-rose-400", section: "Support Portal" },
  { name: "All Tickets", href: "/support-team/tickets", icon: Headset, color: "text-rose-400" },
  { name: "Complaints", href: "/support-team/complaints", icon: ShieldAlert, color: "text-orange-400" },
  { name: "Queries", href: "/support-team/queries", icon: FileText, color: "text-blue-400" },
  { name: "User Lookup", href: "/support-team/users", icon: Users, color: "text-cyan-400" },
  { name: "Support Mail Desk", href: "/support-team/mail", icon: Mail, color: "text-sky-400" },
];

/** Promoter — affiliate dashboard (flag on any role) */
export const PROMOTER_NAV: NavItem[] = [
  { name: "Affiliate Dashboard", href: "/promoter", icon: Tag, color: "text-fuchsia-400" },
  { name: "Referral Program", href: "/referral", icon: Users2, color: "text-pink-400" },
];

/** Manager — client & KYC management only */
export const MANAGER_NAV: NavItem[] = [
  { name: "Manager Home", href: "/manager", icon: LayoutDashboard, color: "text-cyan-400" },
  { name: "My Clients", href: "/manager/clients", icon: Users2, color: "text-cyan-400" },
  { name: "KYC Queue", href: "/manager/kyc", icon: FileCheck, color: "text-emerald-400" },
  { name: "Support Tickets", href: "/manager/tickets", icon: ClipboardList, color: "text-amber-400" },
  { name: "Transactions", href: "/manager/transactions", icon: ArrowLeftRight, color: "text-orange-400" },
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400", section: "Trading Services" },
  { name: "MT4/MT5 Account Handling", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
];

/** Admin — platform operations (below super admin) */
export const ADMIN_NAV: NavItem[] = [
  { name: "Admin Home", href: "/admin", icon: ShieldAlert, color: "text-red-400" },
  { name: "Users", href: "/admin/users", icon: Users, color: "text-blue-400" },
  { name: "Managers", href: "/admin/managers", icon: Users2, color: "text-cyan-400" },
  { name: "KYC Review", href: "/admin/kyc", icon: FileCheck, color: "text-emerald-400" },
  { name: "Finance Ledger", href: "/admin/transactions", icon: ClipboardList, color: "text-amber-400" },
  { name: "Investment Plans", href: "/admin/plans", icon: TrendingUp, color: "text-yellow-400" },
  { name: "Payment Gateways", href: "/admin/payment-gateways", icon: LineChart, color: "text-purple-400" },
  { name: "Support Tickets", href: "/admin/tickets", icon: Headset, color: "text-rose-400" },
  { name: "Support Mail Desk", href: "/admin/mail", icon: Mail, color: "text-sky-400" },
  { name: "Notifications", href: "/admin/notifications", icon: Bell, color: "text-yellow-400" },
  { name: "User MT Accounts", href: "/admin/mt5-accounts", icon: History, color: "text-sky-400" },
  { name: "Referrals", href: "/admin/referrals", icon: ArrowLeftRight, color: "text-pink-400" },
  { name: "Site Settings", href: "/admin/settings", icon: Settings, color: "text-zinc-400" },
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400", section: "Trading Services" },
];

/** Super Admin — platform-only control (no personal investor sidebar) */
export const SUPER_ADMIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard, color: "text-blue-400" },

  { name: "Users & Investors", href: "/super-admin/users", icon: Users, color: "text-blue-400", section: "Operations" },
  { name: "Managers", href: "/super-admin/managers", icon: Users2, color: "text-cyan-400" },
  { name: "Admins", href: "/super-admin/admins", icon: ShieldAlert, color: "text-red-400" },
  { name: "KYC Verification", href: "/super-admin/kyc", icon: ShieldCheck, color: "text-teal-400" },
  { name: "Support Tickets", href: "/super-admin/support", icon: Headset, color: "text-rose-400" },
  { name: "Support Mail", href: "/super-admin/support-mail", icon: Mail, color: "text-sky-400" },
  { name: "Referral Program", href: "/super-admin/referrals", icon: ArrowLeftRight, color: "text-pink-400" },
  { name: "Legal Agreements", href: "/super-admin/agreements", icon: FileText, color: "text-lime-400" },

  { name: "Wallet", href: "/super-admin/wallet", icon: Wallet, color: "text-emerald-400", section: "Finance" },
  { name: "Finance Ledger", href: "/super-admin/transactions", icon: ArrowRightLeft, color: "text-orange-400" },
  { name: "Investments", href: "/super-admin/investments", icon: Briefcase, color: "text-amber-400" },
  { name: "Payment Gateways", href: "/super-admin/payment-gateways", icon: CreditCard, color: "text-purple-400" },

  { name: "Investment Plans", href: "/super-admin/investment-plans", icon: TrendingUp, color: "text-yellow-400", section: "Trading Management" },
  { name: "Copy Trading", href: "/super-admin/copy-trading", icon: Users, color: "text-cyan-400" },
  { name: "User MT Accounts & Profit Share", href: "/super-admin/mt5-accounts", icon: History, color: "text-sky-400" },
  { name: "Algo Trading", href: "/super-admin/algo-trading", icon: Cpu, color: "text-indigo-400" },
  { name: "EA Strategies", href: "/super-admin/ea-strategies", icon: Activity, color: "text-purple-400" },
  { name: "EA Subscriptions", href: "/super-admin/ea-subs", icon: Activity, color: "text-violet-400" },

  { name: "Email & Communication", href: "/super-admin/communication", icon: Mail, color: "text-sky-400", section: "Platform Configuration" },
  { name: "Homepage Content", href: "/super-admin/homepage", icon: Home, color: "text-amber-400" },
  { name: "Notifications", href: "/super-admin/notifications", icon: Bell, color: "text-yellow-400" },
  { name: "Site Settings", href: "/super-admin/site-config", icon: Settings, color: "text-zinc-400" },
  { name: "Promo Codes", href: "/super-admin/promo-codes", icon: Tag, color: "text-amber-400" },
  { name: "Audit Logs", href: "/super-admin/audit-logs", icon: FileSearch, color: "text-orange-400" },
  { name: "Trade Copier API", href: "/super-admin/api", icon: Link2, color: "text-green-400" },
  { name: "System Settings", href: "/super-admin/settings", icon: Settings, color: "text-zinc-400" },
];

/** Staff roles that also have personal investor accounts */
export const STAFF_ROLES = new Set<AppRole>(["superadmin", "admin", "manager", "support"]);

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role as AppRole);
}

/** Personal investor routes — staff may access these alongside their portal */
export const INVESTOR_ROUTE_PREFIXES = [
  "/dashboard", "/wallet", "/investments", "/plans", "/copy-trading", "/algo-trading",
  "/ea-strategies", "/mt5-accounts", "/transactions", "/referral", "/support", "/kyc",
  "/mt5-relay", "/agreements", "/settings", "/account", "/notifications", "/trades", "/promoter",
];

export function isInvestorRoute(path: string): boolean {
  return INVESTOR_ROUTE_PREFIXES.some(p => path === p || path.startsWith(`${p}/`));
}

function portalSectionLabel(role: string): string {
  switch (role) {
    case "superadmin": return "Platform";
    case "admin": return "Admin Portal";
    case "manager": return "Manager Portal";
    case "support": return "Support Portal";
    default: return "Portal";
  }
}

function getStaffPortalNav(role: string, opts?: { isPromoter?: boolean }): NavItem[] {
  switch (role) {
    case "superadmin": return SUPER_ADMIN_NAV;
    case "admin":
      return opts?.isPromoter
        ? [...ADMIN_NAV, ...PROMOTER_NAV.filter(p => !ADMIN_NAV.some(a => a.href === p.href))]
        : ADMIN_NAV;
    case "support": return SUPPORT_NAV;
    case "manager":
      return opts?.isPromoter
        ? [...MANAGER_NAV, { name: "Promoter Hub", href: "/promoter", icon: Tag, color: "text-fuchsia-400" }]
        : MANAGER_NAV;
    default: return [];
  }
}

/** Personal account nav appended for staff who can also invest/trade */
export function getMyAccountNav(opts?: { isPromoter?: boolean }): NavItem[] {
  return USER_NAV
    .filter(item => !item.promoterOnly || opts?.isPromoter)
    .map((item, i) => ({
      ...item,
      name: item.href === "/dashboard" ? "My Dashboard" : item.name,
      section: i === 0 ? "My Account" : undefined,
    }));
}

export function getNavForRole(role: string, opts?: { isPromoter?: boolean }): NavItem[] {
  if (isStaffRole(role)) {
    const portalNav = getStaffPortalNav(role, opts);
    const labeledPortal = portalNav.map((item, i) => ({
      ...item,
      section: item.section ?? (i === 0 && !portalNav[0]?.section && role !== "superadmin" ? portalSectionLabel(role) : undefined),
    }));
    if (role === "superadmin") return labeledPortal;
    const merged = [...labeledPortal, ...getMyAccountNav(opts)];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.href)) return false;
      seen.add(item.href);
      return true;
    });
  }
  return USER_NAV.filter(item => !item.promoterOnly || opts?.isPromoter);
}

export function getMobileNavForRole(role: string): NavItem[] {
  const trading = [
    { name: "Copy", href: "/copy-trading", icon: Users },
    { name: "MT4/MT5", href: "/mt5-relay", icon: LineChart },
  ];
  switch (role) {
    case "superadmin":
      return [
        { name: "Platform", href: "/super-admin", icon: LayoutDashboard },
        { name: "Trading", href: "/super-admin/investment-plans", icon: TrendingUp },
        { name: "Copy", href: "/super-admin/copy-trading", icon: Users },
        { name: "MT4/MT5", href: "/super-admin/mt5-accounts", icon: LineChart },
      ];
    case "admin":
      return [
        { name: "Admin", href: "/admin", icon: ShieldAlert },
        { name: "MT Accounts", href: "/admin/mt5-accounts", icon: LineChart },
        ...trading,
        { name: "My Wallet", href: "/wallet", icon: Wallet },
        { name: "Account", href: "/dashboard", icon: LayoutDashboard },
      ];
    case "manager":
      return [
        { name: "Manager", href: "/manager", icon: LayoutDashboard },
        ...trading,
        { name: "My Wallet", href: "/wallet", icon: Wallet },
        { name: "Account", href: "/dashboard", icon: Briefcase },
      ];
    case "support":
      return [
        { name: "Dashboard", href: "/support-team", icon: Headset },
        { name: "Tickets", href: "/support-team/tickets", icon: ClipboardList },
        { name: "Complaints", href: "/support-team/complaints", icon: ShieldAlert },
        { name: "Lookup", href: "/support-team/users", icon: Users },
        { name: "Mail", href: "/support-team/mail", icon: Mail },
      ];
    default:
      return [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Wallet", href: "/wallet", icon: Wallet },
        { name: "Copy", href: "/copy-trading", icon: Users },
        { name: "MT4/MT5", href: "/mt5-relay", icon: LineChart },
      ];
  }
}

export function isNavItemActive(location: string, item: NavItem): boolean {
  if (item.href === "/super-admin") {
    return location === "/super-admin" || location === "/super-admin/overview";
  }
  if (item.href === "/support-team") {
    return location === "/support-team";
  }
  if (item.href === "/admin") {
    return location === "/admin";
  }
  if (item.href === "/manager") {
    return location === "/manager";
  }
  if (item.href === "/dashboard") {
    return location === "/dashboard";
  }
  return location === item.href || location.startsWith(`${item.href}/`);
}

/** Resolve redirect target when a role hits a route outside their portal. */
export function resolveRouteRedirect(role: string, path: string): string | null {
  const clean = path.split("?")[0].split("#")[0];

  if (role === "superadmin") {
    if (clean.startsWith("/support-team") || clean.startsWith("/manager")) {
      if (clean.includes("/mail")) return "/super-admin/support-mail";
      return "/super-admin";
    }
    if (clean.startsWith("/admin")) {
      if (ADMIN_TO_SUPER_ADMIN[clean]) return ADMIN_TO_SUPER_ADMIN[clean];
      if (/^\/admin\/users\/\d+$/.test(clean)) return "/super-admin/users";
      if (clean.startsWith("/admin/")) return "/super-admin";
    }
    if (!isInvestorRoute(clean)) return null;
    let target = INVESTOR_TO_SUPER_ADMIN[clean];
    if (!target) {
      const prefix = Object.keys(INVESTOR_TO_SUPER_ADMIN).find(
        (k) => k !== "/dashboard" && clean.startsWith(`${k}/`)
      );
      if (prefix) target = INVESTOR_TO_SUPER_ADMIN[prefix];
    }
    if (target && target !== clean) return target;
  }

  return null;
}

/** Role-correct href for sidebar/header links (e.g. super-admin platform paths). */
export function getRoleAwareHref(role: string, href: string): string {
  return resolveRouteRedirect(role, href) ?? href;
}

export function getPostLoginPath(role: string): string {
  if (role === "superadmin") return "/super-admin";
  if (role === "admin") return "/admin";
  if (role === "support") return "/support-team";
  if (role === "manager") return "/manager";
  return "/dashboard";
}

/** Map investor routes to super-admin platform views. */
export const INVESTOR_TO_SUPER_ADMIN: Record<string, string> = {
  "/dashboard": "/super-admin",
  "/wallet": "/super-admin/wallet",
  "/investments": "/super-admin/investments",
  "/plans": "/super-admin/investment-plans",
  "/copy-trading": "/super-admin/copy-trading",
  "/algo-trading": "/super-admin/algo-trading",
  "/ea-strategies": "/super-admin/ea-strategies",
  "/mt5-accounts": "/super-admin/mt5-accounts",
  "/transactions": "/super-admin/transactions",
  "/referral": "/super-admin/referrals",
  "/support": "/super-admin/support",
  "/kyc": "/super-admin/kyc",
  "/mt5-relay": "/super-admin/mt5-accounts",
  "/agreements": "/super-admin/agreements",
  "/settings": "/super-admin/settings",
  "/account": "/super-admin/settings",
  "/notifications": "/super-admin",
  "/trades": "/super-admin/transactions",
  "/promoter": "/super-admin/referrals",
};

/** Map investor routes to admin/manager home when staff access investor URLs */
export const INVESTOR_TO_STAFF: Record<string, Record<string, string>> = {
  admin: Object.fromEntries(Object.keys(INVESTOR_TO_SUPER_ADMIN).map(k => [k, "/admin"])),
  manager: Object.fromEntries(Object.keys(INVESTOR_TO_SUPER_ADMIN).map(k => [k, "/manager"])),
};

export const SUPER_ADMIN_TABS = new Set([
  "overview", "wallet", "investments", "investment-plans", "copy-trading", "algo-trading",
  "ea-strategies", "mt5", "mt5-accounts", "transactions", "notifications", "referrals", "support", "support-mail",
  "kyc", "agreements", "communication", "homepage", "settings",
  "users", "managers", "admins", "payment-gateways", "site-config", "ea-subs", "api", "promo-codes", "audit-logs",
]);

/** Redirect super admin from /admin/* to equivalent super-admin views */
export const ADMIN_TO_SUPER_ADMIN: Record<string, string> = {
  "/admin": "/super-admin",
  "/admin/users": "/super-admin/users",
  "/admin/managers": "/super-admin/managers",
  "/admin/kyc": "/super-admin/kyc",
  "/admin/transactions": "/super-admin/transactions",
  "/admin/plans": "/super-admin/investment-plans",
  "/admin/payment-gateways": "/super-admin/payment-gateways",
  "/admin/tickets": "/super-admin/support",
  "/admin/mail": "/super-admin/support-mail",
  "/admin/notifications": "/super-admin/notifications",
  "/admin/mt5-accounts": "/super-admin/mt5-accounts",
  "/admin/referrals": "/super-admin/referrals",
  "/admin/settings": "/super-admin/site-config",
};
