import { Link, useLocation } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Menu, Bell } from "lucide-react";
import { SupportWidget } from "@/components/SupportWidget";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useListNotifications, useGetWallet } from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNavForRole,
  getMobileNavForRole,
  isNavItemActive,
  isInvestorRoute,
  isStaffRole,
  getRoleAwareHref,
  type NavItem,
} from "@/lib/nav-config";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { HeaderTradingNav } from "@/components/layout/HeaderTradingNav";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { usePlatformStats } from "@/lib/staff-api";
import { formatFiatBalance, formatPlatformAmount } from "@/lib/format-money";
import { SafeBoundary } from "@/components/SafeBoundary";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";

const ROLE_LABELS: Record<string, string> = {
  superadmin: "Super Admin",
  support: "Support",
  manager: "Manager",
  user: "Investor",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const role = (user?.role as string) || "user";
  const isPromoter = !!(user as any)?.isPromoter;
  const staff = isStaffRole(role);
  const onInvestorView = isInvestorRoute(location);
  const isSuperAdmin = role === "superadmin" || role === "admin";

  const { data: notifications } = useListNotifications({
    query: { enabled: !!user, refetchInterval: 30000 } as any,
  });

  const { data: wallet } = useGetWallet({
    query: { enabled: !!user, ...financeQueryOptions } as any,
  });

  const { data: platformStats } = usePlatformStats(isSuperAdmin);
  const branding = useSiteBranding();

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: Notification) => !n.isRead).length
    : 0;
  const navItems = getNavForRole(role, { isPromoter });
  const mobileNavItems: NavItem[] = [
    ...getMobileNavForRole(role),
    { name: "More", href: "#", icon: Menu, onClick: () => setMobileMenuOpen(true) },
  ];

  const getPageTitle = () => {
    const match = navItems
      .filter(i => i.href !== "#" && isNavItemActive(location, i))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return match?.name || "Dashboard";
  };

  return (
    <div className="flex h-screen min-h-0 bg-[#050A14] bg-background overflow-hidden font-sans text-foreground">
      <aside className="hidden md:flex flex-col w-64 min-h-0 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="p-6 border-b border-border shrink-0">
          <BrandLogo className="h-10 w-auto max-w-[130px]" logoUrl={branding.logoUrl} alt={branding.siteName} />
          {staff && (
            <p className="text-[10px] text-amber-500/80 uppercase tracking-wider font-semibold mt-3">
              {ROLE_LABELS[role] || role}
              {onInvestorView && " · Personal Account"}
            </p>
          )}
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-transparent hover:scrollbar-thumb-amber-500/60">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => {
              const isActive = isNavItemActive(location, item);
              return (
                <li key={`${item.name}-${item.href}`}>
                  {item.section && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:pt-0">
                      {item.section}
                    </p>
                  )}
                  <Link href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all relative group",
                    isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-primary/10 border-l-2 border-primary rounded-r-md"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("h-5 w-5 relative z-10 shrink-0", isActive ? (item.color || "text-primary") : cn("text-muted-foreground group-hover:transition-colors", item.color ? `group-hover:${item.color}` : "group-hover:text-primary"))} />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-border bg-white/5 shrink-0 space-y-3">
          <UserAccountMenu compact />
          <button
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex items-center shrink-0 md:hidden">
                <BrandLogo className="h-9 w-auto max-w-[110px]" logoUrl={branding.logoUrl} alt={branding.siteName} />
              </div>
              <h2 className="text-sm sm:text-base font-semibold truncate min-w-0 max-w-[140px] sm:max-w-[200px] lg:max-w-none">
                {getPageTitle()}
              </h2>
              <div className="hidden lg:flex min-w-0 flex-1 overflow-hidden">
                <HeaderTradingNav role={role} />
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <LanguageSelector />
              <ThemeToggle />
              <Link href={getRoleAwareHref(role, "/notifications")}>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground border-2 border-background">
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </Link>
              <div className="h-8 w-[1px] bg-border mx-1 hidden sm:block" />
              <div className="hidden sm:flex flex-col items-end mr-1">
                {isSuperAdmin && !onInvestorView ? (
                  <>
                    <span className="text-xs text-muted-foreground">Platform Funds</span>
                    <span className="text-sm font-bold text-emerald-400">
                      ${formatPlatformAmount(platformStats?.totalDeposits)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">{staff && !onInvestorView ? "Role" : "My Balance"}</span>
                    <span className={`text-sm font-bold ${staff && !onInvestorView ? "text-cyan-400 capitalize" : "text-primary"}`}>
                      {staff && !onInvestorView
                        ? ROLE_LABELS[role] || role
                        : `$${formatFiatBalance(wallet?.fiatBalance)}`}
                    </span>
                  </>
                )}
              </div>
              <UserAccountMenu />
            </div>
          </div>

          <div className="lg:hidden px-4 pb-2 overflow-x-auto scrollbar-none">
            <HeaderTradingNav role={role} className="flex lg:hidden" />
          </div>
        </header>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden absolute inset-0 z-50 bg-background/98 backdrop-blur-md pt-4 px-4 pb-24 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <BrandLogo className="h-10 w-auto max-w-[130px]" logoUrl={branding.logoUrl} alt={branding.siteName} />
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <LogOut className="h-6 w-6 rotate-180" />
                </Button>
              </div>
              <nav>
                <ul className="space-y-2">
                  {navItems.map((item) => {
                    const isActive = isNavItemActive(location, item);
                    return (
                      <li key={`${item.name}-${item.href}`}>
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)} className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-lg transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground active:bg-white/5"
                        )}>
                          <item.icon className={cn("h-6 w-6", isActive ? (item.color || "text-primary") : (item.color ? `${item.color}/60` : "text-muted-foreground"))} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                  <li className="pt-4 mt-4 border-t border-border">
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg text-destructive w-full">
                      <LogOut className="h-6 w-6" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pb-24 md:pb-8 md:p-8 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <div className="max-w-7xl mx-auto min-h-[200px] w-full">
            <SafeBoundary label="This page failed to load. Try refreshing.">
              {children}
            </SafeBoundary>
          </div>
        </div>
        {!staff && <SupportWidget />}
        {staff && onInvestorView && <SupportWidget />}

        <nav className="md:hidden flex items-center justify-around p-2 border-t border-border bg-card/80 backdrop-blur-lg fixed bottom-0 left-0 right-0 z-40">
          {mobileNavItems.map((item) => {
            const isActive = item.href !== "#" && isNavItemActive(location, item);
            return (
              <button
                key={item.name}
                onClick={item.onClick ? item.onClick : () => { setLocation(item.href); setMobileMenuOpen(false); }}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
                {isActive && (
                  <motion.div layoutId="mobileActiveNav" className="w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
