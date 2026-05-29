import { Link } from "wouter";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { UserAccountMenu } from "@/components/layout/UserAccountMenu";
import { FiatBalanceDisplay } from "@/components/finance/FiatBalanceDisplay";
import type { WalletFiatFields } from "@/lib/format-money";
import { formatPlatformAmount } from "@/lib/format-money";
import { getRoleAwareHref } from "@/lib/nav-config";
import { cn } from "@/lib/utils";
import type { PlatformStats } from "@/components/super-admin/SuperAdminPlatformStatsPanel";

type Props = {
  role: string;
  pageTitle: string;
  variant: "compact" | "desktop";
  showPlatformFunds: boolean;
  showUserBalance: boolean;
  staff: boolean;
  onInvestorView: boolean;
  unreadCount: number;
  wallet?: WalletFiatFields | null;
  platformStats?: PlatformStats | null;
};

/** Shared header controls — single source for mobile/tablet and desktop toolbars. */
export function AppShellToolbar({
  role,
  pageTitle,
  variant,
  showPlatformFunds,
  showUserBalance,
  staff,
  onInvestorView,
  unreadCount,
  wallet,
  platformStats,
}: Props) {
  const { t } = useTranslation();
  const compact = variant === "compact";

  const balanceBlock = (size: "sm" | "md") => {
    if (!showPlatformFunds && !showUserBalance) return null;
    const labelClass = size === "sm" ? "text-[9px] md:text-xs" : "text-xs";
    const valueClass = size === "sm" ? "text-[11px] md:text-sm" : "text-sm";

    return (
      <div className={cn("flex flex-col items-end min-w-0", size === "sm" && "max-w-[5.5rem] md:max-w-none")}>
        <span className={cn(labelClass, "text-muted-foreground truncate max-w-full")}>
          {showPlatformFunds
            ? t("layout.platformFunds", { defaultValue: "Platform Funds" })
            : staff && !onInvestorView
              ? t("layout.role")
              : t("layout.myBalance")}
        </span>
        <span
          className={cn(
            valueClass,
            "font-bold truncate max-w-full tabular-nums",
            showPlatformFunds
              ? "text-emerald-600 dark:text-emerald-400"
              : staff && !onInvestorView
                ? "text-cyan-600 dark:text-cyan-400 capitalize"
                : "text-primary",
          )}
        >
          {showPlatformFunds ? (
            `$${formatPlatformAmount(platformStats?.totalDeposits)}`
          ) : staff && !onInvestorView ? (
            t(`roles.${role}`, { defaultValue: role })
          ) : (
            <FiatBalanceDisplay wallet={wallet} size="sm" primaryClassName={size === "sm" ? "text-primary text-[11px]" : "text-primary"} />
          )}
        </span>
      </div>
    );
  };

  const fundsHref = showPlatformFunds
    ? getRoleAwareHref(role, "/super-admin")
    : getRoleAwareHref(role, "/wallet");

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 min-w-0",
        compact ? "px-3 md:px-4 py-0.5 md:py-2 min-h-[2.25rem] md:min-h-[2.75rem]" : "px-4 py-3 min-h-[3.25rem]",
      )}
    >
      <h2
        className={cn(
          "font-semibold truncate text-foreground min-w-0 flex-1 leading-tight",
          compact ? "text-base md:text-base" : "text-base lg:text-lg",
        )}
      >
        {pageTitle}
      </h2>

      <div className={cn("flex items-center shrink-0", compact ? "gap-0 md:gap-1.5 -mr-1 md:mr-0" : "gap-1.5")}>
        <div className={cn(compact && "hidden md:block")}>
          <LanguageSelector />
        </div>
        <ThemeToggle
          className={cn(
            compact && "h-7 w-7 md:h-9 md:w-9 [&_svg]:h-3.5 [&_svg]:w-3.5 md:[&_svg]:h-4 md:[&_svg]:w-4",
          )}
        />
        <Link href={getRoleAwareHref(role, "/notifications")}>
          <Button
            variant="ghost"
            size="icon"
            className={cn("relative shrink-0", compact ? "h-7 w-7 md:h-9 md:w-9" : "h-9 w-9")}
            aria-label={t("layout.notifications", { defaultValue: "Notifications" })}
          >
            <Bell className={cn(compact ? "h-4 w-4 md:h-5 md:w-5" : "h-5 w-5")} />
            {unreadCount > 0 && (
              <Badge
                className={cn(
                  "absolute flex items-center justify-center p-0 bg-primary text-primary-foreground border-background",
                  compact
                    ? "-top-0.5 -right-0.5 md:-top-1 md:-right-1 h-3.5 w-3.5 md:h-5 md:w-5 text-[8px] md:text-xs border md:border-2"
                    : "-top-1 -right-1 h-5 w-5 border-2",
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </Badge>
            )}
          </Button>
        </Link>

        {(showUserBalance || showPlatformFunds) && compact && (
          <Link
            href={fundsHref}
            className="md:hidden flex flex-col items-end min-w-0 max-w-[5.5rem] shrink-0 leading-none px-0.5 touch-target-inline"
            aria-label={showPlatformFunds ? t("layout.platformFunds", { defaultValue: "Platform Funds" }) : t("layout.myBalance")}
          >
            {balanceBlock("sm")}
          </Link>
        )}

        {(showUserBalance || showPlatformFunds) && (
          <>
            <div className={cn("h-8 w-px bg-border mx-1", compact ? "hidden md:block" : "block")} />
            <div className={cn(compact ? "hidden md:flex" : "flex")}>
              {balanceBlock("md")}
            </div>
          </>
        )}

        <div className={cn(compact && "md:hidden")}>
          <UserAccountMenu compact={compact} />
        </div>
        {compact && (
          <div className="hidden md:block">
            <UserAccountMenu />
          </div>
        )}
      </div>
    </div>
  );
}
