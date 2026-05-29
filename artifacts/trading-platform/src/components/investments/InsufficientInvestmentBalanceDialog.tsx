import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PiggyBank, Wallet } from "lucide-react";
import {
  formatFundingAmount,
  type InsufficientInvestmentBalancePayload,
} from "@/lib/investment-funding";
import { formatInrAmount } from "@/lib/format-money";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payload: InsufficientInvestmentBalancePayload | null;
};

export function InsufficientInvestmentBalanceDialog({ open, onOpenChange, payload }: Props) {
  if (!payload) return null;

  const { currency, availableBalance, availableBalanceInr, activeInvested, activeInvestedInr, requestedAmount, shortfall } = payload;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            Insufficient balance
          </DialogTitle>
          <DialogDescription className="text-left text-sm leading-relaxed pt-1">
            {payload.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
              <Wallet className="h-3.5 w-3.5" /> Available to invest
            </p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {formatFundingAmount(availableBalance, currency)}
            </p>
            {availableBalanceInr != null && currency.toUpperCase() !== "INR" && (
              <p className="text-xs text-muted-foreground">₹{formatInrAmount(availableBalanceInr)}</p>
            )}
          </div>

          {payload.activeInvestmentCount > 0 && (
            <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-1">
                <PiggyBank className="h-3.5 w-3.5" /> Already invested (active)
              </p>
              <p className="text-lg font-bold text-foreground">
                {formatFundingAmount(activeInvested, currency)}
              </p>
              {activeInvestedInr != null && currency.toUpperCase() !== "INR" && (
                <p className="text-xs text-muted-foreground">₹{formatInrAmount(activeInvestedInr)}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-1">
                Locked principal in {payload.activeInvestmentCount} active plan{payload.activeInvestmentCount === 1 ? "" : "s"} — not available for new investments.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5">
              <p className="text-muted-foreground">You tried to invest</p>
              <p className="font-semibold text-red-400">{formatFundingAmount(requestedAmount, currency)}</p>
            </div>
            <div className="rounded-md border border-red-500/20 bg-red-500/5 p-2.5">
              <p className="text-muted-foreground">Shortfall</p>
              <p className="font-semibold text-red-400">{formatFundingAmount(shortfall, currency)}</p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
            Adjust amount
          </Button>
          <Link href="/money" className="w-full sm:w-auto">
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={() => onOpenChange(false)}>
              Add funds
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
