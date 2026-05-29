/**
 * Central route registry — single source for App routes, nav-config, and smoke tests.
 * Keep in sync when adding new top-level routes.
 */

export type RouteRole = "public" | "user" | "promoter" | "manager" | "support" | "superadmin" | "staff";

export interface RouteDefinition {
  path: string;
  roles: RouteRole[];
  label: string;
  group: string;
}

export const PUBLIC_ROUTES: RouteDefinition[] = [
  { path: "/", roles: ["public"], label: "Landing", group: "Public" },
  { path: "/login", roles: ["public"], label: "Login", group: "Public" },
  { path: "/staff-login", roles: ["public"], label: "Staff Login", group: "Public" },
  { path: "/register", roles: ["public"], label: "Register", group: "Public" },
  { path: "/register/manager", roles: ["public"], label: "Register Manager", group: "Public" },
  { path: "/forgot-password", roles: ["public"], label: "Forgot Password", group: "Public" },
  { path: "/privacy-policy", roles: ["public"], label: "Privacy Policy", group: "Legal" },
  { path: "/terms-of-service", roles: ["public"], label: "Terms", group: "Legal" },
  { path: "/risk-disclosure", roles: ["public"], label: "Risk Disclosure", group: "Legal" },
  { path: "/cookie-policy", roles: ["public"], label: "Cookie Policy", group: "Legal" },
  { path: "/aml-policy", roles: ["public"], label: "AML Policy", group: "Legal" },
];

export const INVESTOR_ROUTES: RouteDefinition[] = [
  { path: "/dashboard", roles: ["user", "manager", "superadmin"], label: "Dashboard", group: "Investor" },
  { path: "/money", roles: ["user", "manager", "superadmin"], label: "Money Hub", group: "Investor" },
  { path: "/wallet", roles: ["user", "manager", "superadmin"], label: "Wallet", group: "Investor" },
  { path: "/exchange", roles: ["user", "manager", "superadmin"], label: "Exchange", group: "Investor" },
  { path: "/investments", roles: ["user", "manager", "superadmin"], label: "Investments", group: "Investor" },
  { path: "/investments/:id", roles: ["user", "manager", "superadmin"], label: "Investment Detail", group: "Investor" },
  { path: "/plans", roles: ["user", "manager", "superadmin"], label: "Plans", group: "Investor" },
  { path: "/copy-trading", roles: ["user", "manager", "superadmin"], label: "Copy Trading", group: "Investor" },
  { path: "/algo-trading", roles: ["user", "manager", "superadmin"], label: "Algo Trading", group: "Investor" },
  { path: "/ea-strategies", roles: ["user", "manager", "superadmin"], label: "EA Strategies", group: "Investor" },
  { path: "/ea-strategies/:id", roles: ["user", "manager", "superadmin"], label: "EA Detail", group: "Investor" },
  { path: "/mt5-accounts", roles: ["user", "manager", "superadmin"], label: "MT Accounts", group: "Investor" },
  { path: "/mt5-relay", roles: ["user", "manager", "superadmin"], label: "MT Relay", group: "Investor" },
  { path: "/transactions", roles: ["user", "manager", "superadmin"], label: "Transactions", group: "Investor" },
  { path: "/trades", roles: ["user", "manager", "superadmin"], label: "Trades", group: "Investor" },
  { path: "/referral", roles: ["user", "manager", "superadmin"], label: "Referral", group: "Investor" },
  { path: "/promoter", roles: ["promoter", "superadmin"], label: "Promoter Hub", group: "Investor" },
  { path: "/support", roles: ["user", "manager", "superadmin"], label: "Support", group: "Investor" },
  { path: "/kyc", roles: ["user", "manager", "superadmin"], label: "KYC", group: "Investor" },
  { path: "/notifications", roles: ["user", "manager", "superadmin"], label: "Notifications", group: "Investor" },
  { path: "/agreements", roles: ["user", "manager", "superadmin"], label: "Agreements", group: "Investor" },
  { path: "/settings", roles: ["user", "manager", "superadmin"], label: "Settings", group: "Investor" },
  { path: "/account", roles: ["user", "manager", "superadmin"], label: "Account", group: "Investor" },
];

export const MANAGER_ROUTES: RouteDefinition[] = [
  { path: "/manager", roles: ["manager", "superadmin"], label: "Manager Home", group: "Manager" },
  { path: "/manager/clients", roles: ["manager", "superadmin"], label: "Clients", group: "Manager" },
  { path: "/manager/clients/:id", roles: ["manager", "superadmin"], label: "Client Detail", group: "Manager" },
  { path: "/manager/kyc", roles: ["manager", "superadmin"], label: "KYC Queue", group: "Manager" },
  { path: "/manager/transactions", roles: ["manager", "superadmin"], label: "Transactions", group: "Manager" },
  { path: "/manager/upcoming-transactions", roles: ["manager", "superadmin"], label: "Upcoming Txns", group: "Manager" },
  { path: "/manager/tickets", roles: ["manager", "superadmin"], label: "Tickets", group: "Manager" },
  { path: "/manager/mail", roles: ["manager", "superadmin"], label: "Mail", group: "Manager" },
  { path: "/manager/plans", roles: ["manager", "superadmin"], label: "Plans (RO)", group: "Manager" },
  { path: "/manager/staking-plans", roles: ["manager", "superadmin"], label: "Staking Plans (RO)", group: "Manager" },
  { path: "/manager/copy-trading", roles: ["manager", "superadmin"], label: "Copy Trading (RO)", group: "Manager" },
  { path: "/manager/algo-strategies", roles: ["manager", "superadmin"], label: "Algo Strategies (RO)", group: "Manager" },
  { path: "/manager/ea-strategies", roles: ["manager", "superadmin"], label: "EA Strategies (RO)", group: "Manager" },
];

export const SUPPORT_ROUTES: RouteDefinition[] = [
  { path: "/support-team", roles: ["support", "superadmin"], label: "Support Dashboard", group: "Support" },
  { path: "/support-team/tickets", roles: ["support", "superadmin"], label: "Tickets", group: "Support" },
  { path: "/support-team/complaints", roles: ["support", "superadmin"], label: "Complaints", group: "Support" },
  { path: "/support-team/queries", roles: ["support", "superadmin"], label: "Queries", group: "Support" },
  { path: "/support-team/users", roles: ["support", "superadmin"], label: "User Lookup", group: "Support" },
  { path: "/support-team/managers", roles: ["support", "superadmin"], label: "Managers", group: "Support" },
  { path: "/support-team/kyc", roles: ["support", "superadmin"], label: "KYC", group: "Support" },
  { path: "/support-team/mail", roles: ["support", "superadmin"], label: "Mail", group: "Support" },
  { path: "/support-team/plans", roles: ["support", "superadmin"], label: "Plans (RO)", group: "Support" },
  { path: "/support-team/staking-plans", roles: ["support", "superadmin"], label: "Staking Plans (RO)", group: "Support" },
  { path: "/support-team/copy-trading", roles: ["support", "superadmin"], label: "Copy Trading (RO)", group: "Support" },
  { path: "/support-team/algo-strategies", roles: ["support", "superadmin"], label: "Algo Strategies (RO)", group: "Support" },
  { path: "/support-team/ea-strategies", roles: ["support", "superadmin"], label: "EA Strategies (RO)", group: "Support" },
  { path: "/support-team/subscriptions", roles: ["support", "superadmin"], label: "EA Subs (RO)", group: "Support" },
  { path: "/support-team/exchange", roles: ["support", "superadmin"], label: "Exchange (RO)", group: "Support" },
  { path: "/support-team/transactions", roles: ["support", "superadmin"], label: "Ledger (RO)", group: "Support" },
  { path: "/support-team/upcoming-transactions", roles: ["support", "superadmin"], label: "Upcoming (RO)", group: "Support" },
  { path: "/support-team/investments", roles: ["support", "superadmin"], label: "Investments (RO)", group: "Support" },
  { path: "/support-team/profit-sharing", roles: ["support", "superadmin"], label: "Profit Share (RO)", group: "Support" },
];

export const SUPER_ADMIN_ROUTES: RouteDefinition[] = [
  { path: "/super-admin", roles: ["superadmin"], label: "Overview", group: "Super Admin" },
  { path: "/super-admin/:tab", roles: ["superadmin"], label: "Tab Panel", group: "Super Admin" },
];

/** Legacy /admin/* paths — redirected via AdminLegacyRedirect */
export const ADMIN_LEGACY_ROUTES: RouteDefinition[] = [
  { path: "/admin", roles: ["superadmin"], label: "Legacy Admin Root", group: "Legacy" },
  { path: "/admin/:rest*", roles: ["superadmin"], label: "Legacy Admin", group: "Legacy" },
];

/** Onboarding is served via /register → pages/onboarding/investor.tsx */
export const ONBOARDING_ALIASES: RouteDefinition[] = [
  { path: "/register", roles: ["public"], label: "Investor Onboarding", group: "Onboarding" },
  { path: "/register/manager", roles: ["public"], label: "Manager Onboarding", group: "Onboarding" },
];

export const ALL_ROUTES: RouteDefinition[] = [
  ...PUBLIC_ROUTES,
  ...INVESTOR_ROUTES,
  ...MANAGER_ROUTES,
  ...SUPPORT_ROUTES,
  ...SUPER_ADMIN_ROUTES,
  ...ADMIN_LEGACY_ROUTES,
];

export function routePathsForRole(role: RouteRole): string[] {
  return ALL_ROUTES.filter(r => r.roles.includes(role) || r.roles.includes("public")).map(r => r.path);
}
