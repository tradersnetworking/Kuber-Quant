import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SafeBoundary } from "@/components/SafeBoundary";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { useServiceVisibility } from "@/hooks/use-service-visibility";
import { hiddenNavHrefs } from "@/lib/service-catalog";
import {
  QUICK_ACTION_BTN,
  QUICK_ACTION_ICON,
  QUICK_ACTION_LABEL,
} from "@/lib/quick-action-styles";
import {
  Users, Cpu, TrendingUp, TrendingDown, LineChart, Activity, Bot, Key, Coins,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  onWalletSuccess?: () => void;
  showWalletActions?: boolean;
  /** sidebar = single-column stack (dashboard side panel); grid = multi-column */
  layout?: "sidebar" | "grid";
};

/** Deposit, withdraw, and trading service shortcuts for dashboards */
export function TradingQuickActions({
  onWalletSuccess,
  showWalletActions = true,
  layout = "grid",
}: Props) {
  const { t } = useTranslation();
  const { services } = useServiceVisibility();
  const hidden = hiddenNavHrefs(services);

  const tradingLinks = [
    { href: "/copy-trading", icon: Users, label: t("nav.copyTrading"), cls: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-200" },
    { href: "/algo-trading", icon: Cpu, label: t("nav.algoTrading"), cls: "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-800 dark:text-indigo-200" },
    { href: "/plans", icon: TrendingUp, label: t("nav.investmentPlans"), cls: "bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-900 dark:text-yellow-200" },
    { href: "/earn/staking", icon: Coins, label: t("nav.earnStaking", { defaultValue: "Staking" }), cls: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200" },
    { href: "/ea-strategies", icon: Bot, label: t("nav.eaStrategies"), cls: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-800 dark:text-violet-200" },
    { href: "/ea-strategies?tab=subscriptions", icon: Key, label: t("quickActions.eaSubscription"), cls: "bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-800 dark:text-fuchsia-200" },
    { href: "/exchange?tab=buy", icon: TrendingUp, label: t("quickActions.buyCrypto"), cls: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200" },
    { href: "/exchange?tab=sell", icon: TrendingDown, label: t("quickActions.sellCrypto"), cls: "bg-orange-500/15 hover:bg-orange-500/25 text-orange-800 dark:text-orange-200" },
    { href: "/mt5-relay", icon: LineChart, label: t("quickActions.mt4mt5"), cls: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-800 dark:text-violet-200" },
    { href: "/support", icon: Activity, label: t("nav.support"), cls: "bg-muted dark:bg-white/10 hover:bg-muted/80 dark:hover:bg-white/15 text-foreground" },
  ].filter(link => !hidden.has(link.href.split("?")[0]));

  const gridClass = layout === "sidebar"
    ? "flex flex-col gap-2 min-w-0"
    : cn(
        "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
        "gap-2.5 sm:gap-3 lg:gap-3.5 min-w-0",
      );

  return (
    <div className="space-y-3 min-w-0">
      {showWalletActions && (
        <SafeBoundary label={t("wallet.depositUnavailable")}>
          <WalletQuickActions onSuccess={onWalletSuccess} />
        </SafeBoundary>
      )}
      <div className={gridClass}>
        {tradingLinks.map(({ href, icon: Icon, label, cls }) => (
          <Button key={href} asChild className={cn(QUICK_ACTION_BTN, cls, "w-full")}>
            <Link href={href}>
              <Icon className={QUICK_ACTION_ICON} aria-hidden />
              <span className={QUICK_ACTION_LABEL}>{label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
