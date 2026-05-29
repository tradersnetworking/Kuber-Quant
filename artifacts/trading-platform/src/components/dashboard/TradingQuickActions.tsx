import { Link } from "wouter";

import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

import { SafeBoundary } from "@/components/SafeBoundary";

import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";

import {

  QUICK_ACTION_BTN,

  QUICK_ACTION_GRID,

  QUICK_ACTION_ICON,

  QUICK_ACTION_LABEL,

} from "@/lib/quick-action-styles";

import {

  Users, Cpu, TrendingUp, TrendingDown, LineChart, Activity, Bot, Key,

} from "lucide-react";

import { cn } from "@/lib/utils";



type Props = {

  onWalletSuccess?: () => void;

  showWalletActions?: boolean;

  gridClassName?: string;

};



/** Deposit, withdraw, and trading service shortcuts for dashboards */

export function TradingQuickActions({

  onWalletSuccess,

  showWalletActions = true,

  gridClassName = QUICK_ACTION_GRID,

}: Props) {

  const { t } = useTranslation();



  const tradingLinks = [

    { href: "/copy-trading", icon: Users, label: t("nav.copyTrading"), cls: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-800 dark:text-cyan-200" },

    { href: "/algo-trading", icon: Cpu, label: t("nav.algoTrading"), cls: "bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-800 dark:text-indigo-200" },

    { href: "/plans", icon: TrendingUp, label: t("nav.investmentPlans"), cls: "bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-900 dark:text-yellow-200" },

    { href: "/ea-strategies", icon: Bot, label: t("nav.eaStrategies"), cls: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-800 dark:text-violet-200" },

    { href: "/ea-strategies?tab=subscriptions", icon: Key, label: t("quickActions.eaSubscription"), cls: "bg-fuchsia-500/15 hover:bg-fuchsia-500/25 text-fuchsia-800 dark:text-fuchsia-200" },

    { href: "/exchange?tab=buy", icon: TrendingUp, label: t("quickActions.buyCrypto"), cls: "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-800 dark:text-emerald-200" },

    { href: "/exchange?tab=sell", icon: TrendingDown, label: t("quickActions.sellCrypto"), cls: "bg-orange-500/15 hover:bg-orange-500/25 text-orange-800 dark:text-orange-200" },

    { href: "/mt5-relay", icon: LineChart, label: t("quickActions.mt4mt5"), cls: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-800 dark:text-violet-200" },

    { href: "/support", icon: Activity, label: t("nav.support"), cls: "bg-muted dark:bg-white/10 hover:bg-muted/80 dark:hover:bg-white/15 text-foreground" },

  ] as const;



  return (

    <div className="space-y-3 lg:space-y-4 min-w-0">

      {showWalletActions && (

        <SafeBoundary label={t("wallet.depositUnavailable")}>

          <WalletQuickActions onSuccess={onWalletSuccess} />

        </SafeBoundary>

      )}

      <div className={cn(gridClassName, "min-w-0")}>

        {tradingLinks.map(({ href, icon: Icon, label, cls }) => (

          <Link key={href} href={href} className="min-w-0 block h-full">

            <Button className={cn(QUICK_ACTION_BTN, cls, "h-full")}>

              <Icon className={QUICK_ACTION_ICON} aria-hidden />

              <span className={QUICK_ACTION_LABEL}>{label}</span>

            </Button>

          </Link>

        ))}

      </div>

    </div>

  );

}


