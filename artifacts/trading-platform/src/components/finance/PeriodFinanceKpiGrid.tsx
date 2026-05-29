import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { DualCurrencyValue } from "@/components/ui/DualCurrencyValue";
import { APP_STAT_GRID } from "@/lib/ui-system";
import { STAFF_STAT_GRID } from "@/lib/staff-dashboard-ui";
import {
  ArrowDownLeft, ArrowUpRight, Coins, LineChart, Wallet, Bitcoin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isPresentPeriod, periodMetricLabel, type StatsPeriod } from "@/lib/finance-period";

export type PresentWalletBreakdown = {
  availableLedger?: number;
  deposits?: number;
  withdrawals?: number;
  maturityProfits?: number;
  periodicProfits?: number;
  investmentOut?: number;
  investmentReturns?: number;
  adjustments?: number;
  computedAvailable?: number;
  drift?: number;
};

export type PeriodFinanceKpiValues = {
  periodLabel?: string;
  period?: string;
  fiatBalance?: number;
  fiatBalanceInr?: number;
  cryptoBalance?: number;
  cryptoBalanceInr?: number;
  fiatBreakdown?: PresentWalletBreakdown;
  cryptoBreakdown?: PresentWalletBreakdown;
  periodInvested?: number;
  periodInvestedInr?: number;
  periodFiatDeposits?: number;
  periodFiatDepositsInr?: number;
  periodFiatWithdrawals?: number;
  periodFiatWithdrawalsInr?: number;
  periodCryptoDeposits?: number;
  periodCryptoDepositsInr?: number;
  periodCryptoWithdrawals?: number;
  periodCryptoWithdrawalsInr?: number;
  walletAvailable?: number;
  walletAvailableInr?: number;
  totalAssets?: number;
  totalAssetsInr?: number;
};

type Props = {
  data?: PeriodFinanceKpiValues | null;
  loading?: boolean;
  className?: string;
  compact?: boolean;
  fiatBalanceLabel?: string;
  /** Staff dashboards: show Present snapshot + ledger-audited flows. */
  variant?: "investor" | "staff";
};

function fmtUsd(n?: number) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Treat missing/NaN finance metrics as zero once data has loaded. */
function financeUsd(n?: number | null): number | undefined {
  if (n == null || Number.isNaN(Number(n))) return 0;
  return Number(n);
}

function fmtInr(n?: number) {
  if (n == null || Number.isNaN(Number(n))) return null;
  return `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtUsdShort(n?: number) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function presentFiatAuditSub(b?: PresentWalletBreakdown): string | undefined {
  if (!b) return "Ledger: deposits − withdrawals + maturity profit";
  const parts = [
    `Deposits ${fmtUsdShort(b.deposits)}`,
    `Withdrawals ${fmtUsdShort(b.withdrawals)}`,
    `Maturity profit ${fmtUsdShort(b.maturityProfits)}`,
  ];
  if (b.periodicProfits && b.periodicProfits > 0) parts.push(`Periodic ROI ${fmtUsdShort(b.periodicProfits)}`);
  if (b.investmentOut && b.investmentOut > 0) parts.push(`Invested out ${fmtUsdShort(b.investmentOut)}`);
  return `${parts.join(" · ")} · Ledger audited`;
}

function presentCryptoAuditSub(b?: PresentWalletBreakdown): string | undefined {
  if (!b) return "Ledger: crypto deposits − withdrawals";
  return `Deposits ${fmtUsdShort(b.deposits)} · Withdrawals ${fmtUsdShort(b.withdrawals)} · Ledger audited`;
}

/** Map dashboard / API fiat audit fields to KPI breakdown subtitles. */
export function mapFiatAuditToBreakdown(
  audit?: {
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
    availableBalance?: number;
    computedBalance?: number;
    drift?: number;
  } | null,
  present?: boolean,
): PresentWalletBreakdown | undefined {
  if (!audit) return undefined;
  if (present) {
    return {
      deposits: audit.cumulativeDeposits,
      withdrawals: audit.cumulativeWithdrawals,
      maturityProfits: audit.cumulativeMaturityProfits,
      periodicProfits: audit.cumulativePeriodicProfits,
      investmentOut: audit.cumulativeInvestmentOut,
      availableLedger: audit.availableBalance,
      computedAvailable: audit.computedBalance,
      drift: audit.drift,
    };
  }
  return {
    deposits: audit.periodDeposits,
    withdrawals: audit.periodWithdrawals,
    maturityProfits: audit.periodMaturityProfits,
    periodicProfits: audit.periodPeriodicProfits,
    investmentOut: audit.periodInvestmentOut,
    availableLedger: audit.availableBalance,
    computedAvailable: audit.computedBalance,
    drift: audit.drift,
  };
}

function kpiGridClass(variant: "investor" | "staff", className?: string) {
  return cn(variant === "staff" ? STAFF_STAT_GRID : APP_STAT_GRID, className);
}

type FinanceKpiTone = {
  valueClass: string;
  inrClass: string;
  cardAccent: string;
  iconClass: string;
  iconWrap: string;
};

const FINANCE_KPI_TONES = {
  fiatAvailable: {
    valueClass: "text-blue-600 dark:text-blue-400",
    inrClass: "text-blue-600/80 dark:text-blue-400/80",
    cardAccent: "border-blue-500/30 bg-gradient-to-br from-blue-500/12 to-cyan-500/5",
    iconClass: "text-blue-600 dark:text-blue-400",
    iconWrap: "bg-blue-500/15",
  },
  cryptoAvailable: {
    valueClass: "text-violet-600 dark:text-violet-400",
    inrClass: "text-violet-600/80 dark:text-violet-400/80",
    cardAccent: "border-violet-500/30 bg-gradient-to-br from-violet-500/12 to-purple-500/5",
    iconClass: "text-violet-600 dark:text-violet-400",
    iconWrap: "bg-violet-500/15",
  },
  invested: {
    valueClass: "text-amber-600 dark:text-amber-400",
    inrClass: "text-amber-600/80 dark:text-amber-400/80",
    cardAccent: "border-amber-500/30 bg-gradient-to-br from-amber-500/12 to-yellow-500/5",
    iconClass: "text-amber-600 dark:text-amber-400",
    iconWrap: "bg-amber-500/15",
  },
  fiatDeposits: {
    valueClass: "text-emerald-600 dark:text-emerald-400",
    inrClass: "text-emerald-600/80 dark:text-emerald-400/80",
    cardAccent: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/12 to-green-500/5",
    iconClass: "text-emerald-600 dark:text-emerald-400",
    iconWrap: "bg-emerald-500/15",
  },
  fiatWithdrawals: {
    valueClass: "text-orange-600 dark:text-orange-400",
    inrClass: "text-orange-600/80 dark:text-orange-400/80",
    cardAccent: "border-orange-500/30 bg-gradient-to-br from-orange-500/12 to-amber-500/5",
    iconClass: "text-orange-600 dark:text-orange-400",
    iconWrap: "bg-orange-500/15",
  },
  cryptoDeposits: {
    valueClass: "text-lime-600 dark:text-lime-400",
    inrClass: "text-lime-600/80 dark:text-lime-400/80",
    cardAccent: "border-lime-500/30 bg-gradient-to-br from-lime-500/12 to-green-500/5",
    iconClass: "text-lime-600 dark:text-lime-400",
    iconWrap: "bg-lime-500/15",
  },
  cryptoWithdrawals: {
    valueClass: "text-rose-600 dark:text-rose-400",
    inrClass: "text-rose-600/80 dark:text-rose-400/80",
    cardAccent: "border-rose-500/30 bg-gradient-to-br from-rose-500/12 to-orange-500/5",
    iconClass: "text-rose-600 dark:text-rose-400",
    iconWrap: "bg-rose-500/15",
  },
} satisfies Record<string, FinanceKpiTone>;

function KpiCell({
  label,
  usd,
  inr,
  sub,
  icon,
  tone,
  loading,
  compact,
}: {
  label: string;
  usd?: number;
  inr?: number;
  sub?: string;
  icon: React.ReactNode;
  tone: FinanceKpiTone;
  loading?: boolean;
  compact?: boolean;
}) {
  const value = usd != null ? (
    <DualCurrencyValue usd={usd} inr={inr ?? undefined} finance usdClassName={tone.valueClass} inrClassName={tone.inrClass} />
  ) : "—";

  return (
    <KpiStatCard
      label={label}
      value={value}
      sub={sub}
      icon={icon}
      iconClassName={tone.iconClass}
      iconWrapClassName={tone.iconWrap}
      valueClassName={tone.valueClass}
      cardClassName={tone.cardAccent}
      loading={loading}
      compact={compact}
      finance
    />
  );
}

export function PeriodFinanceKpiGrid({
  data,
  loading,
  className,
  compact,
  fiatBalanceLabel,
  variant = "investor",
}: Props) {
  const periodLabel = data?.periodLabel || "Today";
  const present = isPresentPeriod(data?.period as StatsPeriod | undefined) || periodLabel === "Present";
  const normalized = loading ? data : data ? {
    ...data,
    fiatBalance: financeUsd(data.fiatBalance),
    cryptoBalance: data.cryptoBalance != null ? financeUsd(data.cryptoBalance) : data.cryptoBalance,
    periodInvested: financeUsd(data.periodInvested),
    periodFiatDeposits: financeUsd(data.periodFiatDeposits),
    periodFiatWithdrawals: financeUsd(data.periodFiatWithdrawals),
    periodCryptoDeposits: financeUsd(data.periodCryptoDeposits),
    periodCryptoWithdrawals: financeUsd(data.periodCryptoWithdrawals),
  } : data;
  const metrics = normalized ?? data;

  if (variant === "staff" && present) {
    const items = [
      {
        label: "Present Fiat Available",
        usd: metrics?.fiatBalance,
        inr: metrics?.fiatBalanceInr,
        sub: presentFiatAuditSub(metrics?.fiatBreakdown),
        icon: <Wallet className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.fiatAvailable,
      },
      {
        label: "Present Crypto Available",
        usd: metrics?.cryptoBalance,
        inr: metrics?.cryptoBalanceInr,
        sub: presentCryptoAuditSub(metrics?.cryptoBreakdown),
        icon: <Bitcoin className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.cryptoAvailable,
      },
      {
        label: "Present Active Invested",
        usd: metrics?.periodInvested,
        inr: metrics?.periodInvestedInr,
        sub: "Principal deployed in active plans (credited to wallet on maturity)",
        icon: <LineChart className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.invested,
      },
      {
        label: periodMetricLabel(periodLabel, "Fiat Deposits"),
        usd: metrics?.periodFiatDeposits,
        inr: metrics?.periodFiatDepositsInr,
        icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.fiatDeposits,
      },
      {
        label: periodMetricLabel(periodLabel, "Fiat Withdrawals"),
        usd: metrics?.periodFiatWithdrawals,
        inr: metrics?.periodFiatWithdrawalsInr,
        icon: <ArrowUpRight className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.fiatWithdrawals,
      },
      {
        label: periodMetricLabel(periodLabel, "Crypto Deposits"),
        usd: metrics?.periodCryptoDeposits,
        inr: metrics?.periodCryptoDepositsInr,
        icon: <Coins className="h-3.5 w-3.5" />,
        tone: FINANCE_KPI_TONES.cryptoDeposits,
      },
    ];

    return (
      <div className="space-y-3 min-w-0">
        <div className={kpiGridClass("staff", className)}>
          {items.map(item => (
            <KpiCell key={item.label} {...item} loading={loading} compact={compact} />
          ))}
        </div>
        {(data?.walletAvailable != null || data?.totalAssets != null) && (
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground px-1">
            {data.walletAvailable != null && (
              <div className="min-w-0">
                <span className="text-muted-foreground">Present wallet available: </span>
                <DualCurrencyValue usd={data.walletAvailable} inr={data.walletAvailableInr} finance className="inline-flex" />
              </div>
            )}
            {data.totalAssets != null && (
              <div className="min-w-0">
                <span className="text-muted-foreground">Total assets (wallet + active invested): </span>
                <DualCurrencyValue usd={data.totalAssets} inr={data.totalAssetsInr} finance className="inline-flex" />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const fiatSub = present ? presentFiatAuditSub(metrics?.fiatBreakdown) : undefined;
  const investedSub = present
    ? "Principal deployed in active plans (credited to wallet on maturity)"
    : "New investment outflows in this period (active principal shown in portfolio strip below)";
  const cryptoSub = present
    ? (presentCryptoAuditSub(metrics?.cryptoBreakdown)
      ?? (metrics?.periodCryptoDeposits != null || metrics?.periodCryptoWithdrawals != null
        ? `Deposits ${fmtUsdShort(metrics?.periodCryptoDeposits)} · Withdrawals ${fmtUsdShort(metrics?.periodCryptoWithdrawals)}`
        : undefined))
    : undefined;

  const items = [
    {
      label: fiatBalanceLabel ?? (present ? "Present Fiat Balance" : periodLabel === "Today" ? "Today Fiat Balance" : "Fiat Balance"),
      usd: metrics?.fiatBalance,
      inr: metrics?.fiatBalanceInr,
      sub: fiatSub,
      icon: <Wallet className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.fiatAvailable,
    },
    ...(present && metrics?.cryptoBalance != null ? [{
      label: "Present Crypto Balance",
      usd: metrics.cryptoBalance,
      inr: metrics.cryptoBalanceInr,
      sub: cryptoSub,
      icon: <Bitcoin className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.cryptoAvailable,
    }] : []),
    {
      label: present ? "Present Active Invested" : periodMetricLabel(periodLabel, "Invested"),
      usd: metrics?.periodInvested,
      inr: metrics?.periodInvestedInr,
      sub: investedSub,
      icon: <LineChart className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.invested,
    },
    {
      label: periodMetricLabel(periodLabel, "Fiat Deposits"),
      usd: metrics?.periodFiatDeposits,
      inr: metrics?.periodFiatDepositsInr,
      icon: <ArrowDownLeft className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.fiatDeposits,
    },
    {
      label: periodMetricLabel(periodLabel, "Fiat Withdrawals"),
      usd: metrics?.periodFiatWithdrawals,
      inr: metrics?.periodFiatWithdrawalsInr,
      icon: <ArrowUpRight className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.fiatWithdrawals,
    },
    {
      label: periodMetricLabel(periodLabel, "Crypto Deposits"),
      usd: metrics?.periodCryptoDeposits,
      inr: metrics?.periodCryptoDepositsInr,
      icon: <Coins className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.cryptoDeposits,
    },
    {
      label: periodMetricLabel(periodLabel, "Crypto Withdrawals"),
      usd: metrics?.periodCryptoWithdrawals,
      inr: metrics?.periodCryptoWithdrawalsInr,
      icon: <ArrowUpRight className="h-3.5 w-3.5" />,
      tone: FINANCE_KPI_TONES.cryptoWithdrawals,
    },
  ];

  return (
    <div className={kpiGridClass(variant, className)}>
      {items.map(item => (
        <KpiCell
          key={item.label}
          label={item.label}
          usd={item.usd}
          inr={item.inr}
          sub={item.sub}
          icon={item.icon}
          tone={item.tone}
          loading={loading}
          compact={compact}
        />
      ))}
    </div>
  );
}
