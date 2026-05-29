import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { getHeaderTradingNav, isNavItemActive, getNavIconColor, getRoleAwareHref } from "@/lib/nav-config";
import { NAV_HREF_I18N } from "@/lib/i18n/nav-keys";
import { useServiceVisibility } from "@/hooks/use-service-visibility";
import { hiddenNavHrefs } from "@/lib/service-catalog";

/** Compact labels for md–lg screens and mobile scroll row */
const SHORT_NAV_KEYS: Record<string, string> = {
  "nav.investmentPlans": "nav.plans",
  "nav.copyTrading": "nav.copy",
  "nav.userMtAccounts": "nav.mt5Accounts",
  "nav.mt5Relay": "nav.mt5Relay",
  "nav.mt5Accounts": "nav.mt5Accounts",
  "nav.algoTrading": "nav.algoTrading",
  "nav.eaStrategies": "nav.eaStrategies",
};

export function HeaderTradingNav({
  role,
  className,
  compact = false,
}: {
  role: string;
  className?: string;
  compact?: boolean;
}) {
  const [location] = useLocation();
  const { t } = useTranslation();
  const { services } = useServiceVisibility();
  const isInvestor = !["superadmin", "admin", "manager", "support"].includes(role);
  const hidden = isInvestor ? hiddenNavHrefs(services) : new Set<string>();
  const items = getHeaderTradingNav(role, location).filter(item => !hidden.has(item.href));

  if (items.length === 0) return null;

  return (
    <nav
      className={cn(
        "flex items-center gap-1 min-w-0 w-full overflow-x-auto scrollbar-none",
        className,
      )}
      aria-label="Trading services"
    >
      {items.map((item) => {
        const active = isNavItemActive(location, item);
        const labelKey = NAV_HREF_I18N[item.href];
        const label = labelKey ? t(labelKey) : item.name;
        const shortKey = labelKey ? SHORT_NAV_KEYS[labelKey] : undefined;
        const short = shortKey ? t(shortKey) : label;
        return (
          <Link
            key={item.href}
            href={getRoleAwareHref(role, item.href)}
            title={label}
            aria-label={label}
            className={cn(
              "flex items-center justify-center gap-1 rounded-md font-medium whitespace-nowrap transition-colors border shrink-0",
              compact ? "px-1.5 py-1 text-[10px] sm:px-2" : "px-2 py-1.5 text-xs sm:px-2.5",
              active
                ? "bg-primary/15 text-primary border-primary/30"
                : "text-muted-foreground border-transparent hover:bg-muted/80 dark:hover:bg-white/5 hover:text-foreground hover:border-border dark:hover:border-white/10",
            )}
          >
            <item.icon
              className={cn(
                compact ? "h-3.5 w-3.5 shrink-0" : "h-4 w-4 sm:h-3.5 sm:w-3.5 shrink-0",
                getNavIconColor(item, active),
              )}
            />
            <span className="sr-only sm:not-sr-only sm:hidden">{label}</span>
            <span className="hidden sm:inline lg:hidden">{short}</span>
            <span className="hidden lg:inline xl:hidden">{short}</span>
            <span className="hidden xl:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function useHeaderTradingNavItems(role: string, location: string) {
  return getHeaderTradingNav(role, location);
}
