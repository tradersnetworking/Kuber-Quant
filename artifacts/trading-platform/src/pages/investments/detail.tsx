import type { ReactNode } from "react";
import { useRoute, Link } from "wouter";
import { useGetInvestment, useWithdrawInvestment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getShareUserDisplayName } from "@/lib/user-display-name";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import { ArrowLeft, Calendar, TrendingUp, Wallet, Hash, Target } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_STAT_GRID } from "@/lib/ui-system";

function investmentTypeLabel(type: string) {
  const map: Record<string, string> = {
    manual: "Wealth Plan",
    copy: "Copy Trading",
    algo: "Algo Trading",
    ea: "EA Strategy",
    plan: "Investment Plan",
  };
  return map[type] || type;
}

function profitService(type: string): "investment" | "copy_trading" | "algo_trading" | "ea_strategy" {
  if (type === "copy") return "copy_trading";
  if (type === "algo") return "algo_trading";
  if (type === "ea") return "ea_strategy";
  return "investment";
}

function DetailStat({
  label,
  value,
  sub,
  valueClass,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  valueClass?: string;
  icon: typeof Wallet;
}) {
  return (
    <div className="rounded-lg border border-border/80 dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3 sm:p-4 min-w-0">
      <div className="flex items-center gap-2 mb-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </p>
      </div>
      <div className={cn("text-xl sm:text-2xl md:text-3xl font-bold leading-tight break-words", valueClass)}>
        {value}
      </div>
      {sub && <p className="text-xs text-muted-foreground mt-1.5 break-words">{sub}</p>}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 py-3 border-b border-border/60 dark:border-white/10 last:border-0 min-w-0">
      <dt className="text-xs sm:text-sm text-muted-foreground shrink-0">{label}</dt>
      <dd className="text-sm font-medium break-words sm:text-right min-w-0">{value}</dd>
    </div>
  );
}

export default function InvestmentDetail() {
  const [, params] = useRoute("/investments/:id");
  const id = params?.id ? Number(params.id) : 0;

  const { data: investment, isLoading, refetch } = useGetInvestment(id, {
    query: { enabled: !!id, queryKey: ["getInvestment", id] },
  });

  const withdrawMutation = useWithdrawInvestment();
  const { toast } = useToast();
  const { user } = useAuth();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = getShareUserDisplayName(user);
  const avatarUrl = user?.avatarUrl;

  const handleWithdraw = () => {
    withdrawMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Withdrawal successful", description: "Funds have been moved to your balance." });
          refetch();
        },
        onError: () => {
          toast({ title: "Withdrawal failed", variant: "destructive" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <AppPage className="max-w-4xl mx-auto w-full">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-10 w-2/3 max-w-sm" />
        <div className={APP_STAT_GRID}>
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </AppPage>
    );
  }

  if (!investment) {
    return (
      <AppPage className="max-w-4xl mx-auto w-full text-center py-12">
        <p className="text-muted-foreground mb-4">Investment not found</p>
        <Link href="/investments">
          <Button variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
            Back to Portfolio
          </Button>
        </Link>
      </AppPage>
    );
  }

  const profit = Number(investment.profit);
  const canWithdraw = investment.status === "active" || investment.status === "completed";
  const roi = investment.profitPercent ?? investment.roiPercent;

  return (
    <AppPage className="max-w-4xl mx-auto w-full">
      <Link
        href="/investments"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-colors w-fit"
      >
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
        Back to Portfolio
      </Link>

      <div className="flex flex-col gap-4 min-w-0">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge
              variant={investment.status === "active" ? "default" : "secondary"}
              className={cn(
                "text-[10px] capitalize shrink-0",
                investment.status === "active" ? "bg-green-600 hover:bg-green-600" : "",
              )}
            >
              {investment.status}
            </Badge>
            <Badge variant="outline" className="text-[10px] uppercase shrink-0 text-amber-700 dark:text-amber-400 border-amber-500/30">
              {investmentTypeLabel(investment.type)}
            </Badge>
          </div>

          <h1 className="page-title text-2xl sm:text-3xl font-bold tracking-tight break-words leading-snug">
            {investment.planName || "Investment Plan"}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1.5 flex-wrap">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            Created {new Date(investment.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full min-w-0">
          {profit > 0 && (
            <ProfitShareButton
              userName={userName}
              referralCode={referralCode}
              avatarUrl={avatarUrl}
              className="w-full sm:flex-1 min-w-0"
              payload={{
                service: profitService(investment.type),
                profitAmount: profit,
                currency: investment.currency,
                detailLabel: investment.planName || undefined,
              }}
            />
          )}
          <Button
            variant="destructive"
            size="wrap"
            disabled={!canWithdraw || withdrawMutation.isPending}
            onClick={handleWithdraw}
            className={cn("w-full sm:flex-1 min-w-0", mobileBtnWrap)}
          >
            {withdrawMutation.isPending ? "Processing..." : "Withdraw Funds"}
          </Button>
        </div>
      </div>

      <div className={APP_STAT_GRID}>
        <DetailStat
          label="Capital"
          icon={Wallet}
          value={
            <>
              {investment.amount}{" "}
              <span className="text-base sm:text-lg text-muted-foreground font-semibold">{investment.currency}</span>
            </>
          }
        />
        <DetailStat
          label="Total Return"
          icon={TrendingUp}
          valueClass={profit > 0 ? "text-green-600 dark:text-green-400" : profit < 0 ? "text-red-500" : ""}
          value={
            <>
              {profit > 0 ? "+" : ""}
              {investment.profit}{" "}
              <span className="text-base sm:text-lg text-muted-foreground font-semibold">{investment.currency}</span>
            </>
          }
          sub={roi != null ? `${roi}% ROI` : "0% ROI"}
        />
      </div>

      <Card className={APP_CARD}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base sm:text-lg font-bold">Plan Details</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 pt-0">
          <dl className="min-w-0">
            <DetailRow
              label="Plan name"
              value={investment.planName || "—"}
            />
            <DetailRow
              label="Investment type"
              value={
                <span className="text-amber-700 dark:text-amber-400 uppercase text-xs sm:text-sm">
                  {investmentTypeLabel(investment.type)}
                </span>
              }
            />
            <DetailRow
              label="Status"
              value={
                <Badge
                  variant={investment.status === "active" ? "default" : "secondary"}
                  className={cn("capitalize", investment.status === "active" ? "bg-green-600 hover:bg-green-600" : "")}
                >
                  {investment.status}
                </Badge>
              }
            />
            <DetailRow
              label="Maturity date"
              value={
                investment.maturityDate
                  ? new Date(investment.maturityDate).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })
                  : "Open-ended"
              }
            />
            {investment.roiPercent != null && (
              <DetailRow
                label="Target ROI"
                value={
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Target className="h-3.5 w-3.5 shrink-0" />
                    {investment.roiPercent}%
                  </span>
                }
              />
            )}
            {investment.profitPercent != null && (
              <DetailRow label="Current ROI" value={`${investment.profitPercent}%`} />
            )}
            <DetailRow
              label="Investment ID"
              value={
                <span className="font-mono text-xs break-all inline-flex items-center gap-1">
                  <Hash className="h-3 w-3 shrink-0 opacity-60" />
                  {investment.id}
                </span>
              }
            />
            {investment.planId != null && (
              <DetailRow label="Plan ID" value={<span className="font-mono text-xs">{investment.planId}</span>} />
            )}
          </dl>
        </CardContent>
      </Card>
    </AppPage>
  );
}
