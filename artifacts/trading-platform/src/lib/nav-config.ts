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
  ArrowLeftRight,
  ArrowDownUp,
  Users2,
  Headset,
  ShieldCheck,
  LineChart,
  FileText,
  Settings,
  ShieldAlert,
  FileCheck,
  ClipboardList,
  Ticket,
  Tag,
  FileSearch,
  Link2,
  CreditCard,
  Mail,
  Bell,
  Home,
  Database,
  Briefcase,
  Coins,
  Clock,
  Fingerprint,
} from "lucide-react";
import { filterPlatformNavForRole } from "@/lib/permissions";

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

const NAV_ICON_BG: Partial<Record<string, string>> = {
  "text-blue-600 dark:text-blue-400": "bg-blue-500/15 dark:bg-blue-500/15",
  "text-blue-400": "bg-blue-500/15",
  "text-emerald-600 dark:text-emerald-400": "bg-emerald-500/15",
  "text-emerald-400": "bg-emerald-500/15",
  "text-amber-600 dark:text-amber-400": "bg-amber-500/15",
  "text-amber-400": "bg-amber-500/15",
  "text-yellow-600 dark:text-yellow-400": "bg-yellow-500/15",
  "text-yellow-400": "bg-yellow-500/15",
  "text-cyan-600 dark:text-cyan-400": "bg-cyan-500/15",
  "text-cyan-400": "bg-cyan-500/15",
  "text-violet-600 dark:text-violet-400": "bg-violet-500/15",
  "text-violet-400": "bg-violet-500/15",
  "text-indigo-600 dark:text-indigo-400": "bg-indigo-500/15",
  "text-indigo-400": "bg-indigo-500/15",
  "text-purple-600 dark:text-purple-400": "bg-purple-500/15",
  "text-purple-400": "bg-purple-500/15",
  "text-orange-600 dark:text-orange-400": "bg-orange-500/15",
  "text-orange-400": "bg-orange-500/15",
  "text-slate-400": "bg-slate-500/15",
  "text-pink-600 dark:text-pink-400": "bg-pink-500/15",
  "text-pink-400": "bg-pink-500/15",
  "text-fuchsia-600 dark:text-fuchsia-400": "bg-fuchsia-500/15",
  "text-fuchsia-400": "bg-fuchsia-500/15",
  "text-rose-600 dark:text-rose-400": "bg-rose-500/15",
  "text-rose-400": "bg-rose-500/15",
  "text-teal-600 dark:text-teal-400": "bg-teal-500/15",
  "text-teal-400": "bg-teal-500/15",
  "text-lime-600 dark:text-lime-400": "bg-lime-500/15",
  "text-lime-400": "bg-lime-500/15",
  "text-sky-600 dark:text-sky-400": "bg-sky-500/15",
  "text-sky-400": "bg-sky-500/15",
  "text-zinc-400": "bg-zinc-500/15",
  "text-green-600 dark:text-green-400": "bg-green-500/15",
  "text-green-400": "bg-green-500/15",
};

/** Light-mode nav icon colors (readable on white sidebar). */
const NAV_ICON_COLOR_LIGHT: Record<string, string> = {
  "text-blue-400": "text-blue-600 dark:text-blue-400",
  "text-emerald-400": "text-emerald-600 dark:text-emerald-400",
  "text-amber-400": "text-amber-600 dark:text-amber-400",
  "text-yellow-400": "text-yellow-600 dark:text-yellow-400",
  "text-cyan-400": "text-cyan-600 dark:text-cyan-400",
  "text-violet-400": "text-violet-600 dark:text-violet-400",
  "text-indigo-400": "text-indigo-600 dark:text-indigo-400",
  "text-purple-400": "text-purple-600 dark:text-purple-400",
  "text-orange-400": "text-orange-600 dark:text-orange-400",
  "text-pink-400": "text-pink-600 dark:text-pink-400",
  "text-fuchsia-400": "text-fuchsia-600 dark:text-fuchsia-400",
  "text-rose-400": "text-rose-600 dark:text-rose-400",
  "text-teal-400": "text-teal-600 dark:text-teal-400",
  "text-lime-400": "text-lime-600 dark:text-lime-400",
  "text-sky-400": "text-sky-600 dark:text-sky-400",
  "text-green-400": "text-green-600 dark:text-green-400",
};

export function getNavIconColor(item: Pick<NavItem, "color">, isActive = false): string {
  if (item.color) {
    return NAV_ICON_COLOR_LIGHT[item.color] ?? item.color;
  }
  return isActive ? "text-primary" : "text-muted-foreground";
}

export function getNavIconBg(color?: string): string {
  const resolved = color ? (NAV_ICON_COLOR_LIGHT[color] ?? color) : undefined;
  if (resolved && NAV_ICON_BG[resolved]) return NAV_ICON_BG[resolved]!;
  if (color && NAV_ICON_BG[color]) return NAV_ICON_BG[color]!;
  return "bg-muted/80 dark:bg-white/5";
}

/** Trading services — quick links in header row (sidebar has full list) */
export const TRADING_SERVICES_NAV: NavItem[] = [
  { name: "Investment Plans", href: "/plans", icon: TrendingUp, color: "text-yellow-400" },
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
  { name: "MT4/MT5 Account Handling", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
  { name: "Algo Trading", href: "/algo-trading", icon: Cpu, color: "text-indigo-400" },
  { name: "EA Strategies", href: "/ea-strategies", icon: Activity, color: "text-purple-400" },
];

export function getHeaderTradingNav(role: string, location: string): NavItem[] {
  if (role === "support") return [];
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
  { name: "Money Hub", href: "/money", icon: Wallet, color: "text-emerald-400" },
  { name: "Exchange", href: "/exchange", icon: ArrowDownUp, color: "text-amber-600 dark:text-amber-400" },
  { name: "Earn & Staking", href: "/earn/staking", icon: Coins, color: "text-emerald-600 dark:text-emerald-400" },
  { name: "Investments", href: "/investments", icon: Briefcase, color: "text-amber-600 dark:text-amber-400" },
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
  { name: "Managers", href: "/support-team/managers", icon: Users2, color: "text-cyan-400" },
  { name: "KYC Records", href: "/support-team/kyc", icon: ShieldCheck, color: "text-teal-400" },
  { name: "Support Mail Desk", href: "/support-team/mail", icon: Mail, color: "text-sky-400" },

  ...withSectionLabel("Platform Reference (Read-only)", [
    { name: "Investment Plans", href: "/support-team/plans", icon: TrendingUp, color: "text-yellow-400" },
    { name: "EA Subscriptions", href: "/support-team/subscriptions", icon: Activity, color: "text-violet-400" },
    { name: "Exchange Orders", href: "/support-team/exchange", icon: ArrowDownUp, color: "text-amber-400" },
    { name: "Finance Ledger", href: "/support-team/transactions", icon: ArrowRightLeft, color: "text-orange-400" },
    { name: "Upcoming Transactions", href: "/support-team/upcoming-transactions", icon: Clock, color: "text-amber-400" },
    { name: "Investments & ROI", href: "/support-team/investments", icon: Briefcase, color: "text-amber-400" },
    { name: "Profit Sharing", href: "/support-team/profit-sharing", icon: LineChart, color: "text-indigo-400" },
  ]),
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
  { name: "Support Mail", href: "/manager/mail", icon: Mail, color: "text-sky-400" },
  { name: "Transactions", href: "/manager/transactions", icon: ArrowLeftRight, color: "text-orange-400" },
  { name: "Upcoming Transactions", href: "/manager/upcoming-transactions", icon: Clock, color: "text-amber-400" },
  { name: "Copy Trading", href: "/copy-trading", icon: Users, color: "text-cyan-400", section: "Trading Services" },
  { name: "MT4/MT5 Account Handling", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
];

function withSectionLabel(section: string, items: NavItem[]): NavItem[] {
  return items.map((item, i) => ({ ...item, section: i === 0 ? section : item.section }));
}

/** Super Admin — platform-only control (no personal investor sidebar) */
export const SUPER_ADMIN_NAV: NavItem[] = [
  { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard, color: "text-blue-400" },

  ...withSectionLabel("Operations", [
    { name: "Users & Investors", href: "/super-admin/users", icon: Users, color: "text-blue-400" },
    { name: "Managers", href: "/super-admin/managers", icon: Users2, color: "text-cyan-400" },
    { name: "Support Team", href: "/super-admin/support-team", icon: Headset, color: "text-rose-400" },
    { name: "KYC Verification", href: "/super-admin/kyc", icon: ShieldCheck, color: "text-teal-400" },
    { name: "Support Tickets", href: "/super-admin/support", icon: Ticket, color: "text-orange-400" },
    { name: "Referral Program", href: "/super-admin/referrals", icon: ArrowLeftRight, color: "text-pink-400" },
    { name: "Legal Agreements", href: "/super-admin/agreements", icon: FileText, color: "text-lime-400" },
  ]),

  ...withSectionLabel("Finance", [
  { name: "Wallet", href: "/super-admin/wallet", icon: Wallet, color: "text-emerald-400" },
  { name: "Upcoming Transactions", href: "/super-admin/upcoming-transactions", icon: Clock, color: "text-amber-400" },
  { name: "Crypto Exchange", href: "/super-admin/exchange", icon: ArrowDownUp, color: "text-amber-400" },
  { name: "Finance Ledger", href: "/super-admin/transactions", icon: ArrowRightLeft, color: "text-orange-400" },
  { name: "Investments", href: "/super-admin/investments", icon: Briefcase, color: "text-amber-400" },
  { name: "Deposit & Withdrawal Accounts", href: "/super-admin/payment-gateways", icon: CreditCard, color: "text-purple-400" },
  ]),

  ...withSectionLabel("Trading Management", [
    { name: "Investment Plans", href: "/super-admin/investment-plans", icon: TrendingUp, color: "text-yellow-400" },
    { name: "Staking & Earn", href: "/super-admin/staking", icon: Coins, color: "text-emerald-400" },
    { name: "Copy Trading", href: "/super-admin/copy-trading", icon: Users, color: "text-cyan-400" },
    { name: "User MT Accounts & Profit Share", href: "/super-admin/mt5-accounts", icon: History, color: "text-sky-400" },
    { name: "Algo Trading", href: "/super-admin/algo-trading", icon: Cpu, color: "text-indigo-400" },
    { name: "EA Strategies", href: "/super-admin/ea-strategies", icon: Activity, color: "text-purple-400" },
    { name: "EA Subscriptions", href: "/super-admin/ea-subs", icon: Activity, color: "text-violet-400" },
  ]),

  ...withSectionLabel("Platform Configuration", [
    { name: "Email & Communication", href: "/super-admin/communication", icon: Mail, color: "text-sky-400" },
    { name: "Support Mail", href: "/super-admin/support-mail", icon: Mail, color: "text-sky-400" },
    { name: "Homepage Content", href: "/super-admin/homepage", icon: Home, color: "text-amber-400" },
    { name: "Notifications", href: "/super-admin/notifications", icon: Bell, color: "text-yellow-400" },
    { name: "Site Settings", href: "/super-admin/site-config", icon: Settings, color: "text-zinc-400" },
    { name: "Promo Codes", href: "/super-admin/promo-codes", icon: Tag, color: "text-amber-400" },
    { name: "Audit Logs", href: "/super-admin/audit-logs", icon: FileSearch, color: "text-orange-400" },
    { name: "Biometric Security", href: "/super-admin/biometric-security", icon: Fingerprint, color: "text-amber-400" },
    { name: "Backup & Export", href: "/super-admin/backup", icon: Database, color: "text-emerald-400" },
    { name: "Trade Copier API", href: "/super-admin/api", icon: Link2, color: "text-green-400" },
    { name: "System Settings", href: "/super-admin/settings", icon: Settings, color: "text-zinc-400" },
  ]),
];

/** Staff roles that also have personal investor accounts */
export const STAFF_ROLES = new Set<AppRole>(["superadmin", "admin", "manager", "support"]);

export function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role as AppRole);
}

/** Personal investor routes — staff may access these alongside their portal */
export const INVESTOR_ROUTE_PREFIXES = [
  "/dashboard", "/wallet", "/money", "/exchange", "/earn", "/earn/staking", "/investments", "/plans", "/copy-trading", "/algo-trading",
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
    case "superadmin":
      return SUPER_ADMIN_NAV;
    case "admin":
      return filterPlatformNavForRole("admin", SUPER_ADMIN_NAV);
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
    if (role === "superadmin" || role === "admin" || role === "support") return labeledPortal;
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
  const investorTrading: NavItem[] = [
    { name: "Exchange", href: "/exchange", icon: ArrowDownUp, color: "text-amber-400" },
    { name: "Copy", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
    { name: "MT4/MT5", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
  ];
  const staffTrading: NavItem[] = [
    { name: "Copy", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
    { name: "MT4/MT5", href: "/mt5-relay", icon: LineChart, color: "text-violet-400" },
  ];
  switch (role) {
    case "superadmin":
      return [
        { name: "Platform", href: "/super-admin", icon: LayoutDashboard, color: "text-blue-400" },
        { name: "Exchange", href: "/super-admin/exchange", icon: ArrowDownUp, color: "text-amber-400" },
        { name: "Plans", href: "/super-admin/investment-plans", icon: TrendingUp, color: "text-yellow-400" },
        { name: "Copy", href: "/super-admin/copy-trading", icon: Users, color: "text-cyan-400" },
        { name: "Algo", href: "/super-admin/algo-trading", icon: Cpu, color: "text-indigo-400" },
      ];
    case "manager":
      return [
        { name: "Manager", href: "/manager", icon: LayoutDashboard, color: "text-cyan-400" },
        ...staffTrading,
        { name: "Money Hub", href: "/money", icon: Wallet, color: "text-emerald-400" },
        { name: "Account", href: "/account", icon: Briefcase, color: "text-blue-400" },
      ];
    case "support":
      return [
        { name: "Dashboard", href: "/support-team", icon: Headset, color: "text-rose-400" },
        { name: "Tickets", href: "/support-team/tickets", icon: ClipboardList, color: "text-orange-400" },
        { name: "Lookup", href: "/support-team/users", icon: Users, color: "text-cyan-400" },
        { name: "Mail", href: "/support-team/mail", icon: Mail, color: "text-sky-400" },
      ];
    default:
      return [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "text-blue-400" },
        { name: "Money", href: "/money", icon: Wallet, color: "text-emerald-400" },
        { name: "Exchange", href: "/exchange", icon: ArrowDownUp, color: "text-amber-400" },
        { name: "Invest", href: "/investments", icon: Briefcase, color: "text-yellow-400" },
        { name: "Copy", href: "/copy-trading", icon: Users, color: "text-cyan-400" },
      ];
  }
}

export function isNavItemActive(location: string, item: NavItem): boolean {
  if (item.href === "/super-admin") {
    return location === "/super-admin" || location === "/super-admin/overview";
  }
  if (item.href === "/super-admin/support-team") {
    return location === "/super-admin/support-team" || location.startsWith("/super-admin/support-team/");
  }
  if (item.href === "/super-admin/support") {
    return location === "/super-admin/support" || location.startsWith("/super-admin/support/");
  }
  if (item.href === "/support-team") {
    return location === "/support-team";
  }
  if (item.href === "/manager") {
    return location === "/manager";
  }
  if (item.href === "/dashboard") {
    return location === "/dashboard";
  }
  if (item.href === "/money") {
    return location === "/money" || location.startsWith("/money/") || location === "/wallet" || location.startsWith("/wallet/");
  }
  return location === item.href || location.startsWith(`${item.href}/`);
}

export function isSupportRoute(path: string): boolean {
  return path === "/support-team" || path.startsWith("/support-team/");
}

/** Resolve redirect target when a role hits a route outside their portal. */
export function resolveRouteRedirect(role: string, path: string): string | null {
  const clean = path.split("?")[0].split("#")[0];

  if (role === "support") {
    if (isSupportRoute(clean)) return null;
    const supportMap: Record<string, string> = {
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
    if (supportMap[clean]) return supportMap[clean];
    if (clean.startsWith("/super-admin/users") || clean.startsWith("/admin/users")) {
      return "/support-team/users";
    }
    return "/support-team";
  }

  if (role === "superadmin" || role === "admin") {
    if (clean.startsWith("/support-team") || clean.startsWith("/manager")) {
      if (clean.includes("/mail")) return "/super-admin/support-mail";
      return "/super-admin";
    }
    if (clean.startsWith("/admin")) {
      if (ADMIN_TO_SUPER_ADMIN[clean]) return ADMIN_TO_SUPER_ADMIN[clean];
      const userMatch = clean.match(/^\/admin\/users\/(\d+)$/);
      if (userMatch) return `/super-admin/users?user=${userMatch[1]}`;
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
  if (role === "superadmin" || role === "admin") return "/super-admin";
  if (role === "support") return "/support-team";
  if (role === "manager") return "/manager";
  return "/dashboard";
}

/** Map investor routes to super-admin platform views. */
export const INVESTOR_TO_SUPER_ADMIN: Record<string, string> = {
  "/dashboard": "/super-admin",
  "/wallet": "/super-admin/wallet",
  "/money": "/super-admin/wallet",
  "/exchange": "/super-admin/exchange",
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
  "/notifications": "/super-admin/notifications",
  "/trades": "/super-admin/transactions",
  "/promoter": "/super-admin/referrals",
};

/** Map investor routes to manager home when staff access investor URLs */
export const INVESTOR_TO_STAFF: Record<string, Record<string, string>> = {
  manager: Object.fromEntries(Object.keys(INVESTOR_TO_SUPER_ADMIN).map(k => [k, "/manager"])),
};

export const SUPER_ADMIN_TABS = new Set([
  "overview", "wallet", "upcoming-transactions", "exchange", "investments", "investment-plans", "staking", "copy-trading", "algo-trading",
  "ea-strategies", "mt5", "mt5-accounts", "transactions", "notifications", "referrals", "support", "support-mail",
  "kyc", "agreements", "communication", "homepage", "settings",
  "users", "managers", "support-team", "payment-gateways", "site-config", "ea-subs", "api", "promo-codes", "audit-logs", "biometric-security", "backup",
]);

/** Redirect super admin from /admin/* to equivalent super-admin views */
export const ADMIN_TO_SUPER_ADMIN: Record<string, string> = {
  "/admin": "/super-admin",
  "/admin/users": "/super-admin/users",
  "/admin/managers": "/super-admin/managers",
  "/admin/support-team": "/super-admin/support-team",
  "/admin/kyc": "/super-admin/kyc",
  "/admin/transactions": "/super-admin/transactions",
  "/admin/upcoming-transactions": "/super-admin/upcoming-transactions",
  "/admin/plans": "/super-admin/investment-plans",
  "/admin/payment-gateways": "/super-admin/payment-gateways",
  "/admin/tickets": "/super-admin/support",
  "/admin/mail": "/super-admin/support-mail",
  "/admin/notifications": "/super-admin/notifications",
  "/admin/mt5-accounts": "/super-admin/mt5-accounts",
  "/admin/referrals": "/super-admin/referrals",
  "/admin/settings": "/super-admin/site-config",
};
