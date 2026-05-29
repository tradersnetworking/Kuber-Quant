import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveExchangeRates } from "@/hooks/use-live-exchange-rates";
import { usdToInrEstimate } from "@/lib/live-exchange-rates";
import { formatInrAmount } from "@/lib/format-money";
import { STAFF_STAT_GRID, STAFF_STAT_GRID_DENSE, STAFF_CARD, STAFF_TOOLBAR_ROW } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { PeriodFinanceKpiGrid } from "@/components/finance/PeriodFinanceKpiGrid";
import {
  buildStatsQuery,
  isPresentPeriod,
  periodMetricLabel,
  type StatsPeriod,
} from "@/lib/finance-period";

export type { StatsPeriod };
export { buildStatsQuery };

export type FiatBalanceAudit = {
  availableBalance?: number;
  periodNetFlow?: number;
  periodDeposits?: number;
  periodWithdrawals?: number;
  periodMaturityProfits?: number;
  periodPeriodicProfits?: number;
  periodInvestmentOut?: number;
  cumulativeDeposits?: number;
  cumulativeWithdrawals?: number;
  cumulativeMaturityProfits?: number;
  cumulativePeriodicProfits?: number;
  cumulativeInvestmentOut?: number;
  computedBalance?: number;
  drift?: number;
  investorCount?: number;
  ledgerBackedInvestors?: number;
  source?: "ledger" | "mixed";
  asOf?: string;
};

export type PlatformStats = {
  period?: StatsPeriod;
  periodLabel?: string;
  platformFiatBalance?: number;
  platformFiatBalanceInr?: number;
  platformCryptoBalance?: number;
  platformCryptoBalanceInr?: number;
  activeInvested?: number;
  activeInvestedInr?: number;
  walletAvailable?: number;
  walletAvailableInr?: number;
  totalAssets?: number;
  totalAssetsInr?: number;
  fiatBalanceAudit?: FiatBalanceAudit;
  ledgerAudit?: {
    fiat?: FiatBalanceAudit;
    crypto?: { availableBalance?: number; drift?: number; cumulativeDeposits?: number; cumulativeWithdrawals?: number };
    present?: {
      availableFiat?: number;
      availableCrypto?: number;
      activeInvested?: number;
      walletAvailable?: number;
      totalAssets?: number;
      activeInvestmentCount?: number;
      fiatBreakdown?: {
        deposits?: number;
        withdrawals?: number;
        maturityProfits?: number;
        periodicProfits?: number;
        investmentOut?: number;
        availableLedger?: number;
        computedAvailable?: number;
        drift?: number;
      };
      cryptoBreakdown?: {
        deposits?: number;
        withdrawals?: number;
        availableLedger?: number;
        computedAvailable?: number;
        drift?: number;
      };
    };
  };
  totalDeposits?: number;
  totalWithdrawals?: number;
  netFunds?: number;
  totalFiatDeposits?: number;
  totalFiatWithdrawals?: number;
  totalCryptoDeposits?: number;
  totalCryptoWithdrawals?: number;
  totalInvestments?: number;
  totalUsers?: number;
  managers?: number;
  supportAgents?: number;
  investors?: number;
  pendingTransactions?: number;
  pendingKyc?: number;
  openTickets?: number;
  activeInvestmentCount?: number;
  activeEASubscriptions?: number;
  activeAlgoSubscriptions?: number;
  todayLabel?: string;
  todayPaymentsUsd?: number;
  todayPaymentsInr?: number;
  todayWithdrawalRequestsUsd?: number;
  todayWithdrawalRequestsCount?: number;
  todayMaturityPayoutsUsd?: number;
  todayMaturityCount?: number;
  exchangeRates?: {
    USD_INR?: number;
    updatedAt?: string | null;
    source?: string;
  };
};

function fmtUsd(n?: number | null) {
  if (n == null || Number.isNaN(Number(n))) return undefined;
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function resolvePlatformBalance(
  primary?: number | null,
  ...fallbacks: Array<number | null | undefined>
): number | undefined {
  if (primary != null && Number.isFinite(Number(primary))) return Number(primary);
  for (const value of fallbacks) {
    if (value != null && Number.isFinite(Number(value))) return Number(value);
  }
  return primary === 0 ? 0 : undefined;
}

type StatCard = {
  label: string;
  value?: string | number;
  inrValue?: string;
  sub?: string;
  color: string;
  accent?: string;
};

type Props = {
  stats: PlatformStats | null;
  loading: boolean;
  period: StatsPeriod;
  customFrom: string;
  customTo: string;
  onPeriodChange: (period: StatsPeriod) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onApplyCustom: () => void;
};

export function SuperAdminPlatformStatsPanel({
  stats,
  loading,
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
}: Props) {
  const { data: liveRates } = useLiveExchangeRates();
  const usdInr = stats?.exchangeRates?.USD_INR ?? liveRates?.USD_INR;
  const periodLabel = stats?.periodLabel || "Present";
  const present = isPresentPeriod(period) || periodLabel === "Present";
  const audit = stats?.fiatBalanceAudit ?? stats?.ledgerAudit?.fiat;
  const cryptoAudit = stats?.ledgerAudit?.crypto;
  const auditDrift = Math.max(
    audit?.drift != null ? Math.abs(audit.drift) : 0,
    cryptoAudit?.drift != null ? Math.abs(cryptoAudit.drift) : 0,
  );
  const showDriftWarning = auditDrift > 0.01;

  const platformFiatBalance = resolvePlatformBalance(
    stats?.platformFiatBalance,
    stats?.ledgerAudit?.present?.availableFiat,
    audit?.availableBalance,
  );
  const platformCryptoBalance = resolvePlatformBalance(
    stats?.platformCryptoBalance,
    stats?.ledgerAudit?.present?.availableCrypto,
    cryptoAudit?.availableBalance,
  );

  const auditSummary = present && audit
    ? `Present · Fiat available ${fmtUsd(platformFiatBalance) ?? "—"} (deposits ${fmtUsd(audit.cumulativeDeposits) ?? "—"} − withdrawals ${fmtUsd(audit.cumulativeWithdrawals) ?? "—"} + maturity profit ${fmtUsd(audit.cumulativeMaturityProfits) ?? "—"}) · Crypto available ${fmtUsd(platformCryptoBalance) ?? "—"} · Active invested ${fmtUsd(stats?.activeInvested) ?? "—"}`
    : audit
      ? `${periodLabel}: Deposits ${fmtUsd(audit.periodDeposits) ?? "—"} + Maturity profit ${fmtUsd(audit.periodMaturityProfits) ?? "—"} − Withdrawals ${fmtUsd(audit.periodWithdrawals) ?? "—"} = Net ${fmtUsd(audit.periodNetFlow) ?? "—"} · Available (ledger) ${fmtUsd(audit.availableBalance) ?? "—"}`
      : undefined;

  const inrForUsd = (usd?: number | null) => {
    if (usd == null || !usdInr) return undefined;
    return `₹${formatInrAmount(usdToInrEstimate(Number(usd), usdInr))}`;
  };

  const todaySub = stats
    ? [
        stats.todayWithdrawalRequestsCount
          ? `${stats.todayWithdrawalRequestsCount} withdrawal request${stats.todayWithdrawalRequestsCount === 1 ? "" : "s"} (${fmtUsd(stats.todayWithdrawalRequestsUsd) ?? "—"})`
          : null,
        stats.todayMaturityCount
          ? `${stats.todayMaturityCount} plan maturit${stats.todayMaturityCount === 1 ? "y" : "ies"} (${fmtUsd(stats.todayMaturityPayoutsUsd) ?? "—"})`
          : null,
      ].filter(Boolean).join(" · ") || "No withdrawal requests or maturities today"
    : undefined;

  const statCards: StatCard[] = [
    {
      label: "Today's Payments",
      value: fmtUsd(stats?.todayPaymentsUsd ?? 0),
      inrValue: stats?.todayPaymentsInr != null
        ? `₹${formatInrAmount(stats.todayPaymentsInr)}`
        : inrForUsd(stats?.todayPaymentsUsd),
      sub: todaySub,
      color: "text-rose-600 dark:text-rose-400",
      accent: "border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-orange-500/5",
    },
    { label: periodMetricLabel(periodLabel, "Platform Deposits"), value: fmtUsd(stats?.totalDeposits), inrValue: inrForUsd(stats?.totalDeposits), color: "text-emerald-600 dark:text-emerald-400" },
    { label: periodMetricLabel(periodLabel, "Fiat Deposits"), value: fmtUsd(stats?.totalFiatDeposits), inrValue: inrForUsd(stats?.totalFiatDeposits), color: "text-green-700 dark:text-green-400" },
    { label: periodMetricLabel(periodLabel, "Crypto Deposits"), value: fmtUsd(stats?.totalCryptoDeposits), inrValue: inrForUsd(stats?.totalCryptoDeposits), color: "text-lime-600 dark:text-lime-400" },
    { label: periodMetricLabel(periodLabel, "Fiat Withdrawals"), value: fmtUsd(stats?.totalFiatWithdrawals), inrValue: inrForUsd(stats?.totalFiatWithdrawals), color: "text-orange-600 dark:text-orange-400" },
    { label: periodMetricLabel(periodLabel, "Crypto Withdrawals"), value: fmtUsd(stats?.totalCryptoWithdrawals), inrValue: inrForUsd(stats?.totalCryptoWithdrawals), color: "text-amber-600 dark:text-amber-400" },
    { label: periodMetricLabel(periodLabel, "Invested"), value: fmtUsd(stats?.totalInvestments), inrValue: inrForUsd(stats?.totalInvestments), color: "text-yellow-600 dark:text-yellow-400" },
    { label: periodMetricLabel(periodLabel, "Net Funds"), value: fmtUsd(stats?.netFunds), inrValue: inrForUsd(stats?.netFunds), color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Total Users", value: stats?.totalUsers, color: "text-blue-600 dark:text-blue-400" },
    { label: "Managers", value: stats?.managers, color: "text-cyan-600 dark:text-cyan-400" },
    { label: "Support Team", value: stats?.supportAgents, color: "text-rose-600 dark:text-rose-400" },
    { label: "Investors", value: stats?.investors, color: "text-purple-600 dark:text-purple-400" },
    { label: "Pending Txns", value: stats?.pendingTransactions, color: "text-orange-600 dark:text-orange-400" },
    { label: "Pending KYC", value: stats?.pendingKyc, color: "text-teal-600 dark:text-teal-400" },
    { label: "Open Tickets", value: stats?.openTickets, color: "text-rose-600 dark:text-rose-400" },
    { label: "Active Investments", value: stats?.activeInvestmentCount, color: "text-yellow-600 dark:text-yellow-400" },
    { label: "Active EA Subs", value: stats?.activeEASubscriptions, color: "text-indigo-600 dark:text-indigo-400" },
    { label: "Active Algo Subs", value: stats?.activeAlgoSubscriptions, color: "text-violet-600 dark:text-violet-400" },
  ];

  return (
    <div className="space-y-4">
      <div className={cn(STAFF_TOOLBAR_ROW, "gap-3 rounded-xl border border-border dark:border-white/10 bg-muted/50 dark:bg-white/[0.03] p-4")}>
        <CalendarPeriodFilter
          period={period}
          customFrom={customFrom}
          customTo={customTo}
          periodLabel={periodLabel}
          onPeriodChange={onPeriodChange}
          onCustomFromChange={onCustomFromChange}
          onCustomToChange={onCustomToChange}
          onApplyCustom={onApplyCustom}
        />
      </div>

      <PeriodFinanceKpiGrid
        variant="staff"
        loading={loading}
        data={{
          period,
          periodLabel,
          fiatBalance: platformFiatBalance,
          fiatBalanceInr: stats?.platformFiatBalanceInr ?? (platformFiatBalance != null && usdInr
            ? usdToInrEstimate(platformFiatBalance, usdInr)
            : undefined),
          cryptoBalance: platformCryptoBalance,
          cryptoBalanceInr: stats?.platformCryptoBalanceInr ?? (platformCryptoBalance != null && usdInr
            ? usdToInrEstimate(platformCryptoBalance, usdInr)
            : undefined),
          periodInvested: stats?.activeInvested ?? stats?.totalInvestments,
          periodInvestedInr: stats?.activeInvestedInr ?? (stats?.totalInvestments != null && usdInr
            ? usdToInrEstimate(stats.totalInvestments, usdInr)
            : undefined),
          periodFiatDeposits: stats?.totalFiatDeposits,
          periodFiatWithdrawals: stats?.totalFiatWithdrawals,
          periodCryptoDeposits: stats?.totalCryptoDeposits,
          periodCryptoWithdrawals: stats?.totalCryptoWithdrawals,
          periodFiatDepositsInr: stats?.totalFiatDeposits != null && usdInr
            ? usdToInrEstimate(stats.totalFiatDeposits, usdInr)
            : undefined,
          periodFiatWithdrawalsInr: stats?.totalFiatWithdrawals != null && usdInr
            ? usdToInrEstimate(stats.totalFiatWithdrawals, usdInr)
            : undefined,
          periodCryptoDepositsInr: stats?.totalCryptoDeposits != null && usdInr
            ? usdToInrEstimate(stats.totalCryptoDeposits, usdInr)
            : undefined,
          periodCryptoWithdrawalsInr: stats?.totalCryptoWithdrawals != null && usdInr
            ? usdToInrEstimate(stats.totalCryptoWithdrawals, usdInr)
            : undefined,
          walletAvailable: stats?.walletAvailable,
          walletAvailableInr: stats?.walletAvailableInr,
          totalAssets: stats?.totalAssets,
          totalAssetsInr: stats?.totalAssetsInr,
          fiatBreakdown: stats?.ledgerAudit?.present?.fiatBreakdown,
          cryptoBreakdown: stats?.ledgerAudit?.present?.cryptoBreakdown,
        }}
      />

      {(auditSummary || showDriftWarning) && (
        <div className={cn(
          "rounded-lg border px-3 py-2 text-[11px] sm:text-xs space-y-1",
          showDriftWarning
            ? "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200"
            : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] text-muted-foreground",
        )}>
          {auditSummary && <p>{auditSummary}</p>}
          {audit && (
            <p>
              Ledger audit ({present ? "Present · all-time flows" : periodLabel}): {audit.ledgerBackedInvestors ?? 0}/{audit.investorCount ?? 0} investors ·
              Fiat: deposits {fmtUsd(audit.cumulativeDeposits) ?? "—"} + maturity profits {fmtUsd(audit.cumulativeMaturityProfits) ?? "—"} + periodic profits {fmtUsd(audit.cumulativePeriodicProfits) ?? "—"} − withdrawals {fmtUsd(audit.cumulativeWithdrawals) ?? "—"} − invested out {fmtUsd(audit.cumulativeInvestmentOut) ?? "—"}
              {cryptoAudit && (
                <> · Crypto: deposits {fmtUsd(cryptoAudit.cumulativeDeposits) ?? "—"} − withdrawals {fmtUsd(cryptoAudit.cumulativeWithdrawals) ?? "—"}</>
              )}
              {audit.source === "mixed" ? " · Some accounts use balance fallback (no ledger)" : " · Source: immutable wallet ledger"}
            </p>
          )}
          {showDriftWarning && audit && (
            <p className="font-medium">
              Reconciliation drift detected: {fmtUsd(audit.drift)} (computed {fmtUsd(audit.computedBalance)} vs available {fmtUsd(audit.availableBalance)}). Run reconciliation from Treasury.
            </p>
          )}
        </div>
      )}

      <div className={STAFF_STAT_GRID_DENSE}>
        {statCards.map(s => (
          <Card key={s.label} className={cn(STAFF_CARD, s.accent)}>
            <CardContent className="p-3 sm:p-4 min-w-0">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <p className={cn("kpi-finance-value", s.color)}>{s.value ?? "—"}</p>
                  {s.inrValue && (
                    <p className={cn("kpi-finance-inr", s.color, "opacity-80")}>{s.inrValue}</p>
                  )}
                  {s.sub && (
                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 break-words">{s.sub}</p>
                  )}
                </>
              )}
              <p className="mobile-label-safe text-muted-foreground mt-1.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
