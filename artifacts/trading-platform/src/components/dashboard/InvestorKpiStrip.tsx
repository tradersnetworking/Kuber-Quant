import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownLeft, Calendar, TrendingUp, Wallet, PiggyBank } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { formatUsdWithInr } from "@/lib/format-money";
import { DualCurrencyValue } from "@/components/ui/DualCurrencyValue";

type Props = {
  t: (key: string, opts?: Record<string, unknown>) => string;
  isLoading: boolean;
  totalPortfolio?: number;
  totalPortfolioInr?: number;
  walletBalance?: number;
  activeInvested?: number;
  totalProfit?: number;
  totalProfitInr?: number;
  totalInvested?: number;
  totalInvestedInr?: number;
  monthPortfolioChangePct?: number;
  monthProfitChangePct?: number;
  nextPayoutDate?: string | null;
  nextPayoutAmountUsd?: number | null;
  nextPayoutAmountInr?: number | null;
  nextPayoutPlanName?: string | null;
  nextPayoutInvestmentId?: number | null;
  nextPayoutDaysUntil?: number | null;
};

function fmtPct(value?: number) {
  if (value === undefined || Number.isNaN(value)) return null;
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function KpiAmount({
  isLoading,
  usd,
  inr,
  usdClassName = "text-amber-600 dark:text-amber-400",
}: {
  isLoading: boolean;
  usd?: number;
  inr?: number;
  usdClassName?: string;
}) {
  if (isLoading) return <Skeleton className="h-8 w-28 mt-1" />;
  return (
    <DualCurrencyValue usd={usd} inr={inr} usdClassName={usdClassName} className="mt-0.5" />
  );
}

function TrendLine({
  value,
  label,
}: {
  value?: number;
  label: string;
}) {
  const trend = fmtPct(value);
  if (!trend) return null;
  const positive = (value ?? 0) >= 0;
  return (
    <p className={cn(
      "text-xs font-medium mt-1 flex items-center gap-1",
      positive ? "text-green-700 dark:text-green-400" : "text-red-400",
    )}>
      {positive ? <ArrowUpRight className="h-3 w-3 shrink-0" /> : <ArrowDownLeft className="h-3 w-3 shrink-0" />}
      <span className="truncate">{trend} {label}</span>
    </p>
  );
}

export function InvestorKpiStrip({
  t,
  isLoading,
  totalPortfolio,
  totalPortfolioInr,
  walletBalance,
  activeInvested,
  totalProfit,
  totalProfitInr,
  totalInvested,
  totalInvestedInr,
  monthPortfolioChangePct,
  monthProfitChangePct,
  nextPayoutDate,
  nextPayoutAmountUsd,
  nextPayoutAmountInr,
  nextPayoutPlanName,
  nextPayoutInvestmentId,
  nextPayoutDaysUntil,
}: Props) {
  const hasPayout = !!nextPayoutDate && nextPayoutAmountUsd != null && nextPayoutAmountUsd > 0;
  const payoutDual = formatUsdWithInr(nextPayoutAmountUsd, nextPayoutAmountInr ?? undefined);
  const payoutHref = nextPayoutInvestmentId ? `/investments/${nextPayoutInvestmentId}` : "/investments";

  return (
    <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-background to-yellow-600/5 overflow-hidden">
      <CardContent className="py-4 px-3 sm:px-6">
        <div className="grid grid-cols-1 xs:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          <div className="min-w-0 rounded-lg border border-border/60 dark:border-white/10 bg-background/40 dark:bg-white/[0.02] p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Wallet className="h-3 w-3 shrink-0" />
              {t("dashboard.totalPortfolio")}
            </p>
            <div className="mt-1 min-w-0">
              <KpiAmount
                isLoading={isLoading}
                usd={totalPortfolio}
                inr={totalPortfolioInr}
              />
              <TrendLine value={monthPortfolioChangePct} label={t("dashboard.thisMonth")} />
              {(walletBalance != null || activeInvested != null) && (
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  {t("dashboard.portfolioBreakdown", {
                    defaultValue: "Wallet {{wallet}} + active invested {{invested}}",
                    wallet: formatUsdWithInr(walletBalance, undefined).primary,
                    invested: formatUsdWithInr(activeInvested, undefined).primary,
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="min-w-0 rounded-lg border border-border/60 dark:border-white/10 bg-background/40 dark:bg-white/[0.02] p-3 sm:p-4">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 shrink-0" />
              {t("dashboard.totalProfit")}
            </p>
            <div className="mt-1 min-w-0">
              <KpiAmount
                isLoading={isLoading}
                usd={totalProfit}
                inr={totalProfitInr}
                usdClassName="text-green-700 dark:text-green-400"
              />
              <TrendLine value={monthProfitChangePct} label={t("dashboard.thisMonth")} />
            </div>
          </div>

          <Link href="/investments" className="min-w-0 block group">
            <div className="h-full rounded-lg border border-border/60 dark:border-white/10 bg-background/40 dark:bg-white/[0.02] p-3 sm:p-4 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 group-hover:text-amber-600 dark:group-hover:text-amber-400">
                <PiggyBank className="h-3 w-3 shrink-0" />
                {t("dashboard.totalInvested")}
              </p>
              <div className="mt-1 min-w-0">
                <KpiAmount
                  isLoading={isLoading}
                  usd={totalInvested}
                  inr={totalInvestedInr}
                />
                <p className="text-[10px] text-muted-foreground mt-1 truncate group-hover:text-amber-600/80 dark:group-hover:text-amber-400/80">
                  {t("dashboard.viewInvestments")} →
                </p>
              </div>
            </div>
          </Link>

          <Link href={payoutHref} className="min-w-0 block group">
            <div className="h-full rounded-lg border border-border/60 dark:border-white/10 bg-background/40 dark:bg-white/[0.02] p-3 sm:p-4 transition-colors hover:border-amber-500/30 hover:bg-amber-500/5">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3 shrink-0" />
                {t("dashboard.nextPayout")}
              </p>
              {isLoading ? (
                <Skeleton className="h-8 w-32 mt-1" />
              ) : hasPayout ? (
                <div className="mt-1 min-w-0 space-y-1">
                  <p className="mobile-stat-value text-amber-600 dark:text-amber-400">
                    {payoutDual.primary}
                  </p>
                  {payoutDual.secondary && (
                    <p className="kpi-currency-secondary">{payoutDual.secondary}</p>
                  )}
                  <p className="text-xs font-semibold text-foreground break-words">
                    {t("dashboard.maturityOn", { defaultValue: "Matures" })}{" "}
                    {format(new Date(nextPayoutDate!), "MMM d, yyyy")}
                  </p>
                  {nextPayoutDaysUntil != null && (
                    <p className="text-[10px] text-amber-600/90 dark:text-amber-400/90 font-medium">
                      {nextPayoutDaysUntil === 0
                        ? t("dashboard.maturityToday", { defaultValue: "Maturing today" })
                        : t("dashboard.maturityInDays", {
                            defaultValue: "In {{count}} days",
                            count: nextPayoutDaysUntil,
                          })}
                    </p>
                  )}
                  {nextPayoutPlanName && (
                    <p className="text-[10px] text-muted-foreground line-clamp-2 break-words">{nextPayoutPlanName}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm font-medium text-muted-foreground mt-2">
                  {t("dashboard.noScheduledPayout")}
                </p>
              )}
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
