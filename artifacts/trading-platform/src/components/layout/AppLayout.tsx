import { Link, useLocation } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { BrandMark } from "@/components/brand/BrandMark";
import { MobileTopBrandBar } from "@/components/layout/MobileTopBrandBar";
import { useAuth } from "@/hooks/use-auth";
import { useStaffPermissions } from "@/hooks/use-staff-permissions";
import { filterNavByStaffPermissions } from "@/lib/staff-permissions";
import { LogOut, Menu, X, ChevronLeft, ChevronRight } from "lucide-react";
import { SupportWidget } from "@/components/SupportWidget";
import { InvestmentMaturityPayoutDialog } from "@/components/investments/InvestmentMaturityPayoutDialog";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useScrollHideHeader } from "@/hooks/use-scroll-hide-header";
import { useListNotifications, useGetWallet } from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  getNavForRole,
  getMobileNavForRole,
  isNavItemActive,
  isInvestorRoute,
  isStaffRole,
  getRoleAwareHref,
  getPostLoginPath,
  getNavIconColor,
  getNavIconBg,
  type NavItem,
} from "@/lib/nav-config";
import { HeaderTradingNav, useHeaderTradingNavItems } from "@/components/layout/HeaderTradingNav";
import { AppShellToolbar } from "@/components/layout/AppShellToolbar";
import { useSiteBranding } from "@/hooks/use-site-branding";
import { usePlatformStats } from "@/lib/staff-api";
import { SafeBoundary } from "@/components/SafeBoundary";
import { LiveInrRateNote } from "@/components/finance/LiveInrRateNote";
import { lightQueryOptions, LAYOUT_POLL_MS, pollQueryOptions } from "@/lib/query-config";
import { translateNavLabel } from "@/lib/i18n/nav-keys";
import { APP_CONTENT_WIDTH } from "@/lib/ui-system";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { permissions: staffPermissions } = useStaffPermissions();
  const { t, i18n } = useTranslation();
  const { headerHidden, onMainScroll, resetHeaderScroll } = useScrollHideHeader();
  const [location, setLocation] = useLocation();
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", sidebarCollapsed ? "1" : "0");
    } catch {
      // ignore storage errors
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    resetHeaderScroll();
    mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location, resetHeaderScroll]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  const navigateMobile = (href: string) => {
    setMobileMenuOpen(false);
    const target = getRoleAwareHref(role, href);
    if (target !== location) {
      setLocation(target);
    } else {
      mainScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      resetHeaderScroll();
    }
  };

  const role = (user?.role as string) || "user";
  const isPromoter = !!(user as any)?.isPromoter;
  const staff = isStaffRole(role);
  const onInvestorView = isInvestorRoute(location);
  const isSuperAdmin = role === "superadmin" || role === "admin";

  const isSupport = role === "support";
  const showPlatformFunds = isSuperAdmin && !onInvestorView;
  const showUserBalance = !showPlatformFunds && !isSupport && !(staff && !onInvestorView);

  const { data: notifications } = useListNotifications({
    query: { enabled: !!user, ...lightQueryOptions } as any,
  });

  const { data: wallet } = useGetWallet({
    query: {
      enabled: !!user && showUserBalance,
      ...pollQueryOptions(LAYOUT_POLL_MS),
    } as any,
  });

  const { data: platformStats } = usePlatformStats(showPlatformFunds);
  const branding = useSiteBranding();

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n: Notification) => !n.isRead).length
    : 0;
  const navItems = useMemo(() => {
    const base = getNavForRole(role, { isPromoter });
    const filtered = filterNavByStaffPermissions(role, staffPermissions, base);
    return filtered.map(item => ({
      ...item,
      ...translateNavLabel(item, (key, fallback) => t(key, { defaultValue: fallback ?? key })),
    }));
  }, [role, isPromoter, staffPermissions, i18n.language, t]);

  const primaryMobileNav = useMemo(() => {
    return getMobileNavForRole(role).map(item => ({
      ...item,
      ...translateNavLabel(item, (key, fallback) => t(key, { defaultValue: fallback ?? key })),
    }));
  }, [role, i18n.language, t]);
  const primaryMobileHrefs = new Set(primaryMobileNav.map(item => item.href));
  const moreNavItems = navItems.filter(item => item.href !== "#" && !primaryMobileHrefs.has(item.href));
  const mobileNavItems: NavItem[] = [
    ...primaryMobileNav,
    {
      name: t("common.more"),
      href: "#",
      icon: Menu,
      color: "text-amber-600 dark:text-amber-400",
      onClick: () => setMobileMenuOpen(open => !open),
    },
  ];

  const getPageTitle = () => {
    const match = navItems
      .filter(i => i.href !== "#" && isNavItemActive(location, i))
      .sort((a, b) => b.href.length - a.href.length)[0];
    return match?.name || t("layout.dashboard");
  };

  const headerTradingItems = useHeaderTradingNavItems(role, location);
  const showHeaderTradingRow = headerTradingItems.length > 0;

  return (
    <div className="app-shell-root flex h-[100dvh] max-h-[100dvh] min-h-0 bg-background overflow-hidden font-sans text-foreground">
      <aside
        className={cn(
          "hidden md:flex flex-col min-h-0 shrink-0 border-r border-border bg-card/50 backdrop-blur-xl transition-[width] duration-200 ease-in-out",
          sidebarCollapsed ? "w-[4.5rem]" : "w-64 lg:w-72",
        )}
      >
        <div
          className={cn(
            "border-b border-border shrink-0",
            sidebarCollapsed ? "flex justify-center p-3 lg:p-4" : "p-5 lg:p-6",
          )}
        >
          {sidebarCollapsed ? (
            <BrandLogo
              className="h-9 w-9 lg:h-11 lg:w-11 object-contain"
              logoUrl={branding.logoUrl}
              alt={branding.siteName}
            />
          ) : (
            <BrandMark
              href={getPostLoginPath(role)}
              titleSize="md"
              branding={branding}
              logoClassName="lg:max-w-[130px] xl:max-w-[140px]"
            />
          )}
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-4 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-transparent hover:scrollbar-thumb-amber-500/60">
          <ul className={cn("space-y-1", sidebarCollapsed ? "px-2" : "px-3")}>
            {navItems.map((item, index) => {
              const isActive = isNavItemActive(location, item);
              const prevSection = index > 0 ? navItems[index - 1]?.section : undefined;
              const showSectionDivider = sidebarCollapsed && item.section && item.section !== prevSection && index > 0;
              return (
                <li key={`${item.name}-${item.href}`}>
                  {item.section && !sidebarCollapsed && (
                    <p className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:pt-0">
                      {item.section}
                    </p>
                  )}
                  {showSectionDivider && (
                    <div className="mx-1 my-2 border-t border-border/70" aria-hidden />
                  )}
                  <Link
                    href={getRoleAwareHref(role, item.href)}
                    title={sidebarCollapsed ? item.name : undefined}
                    aria-label={sidebarCollapsed ? item.name : undefined}
                    className={cn(
                      "flex items-center rounded-md transition-all relative group",
                      sidebarCollapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2",
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted/80 dark:hover:bg-white/5 hover:text-foreground",
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-primary/10 border-l-2 border-primary rounded-r-md"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg relative z-10 shrink-0", getNavIconBg(item.color))}>
                      <item.icon className={cn("h-4 w-4", getNavIconColor(item, isActive))} />
                    </span>
                    {!sidebarCollapsed && <span className="relative z-10 truncate">{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={cn("border-t border-border shrink-0", sidebarCollapsed ? "p-2 flex justify-center" : "p-3")}>
          <Button
            type="button"
            variant="ghost"
            size={sidebarCollapsed ? "icon" : "sm"}
            className={cn(!sidebarCollapsed && "w-full justify-start gap-2")}
            onClick={() => setSidebarCollapsed(collapsed => !collapsed)}
            aria-label={sidebarCollapsed ? t("layout.expandSidebar") : t("layout.collapseSidebar")}
            title={sidebarCollapsed ? t("layout.expandSidebar") : t("layout.collapseSidebar")}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!sidebarCollapsed && <span>{t("layout.collapse")}</span>}
          </Button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <header className="border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30 shrink-0 overflow-x-hidden pt-[env(safe-area-inset-top,0px)] md:pt-0">
          {/* Brand row — always visible on phone */}
          <div className="md:hidden px-3 border-b border-border/40 bg-background/95">
            <MobileTopBrandBar
              href={getRoleAwareHref(role, "/dashboard")}
              branding={branding}
              className="min-h-[2.75rem] py-1.5"
            />
          </div>

          {/* Below brand: page title + controls + trading nav — hide on scroll (mobile + tablet) */}
          <div
            className={cn(
              "app-header-collapsible lg:hidden grid transition-[grid-template-rows] duration-200 ease-out will-change-[grid-template-rows]",
              headerHidden ? "grid-rows-[0fr]" : "grid-rows-[1fr]",
            )}
          >
            <div className={cn("overflow-hidden min-h-0", headerHidden && "pointer-events-none")}>
              <AppShellToolbar
                variant="compact"
                role={role}
                pageTitle={getPageTitle()}
                showPlatformFunds={showPlatformFunds}
                showUserBalance={showUserBalance}
                staff={staff}
                onInvestorView={onInvestorView}
                unreadCount={unreadCount}
                wallet={wallet}
                platformStats={platformStats}
              />
              {showHeaderTradingRow && (
                <div className="border-t border-border/50 md:border-border/60 bg-muted/30 dark:bg-muted/10 px-2 md:px-4 py-0.5 md:py-1 min-w-0 overflow-hidden">
                  <HeaderTradingNav role={role} compact />
                </div>
              )}
            </div>
          </div>

          {/* Desktop (lg+): toolbar always visible */}
          <div className="hidden lg:block">
            <AppShellToolbar
              variant="desktop"
              role={role}
              pageTitle={getPageTitle()}
              showPlatformFunds={showPlatformFunds}
              showUserBalance={showUserBalance}
              staff={staff}
              onInvestorView={onInvestorView}
              unreadCount={unreadCount}
              wallet={wallet}
              platformStats={platformStats}
            />
          </div>

          {showHeaderTradingRow && (
            <div className="hidden lg:block border-t border-border/60 bg-muted/30 dark:bg-muted/10 px-4 py-1.5 min-w-0 overflow-hidden">
              <HeaderTradingNav role={role} compact className="[&_a]:py-1.5" />
            </div>
          )}
        </header>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.button
                type="button"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-label="Close menu"
                className="md:hidden fixed inset-x-0 top-0 z-[90] bg-black/40 dark:bg-black/55"
                style={{ bottom: "var(--mobile-bottom-nav-height)" }}
                onClick={() => setMobileMenuOpen(false)}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 420, damping: 36 }}
                className="md:hidden fixed left-0 top-0 z-[95] flex w-[min(18rem,88vw)] flex-col border-r border-border bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden"
                style={{
                  bottom: "var(--mobile-bottom-nav-height)",
                  paddingTop: "env(safe-area-inset-top, 0px)",
                }}
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-border/80 shrink-0">
                  <BrandLogo
                    className="h-7 w-auto max-w-[7.5rem] object-contain"
                    logoUrl={branding.logoUrl}
                    alt={branding.siteName}
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setMobileMenuOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 scrollbar-thin scrollbar-thumb-amber-500/40 scrollbar-track-transparent">
                  <ul className="space-y-0.5 pb-2">
                    {moreNavItems.map((item, index) => {
                      const isActive = isNavItemActive(location, item);
                      const prevSection = index > 0 ? moreNavItems[index - 1]?.section : undefined;
                      return (
                        <li key={`${item.name}-${item.href}`}>
                          {item.section && item.section !== prevSection && (
                            <p className="px-2.5 pt-3 pb-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70 first:pt-1">
                              {item.section}
                            </p>
                          )}
                          <Link
                            href={getRoleAwareHref(role, item.href)}
                            onClick={() => navigateMobile(item.href)}
                            className={cn(
                              "flex items-center gap-2.5 px-2.5 py-2 rounded-md transition-colors",
                              isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/70 dark:hover:bg-white/5 active:bg-muted/80",
                            )}
                          >
                            <span className={cn("flex h-7 w-7 items-center justify-center rounded-md shrink-0", getNavIconBg(item.color))}>
                              <item.icon className={cn("h-3.5 w-3.5", getNavIconColor(item, isActive))} />
                            </span>
                            <span className="text-xs leading-snug truncate min-w-0">{item.name}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>
                <div className="shrink-0 border-t border-border p-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]">
                  <button
                    onClick={() => { setMobileMenuOpen(false); logout(); }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-destructive w-full active:bg-destructive/10"
                  >
                    <LogOut className="h-3.5 w-3.5 shrink-0" />
                    {t("common.logout")}
                  </button>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div
          ref={mainScrollRef}
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 lg:p-8 md:pb-8 mobile-scroll-padding scrollbar-none lg:scrollbar-thin"
          onScroll={onMainScroll}
        >
          <div className={cn(APP_CONTENT_WIDTH, "min-h-[200px] w-full space-y-3 sm:space-y-4", staff && "staff-portal-mobile")}>
            {!isSupport && <LiveInrRateNote align="center" className="pb-1" />}
            <SafeBoundary label="This page failed to load. Try refreshing.">
              {children}
            </SafeBoundary>
            {/* Extra clearance on mobile so last buttons are not near the fixed nav */}
            <div className="md:hidden h-4 shrink-0" aria-hidden />
          </div>
        </div>

        {!staff && <SupportWidget />}
        {staff && onInvestorView && <SupportWidget />}
        {(!staff || onInvestorView) && user?.role === "user" && <InvestmentMaturityPayoutDialog />}
        </div>
      </main>

      <nav
        id="mobile-bottom-nav"
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[100] flex items-center justify-around border-t border-border/80 bg-card/98 dark:bg-[#070d18]/98 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.1)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.45)] pt-1.5 px-0.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]"
      >
          {mobileNavItems.map((item) => {
            const isActive = item.href !== "#" && isNavItemActive(location, item);
            const isMore = item.href === "#";
            return (
              <button
                key={item.name}
                onClick={item.onClick ? item.onClick : () => navigateMobile(item.href)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-1.5 px-0.5 rounded-xl transition-all min-w-0 max-w-[4.75rem] touch-target",
                  (isActive || (isMore && mobileMenuOpen))
                    ? "text-primary bg-primary/10 dark:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/5",
                )}
              >
                <span className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl shrink-0 transition-all",
                  getNavIconBg(item.color),
                  (isActive || (isMore && mobileMenuOpen)) && "ring-2 ring-primary/35 shadow-sm scale-105",
                  isMore && mobileMenuOpen && "ring-primary/40",
                )}>
                  <item.icon className={cn("h-4 w-4", getNavIconColor(item, isActive || (isMore && mobileMenuOpen)))} />
                </span>
                <span className="mobile-btn-label font-semibold text-foreground/90">{item.name}</span>
                {isActive && !isMore && (
                  <motion.div layoutId="mobileActiveNav" className="w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>
    </div>
  );
}
