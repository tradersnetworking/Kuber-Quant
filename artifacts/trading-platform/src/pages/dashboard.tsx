import * as ApiHooks from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import {
  ArrowUpRight, ArrowDownLeft, Bell,
  ShieldAlert, Plus, ArrowRightLeft,
  Target, Coins, Award, LineChart, Activity,
} from "lucide-react";
import { LazyInvestorDashboardCharts } from "@/components/dashboard/LazyInvestorDashboardCharts";
import { InvestorKpiStrip } from "@/components/dashboard/InvestorKpiStrip";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { DownloadAppButton } from "@/components/pwa/DownloadAppButton";
import { TradingQuickActions } from "@/components/dashboard/TradingQuickActions";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { formatWalletFiatDisplay, resolveWalletFiatInr } from "@/lib/format-money";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { formatLocaleDate, translateStatus } from "@/lib/i18n/translate-helpers";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { authFetchJson } from "@/lib/token-store";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { PeriodFinanceKpiGrid, mapFiatAuditToBreakdown } from "@/components/finance/PeriodFinanceKpiGrid";
import { appendPeriodQuery, defaultFinancePeriod, isPresentPeriod, todayIso, type StatsPeriod } from "@/lib/finance-period";
import { ReferralShareDialog } from "@/components/referral/ReferralShareDialog";
import { ReferActionButton } from "@/components/referral/ReferActionButton";
import { getShareUserDisplayName } from "@/lib/user-display-name";
import { cn } from "@/lib/utils";
import { APP_PAGE_STACK, APP_STAT_GRID, APP_DASHBOARD_SPLIT, APP_DASHBOARD_MAIN } from "@/lib/ui-system";
import { AppPage } from "@/components/layout/AppPage";

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

function fmtTxnAmount(amount: number, currency: string) {
  const prefix = !["BTC", "ETH"].includes(currency) && currency !== "USDT" ? "$" : "";
  return `${prefix}${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

import { DualCurrencyValue } from "@/components/ui/DualCurrencyValue";

function fmtUsdKpi(n?: number, inr?: number) {
  return <DualCurrencyValue usd={n} inr={inr} />;
}

const ALLOCATION_LABEL_KEYS: Record<string, string> = {
  invested: "dashboard.invested",
  fiat: "dashboard.fiat",
  crypto: "dashboard.crypto",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [referralShareOpen, setReferralShareOpen] = useState(false);
  const [period, setPeriod] = useState<StatsPeriod>(defaultFinancePeriod());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [appliedCustom, setAppliedCustom] = useState({ from: customFrom, to: customTo });

  const periodQuery = appendPeriodQuery(
    "",
    period,
    period === "custom" ? appliedCustom.from : undefined,
    period === "custom" ? appliedCustom.to : undefined,
  );

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["/api/dashboard/summary", period, appliedCustom],
    queryFn: () => authFetchJson(`/dashboard/summary${periodQuery}`),
    ...financeQueryOptions,
  });
  const { data: chartData, isLoading: isLoadingChart } = useQuery({
    queryKey: ["/api/dashboard/portfolio-chart", period, appliedCustom],
    queryFn: () => authFetchJson(`/dashboard/portfolio-chart${periodQuery}`),
    ...financeQueryOptions,
  });
  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["/api/dashboard/recent-activity", period, appliedCustom],
    queryFn: () => authFetchJson(`/dashboard/recent-activity${periodQuery}`),
    ...financeQueryOptions,
  });
  const { data: monthlyReturns, isLoading: isLoadingMonthlyReturns } = ApiHooks.useGetMonthlyReturns({
    query: financeQueryOptions as any,
  });

  const useGetWallet = (ApiHooks as any).useGetWallet;
  const useGetReferralStats = (ApiHooks as any).useGetReferralStats;
  const useListNotifications = (ApiHooks as any).useListNotifications;

  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet
    ? useGetWallet({ query: financeQueryOptions as any })
    : { data: null, isLoading: false };
  const { data: referralStats } = useGetReferralStats ? useGetReferralStats() : { data: null };
  const { data: notifications } = useListNotifications ? useListNotifications() : { data: null };

  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length || 0;

  const summaryAny = summary as any;
  const fiatDual = formatWalletFiatDisplay(wallet);

  const totalPortfolio = summaryAny?.totalPortfolio ?? summaryAny?.totalBalance;
  const totalPortfolioInr = summaryAny?.totalPortfolioInr;
  const totalProfitInr = summaryAny?.totalProfitInr;
  const totalInvestedInr = summaryAny?.totalInvestedInr;
  const activeInvestedInr = summaryAny?.activeInvestedInr;

  const portfolioTrend = summaryAny?.monthPortfolioChangePct;
  const profitTrend = summaryAny?.monthProfitChangePct;
  const portfolioAllocation = summaryAny?.portfolioAllocation || [];

  const portfolioPie = portfolioAllocation.length > 0
    ? portfolioAllocation.map(({ label, value }: { label: string; value: number }) => ({
        name: t(ALLOCATION_LABEL_KEYS[label] || label, { defaultValue: label }),
        value,
        key: label,
      }))
    : [
        { name: t("dashboard.fiatUsdLabel"), value: Number(wallet?.fiatBalance || 0), key: "fiat" },
        { name: t("dashboard.crypto"), value: Number(wallet?.cryptoBalance || 0), key: "crypto" },
        { name: t("dashboard.invested"), value: Number(summaryAny?.activeInvested || 0), key: "invested" },
      ].filter(d => d.value > 0);

  const hasPortfolioData = portfolioPie.length > 0;
  const present = isPresentPeriod(period);
  const fiatBreakdown = mapFiatAuditToBreakdown(summaryAny?.fiatBalanceAudit, present);

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title={
        <div className="min-w-0 w-full max-w-full">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent break-words">
            {t("dashboard.welcomeBack", { name: user?.fullName?.split(" ")[0] || "" })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 w-full max-w-full whitespace-normal">
            {formatLocaleDate(new Date(), i18n.language)}
          </p>
        </div>
      }
      actions={
        <div className={cn("flex flex-row flex-wrap items-center gap-1.5 sm:gap-2 min-w-0")}>
          <WalletQuickActions layout="inline" compact />
          <DownloadAppButton compact />
          <ReferActionButton compact />
          {unreadCount > 0 && (
            <Link href="/notifications">
              <Button variant="outline" size="sm" className="h-8 sm:h-9 px-2.5 relative shrink-0">
                <Bell className="h-3.5 w-3.5" />
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              </Button>
            </Link>
          )}
        </div>
      }
    >
        {user?.kycStatus !== "verified" && (
          <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-yellow-600/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-full">
                    <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-600 dark:text-amber-400">{t("dashboard.completeKycTitle")}</h3>
                    <p className="text-xs text-muted-foreground">{t("dashboard.completeKycDesc")}</p>
                  </div>
                </div>
                <Link href="/kyc">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold">{t("dashboard.verifyNow")}</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
          <CardContent className="py-3 px-3 sm:px-4">
            <CalendarPeriodFilter
              period={period}
              customFrom={customFrom}
              customTo={customTo}
              periodLabel={summaryAny?.statsPeriodLabel}
              onPeriodChange={setPeriod}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
              onApplyCustom={() => setAppliedCustom({ from: customFrom, to: customTo })}
            />
          </CardContent>
        </Card>

        <PeriodFinanceKpiGrid
          loading={isLoadingSummary}
          data={{
            period,
            periodLabel: summaryAny?.statsPeriodLabel,
            fiatBalance: summaryAny?.fiatBalance,
            fiatBalanceInr: summaryAny?.fiatBalanceInr,
            periodInvested: summaryAny?.periodInvested ?? 0,
            periodInvestedInr: summaryAny?.periodInvestedInr,
            periodFiatDeposits: summaryAny?.periodFiatDeposits ?? summaryAny?.monthFiatDeposits,
            periodFiatWithdrawals: summaryAny?.periodFiatWithdrawals ?? summaryAny?.monthFiatWithdrawals,
            periodCryptoDeposits: summaryAny?.periodCryptoDeposits ?? summaryAny?.monthCryptoDeposits,
            periodCryptoWithdrawals: summaryAny?.periodCryptoWithdrawals ?? summaryAny?.monthCryptoWithdrawals,
            periodFiatDepositsInr: summaryAny?.periodFiatDepositsInr ?? summaryAny?.monthFiatDepositsInr,
            periodFiatWithdrawalsInr: summaryAny?.periodFiatWithdrawalsInr ?? summaryAny?.monthFiatWithdrawalsInr,
            periodCryptoDepositsInr: summaryAny?.periodCryptoDepositsInr ?? summaryAny?.monthCryptoDepositsInr,
            periodCryptoWithdrawalsInr: summaryAny?.periodCryptoWithdrawalsInr ?? summaryAny?.monthCryptoWithdrawalsInr,
            cryptoBalance: summaryAny?.cryptoBalance,
            cryptoBalanceInr: summaryAny?.cryptoBalance != null && summaryAny?.exchangeRates?.USD_INR
              ? Number(summaryAny.cryptoBalance) * Number(summaryAny.exchangeRates.USD_INR)
              : undefined,
            fiatBreakdown,
          }}
        />

        <p className="text-[11px] sm:text-xs text-muted-foreground text-center -mt-1 px-2 leading-relaxed break-words [overflow-wrap:break-word]">
          {t("dashboard.depositWithdrawalMonthNote", {
            defaultValue: "Approved deposit & withdrawal totals for {{period}} · USD equivalent",
            period: summaryAny?.statsPeriodLabel || t("dashboard.today", { defaultValue: "Today" }),
          })}
        </p>

        <InvestorKpiStrip
          t={t}
          isLoading={isLoadingSummary}
          totalPortfolio={totalPortfolio}
          totalPortfolioInr={totalPortfolioInr}
          walletBalance={summaryAny?.totalBalance ?? wallet?.totalBalance}
          activeInvested={summaryAny?.activeInvested}
          totalProfit={summaryAny?.totalProfit}
          totalProfitInr={totalProfitInr}
          totalInvested={summaryAny?.totalInvested}
          totalInvestedInr={totalInvestedInr}
          monthPortfolioChangePct={portfolioTrend}
          monthProfitChangePct={profitTrend}
          nextPayoutDate={summaryAny?.nextPayoutDate}
          nextPayoutAmountUsd={summaryAny?.nextPayoutAmountUsd}
          nextPayoutAmountInr={summaryAny?.nextPayoutAmountInr}
          nextPayoutPlanName={summaryAny?.nextPayoutPlanName}
          nextPayoutInvestmentId={summaryAny?.nextPayoutInvestmentId}
          nextPayoutDaysUntil={summaryAny?.nextPayoutDaysUntil}
        />

        {/* ── Top Stats ── */}
        <div className={APP_STAT_GRID}>
          <KpiStatCard
            label={t("dashboard.fiatBalance")}
            value={fmtUsdKpi(wallet?.fiatBalance, resolveWalletFiatInr(wallet))}
            loading={isLoadingWallet}
            icon={<Coins className="h-4 w-4" />}
            iconClassName="text-blue-600 dark:text-blue-400"
            compact
          />
          <KpiStatCard
            label={t("dashboard.activeInvestments")}
            value={summaryAny?.activeInvestments ?? "—"}
            loading={isLoadingSummary}
            icon={<Target className="h-4 w-4" />}
            iconClassName="text-amber-600 dark:text-amber-400"
            compact
          />
          <KpiStatCard
            label={t("dashboard.totalInvested")}
            value={fmtUsdKpi(summaryAny?.totalInvested, totalInvestedInr)}
            loading={isLoadingSummary}
            icon={<LineChart className="h-4 w-4" />}
            iconClassName="text-amber-600 dark:text-amber-400"
            compact
          />
          <KpiStatCard
            label={t("dashboard.referralEarnings")}
            value={fmtUsdKpi(referralStats?.totalEarnings ?? summaryAny?.referralEarnings)}
            icon={<Award className="h-4 w-4" />}
            iconClassName="text-purple-600 dark:text-purple-400"
            compact
          />
        </div>

        {/* ── Secondary Stats ── */}
        <div className={cn(APP_STAT_GRID, "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2")}>
          <Link href="/investments">
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-full min-w-0 overflow-hidden hover:border-amber-500/30 transition-colors cursor-pointer">
              <CardContent className="pt-4 px-3 pb-4 sm:pt-6 sm:px-6 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 min-w-0">{t("dashboard.activeInvestments")}</p>
                  <Target className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
                <div className="mobile-stat-value text-foreground">
                  {isLoadingSummary ? <Skeleton className="h-8 w-16" /> : (summaryAny?.activeInvestments || 0)}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground">
                    {t("dashboard.totalInvested")}:{" "}
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      ${Number(summaryAny?.totalInvested || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </p>
                  {totalInvestedInr !== undefined && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                      ₹{totalInvestedInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  {summaryAny?.activeInvested != null && summaryAny.activeInvested > 0 && (
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t("dashboard.activeInvested", { defaultValue: "Active principal" })}: ${Number(summaryAny.activeInvested).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      {activeInvestedInr !== undefined && ` · ₹${activeInvestedInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
          <div className="min-w-0">
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-full min-w-0 overflow-hidden">
              <CardContent className="pt-4 px-3 pb-4 sm:pt-6 sm:px-6 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <p className="text-[11px] sm:text-xs text-muted-foreground line-clamp-2 min-w-0">{t("dashboard.cryptoUsd")}</p>
                  <ArrowRightLeft className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                </div>
                <div className="mobile-stat-value text-foreground">
                  {isLoadingWallet ? <Skeleton className="h-8 w-20" /> : `$${Number(wallet?.cryptoBalance || 0).toLocaleString()}`}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[10px] sm:text-xs text-muted-foreground min-w-0">
                  <span className="truncate">BTC: <span className="text-orange-600 dark:text-orange-400">{wallet?.btcBalance?.toFixed(4) || "0"}</span></span>
                  <span className="truncate">ETH: <span className="text-blue-600 dark:text-blue-400">{wallet?.ethBalance?.toFixed(4) || "0"}</span></span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <LazyInvestorDashboardCharts
          t={t}
          chartData={chartData as { date: string; value: number }[] | undefined}
          isLoadingChart={isLoadingChart}
          portfolioPie={portfolioPie}
          hasPortfolioData={hasPortfolioData}
          isLoadingWallet={isLoadingWallet}
          isLoadingSummary={isLoadingSummary}
          monthlyReturns={monthlyReturns as any}
          isLoadingMonthlyReturns={isLoadingMonthlyReturns}
          portfolioAllocation={portfolioAllocation}
        />

        {/* ── Wallet Overview ── */}
        <div className={cn(APP_DASHBOARD_SPLIT, "lg:grid-cols-1")}>
          <Card className="lg:col-span-3 bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 min-w-0 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">{t("dashboard.walletBalances")}</CardTitle>
                <Link href="/money">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">{t("common.manage")} →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: "$", label: t("dashboard.usdFiat"), sub: t("common.primary"), val: fiatDual.primary, subVal: fiatDual.secondary, color: "bg-blue-500/20 text-blue-600 dark:text-blue-400" },
                { icon: "₿", label: t("dashboard.bitcoin"), sub: "BTC", val: `${wallet?.btcBalance?.toFixed(6) || "0"} BTC`, color: "bg-orange-500/20 text-orange-600 dark:text-orange-400" },
                { icon: "Ξ", label: t("dashboard.ethereum"), sub: "ETH", val: `${wallet?.ethBalance?.toFixed(4) || "0"} ETH`, color: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400" },
                { icon: "₮", label: t("dashboard.tether"), sub: "USDT", val: `$${Number(wallet?.usdtBalance || 0).toLocaleString()}`, color: "bg-green-500/20 text-green-700 dark:text-green-400" },
              ].map(({ icon, label, sub, val, subVal, color }) => (
                <div key={label} className="flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border/80 dark:border-white/5 hover:border-border dark:border-white/10 transition-colors min-w-0 overflow-hidden">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center font-bold text-sm shrink-0`}>{icon}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{sub}</p>
                    </div>
                  </div>
                  <div className="text-right min-w-0 shrink max-w-[55%]">
                    <p className="mobile-stat-value text-sm sm:text-base font-bold">{val}</p>
                    {subVal && <p className="kpi-currency-secondary">{subVal}</p>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Activity + Quick Actions ── */}
        <div className={APP_DASHBOARD_SPLIT}>
          {/* Recent Activity */}
          <Card className={cn(APP_DASHBOARD_MAIN, "bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10")}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base font-bold flex items-center gap-2 min-w-0">
                  <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span className="truncate">{t("dashboard.recentActivity")}</span>
                </CardTitle>
                <Link href="/transactions">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs shrink-0">{t("common.viewAll")} →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="min-w-0">
              {isLoadingActivity ? (
                <Skeleton className="h-40 w-full" />
              ) : Array.isArray(activity) && activity.length > 0 ? (
                <ResponsiveDataView
                  caption={t("dashboard.recentActivity")}
                  data={activity as any[]}
                  rowKey={(item: any) => item.id}
                  columns={[
                    {
                      key: "id",
                      header: t("dashboard.txnId"),
                      mobileTitle: true,
                      cell: (item: any) => (
                        <span className="font-mono text-muted-foreground text-xs">#{item.transactionId ?? item.id}</span>
                      ),
                    },
                    {
                      key: "date",
                      header: t("common.date"),
                      hideOnMobile: true,
                      cell: (item: any) => (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm")}
                        </span>
                      ),
                    },
                    {
                      key: "type",
                      header: t("common.type"),
                      cell: (item: any) => {
                        const isDeposit = item.type === "deposit";
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1 text-xs capitalize font-medium",
                            isDeposit ? "text-green-700 dark:text-green-400" : "text-red-400",
                          )}>
                            {isDeposit ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                            {translateStatus(t, item.type)}
                          </span>
                        );
                      },
                    },
                    {
                      key: "amount",
                      header: t("common.amount"),
                      headerClassName: "text-right",
                      cellClassName: "text-right",
                      cell: (item: any) => {
                        const isDeposit = item.type === "deposit";
                        return (
                          <span className={cn(
                            "text-sm font-semibold tabular-nums",
                            isDeposit ? "text-green-700 dark:text-green-400" : "text-red-400",
                          )}>
                            {fmtTxnAmount(item.amount, item.currency)}
                          </span>
                        );
                      },
                    },
                    {
                      key: "status",
                      header: t("common.status"),
                      cell: (item: any) => (
                        <Badge className={cn(
                          "text-[10px] border capitalize",
                          STATUS_BADGE[item.status] || "bg-muted dark:bg-white/10 text-zinc-400 border-border dark:border-white/10",
                        )}>
                          {translateStatus(t, item.status)}
                        </Badge>
                      ),
                    },
                  ]}
                  mobileHeader={(item: any) => (
                    <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                      <p className="text-[11px] font-mono text-muted-foreground truncate">#{item.transactionId ?? item.id}</p>
                      <Badge className={cn(
                        "text-[10px] border capitalize shrink-0",
                        STATUS_BADGE[item.status] || "bg-muted dark:bg-white/10 text-zinc-400 border-border dark:border-white/10",
                      )}>
                        {translateStatus(t, item.status)}
                      </Badge>
                    </div>
                  )}
                  mobileFooter={(item: any) => (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {format(new Date(item.createdAt), "dd/MM/yyyy · HH:mm")}
                    </p>
                  )}
                />
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{t("dashboard.noActivity")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions + Investment Summary */}
          <div className="space-y-4">
            <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">{t("dashboard.quickActions")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4 min-w-0">
                <TradingQuickActions />
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border-amber-500/20">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{t("dashboard.referralProgram")}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:gap-3 text-center min-w-0">
                  <div className="p-2 rounded-lg bg-muted/60 dark:bg-white/5 min-w-0 overflow-hidden">
                    <p className="mobile-stat-value text-foreground">{user?.referralCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{t("common.referrals")}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/60 dark:bg-white/5 min-w-0 overflow-hidden">
                    <p className="mobile-stat-value text-amber-600 dark:text-amber-400">${Number((referralStats?.totalEarnings ?? summaryAny?.referralEarnings ?? user?.referralEarnings) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{t("common.earned")}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold text-xs"
                  onClick={() => setReferralShareOpen(true)}
                  disabled={!(user as any)?.referralCode}
                >
                  {t("dashboard.shareReferralLink")}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <ReferralShareDialog
          open={referralShareOpen}
          onOpenChange={setReferralShareOpen}
          referralCode={(user as any)?.referralCode || ""}
          inviterName={getShareUserDisplayName(user)}
          avatarUrl={user?.avatarUrl}
        />
    </AppPage>
);
}
