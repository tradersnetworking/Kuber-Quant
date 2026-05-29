import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PiggyBank, Wallet } from "lucide-react";
import { formatFundingAmount, type InvestmentFundingSnapshot } from "@/lib/investment-funding";
import { formatInrAmount } from "@/lib/format-money";

type Props = {
  funding?: InvestmentFundingSnapshot | null;
  isLoading?: boolean;
  walletLabel?: string;
};

export function InvestmentFundingSummary({ funding, isLoading, walletLabel }: Props) {
  if (isLoading) {
    return (
      <div className="p-3 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10">
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (!funding) return null;

  const label = walletLabel ?? (funding.walletType === "crypto" ? "Crypto wallet" : "Fiat wallet");

  return (
    <div className="space-y-2">
      <div className="p-3 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex justify-between items-start gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 shrink-0" /> Available to invest
          </p>
          <p className="font-bold text-sm text-amber-600 dark:text-amber-400 truncate">
            {formatFundingAmount(funding.availableBalance, funding.currency)}
          </p>
          {funding.availableBalanceInr != null && funding.currency.toUpperCase() !== "INR" && (
            <p className="text-[11px] text-muted-foreground">₹{formatInrAmount(funding.availableBalanceInr)}</p>
          )}
        </div>
        <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px] shrink-0">
          {label}
        </Badge>
      </div>

      {funding.activeInvestmentCount > 0 && (
        <div className="p-3 rounded-lg bg-muted/40 dark:bg-white/[0.03] border border-border/80 dark:border-white/10 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <PiggyBank className="h-3.5 w-3.5 shrink-0" /> Already invested
            </p>
            <p className="font-semibold text-sm truncate">
              {formatFundingAmount(funding.activeInvested, funding.currency)}
            </p>
            {funding.activeInvestedInr != null && funding.currency.toUpperCase() !== "INR" && (
              <p className="text-[11px] text-muted-foreground">₹{formatInrAmount(funding.activeInvestedInr)}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {funding.activeInvestmentCount} active plan{funding.activeInvestmentCount === 1 ? "" : "s"} · locked until maturity
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
