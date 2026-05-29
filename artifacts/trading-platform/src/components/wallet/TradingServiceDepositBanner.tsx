import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { authFetchJson } from "@/lib/token-store";
import { Link } from "wouter";
import { IndianRupee, Wallet } from "lucide-react";

export type TradingServiceDepositStatus = {
  qualified: boolean;
  minUsd: number;
  minInr: number;
  minUsdt: number;
  totalDepositedUsd: number;
  totalInrDeposits: number;
  walletUsd: number;
  walletInr: number;
  exchangeRateUsdInr: number;
  exchangeRateSource: string;
  exchangeRateUpdatedAt: string;
  shortfallUsd: number;
  shortfallInr: number;
};

export function useTradingServiceDepositStatus() {
  return useQuery({
    queryKey: ["/api/wallet/trading-service-deposit"],
    queryFn: () => authFetchJson<TradingServiceDepositStatus>("/wallet/trading-service-deposit"),
  });
}

type BannerProps = {
  compact?: boolean;
};

export function TradingServiceDepositBanner({ compact }: BannerProps) {
  const { data, isLoading } = useTradingServiceDepositStatus();

  if (isLoading || !data || data.qualified) return null;

  const rateLabel = data.exchangeRateUsdInr.toFixed(2);

  return (
    <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-950 dark:text-amber-50 min-w-0 max-w-full overflow-hidden">
      <IndianRupee className="h-4 w-4 shrink-0" />
      <AlertTitle className="text-sm sm:text-base">Initial deposit required</AlertTitle>
      <AlertDescription className="space-y-3 text-xs sm:text-sm min-w-0 text-wrap-safe">
        <p>
          Deposit <strong>₹{data.minInr.toLocaleString("en-IN")}</strong> or{" "}
          <strong>${data.minUsd} / {data.minUsdt} USDT</strong> before copy trading, algo trading, account handling, or MT4/MT5 linking.
        </p>
        <p className="text-[11px] sm:text-xs text-muted-foreground text-wrap-safe">
          Live rate: 1 USD = ₹{rateLabel}
          {!compact && (
            <>
              {" "}· Approved: ~${data.totalDepositedUsd.toFixed(2)} · Wallet: ${data.walletUsd.toFixed(2)}
              {data.shortfallInr > 0 && data.shortfallUsd > 0 && (
                <> · Need ~₹{Math.ceil(data.shortfallInr).toLocaleString("en-IN")} or ${data.shortfallUsd.toFixed(2)} more</>
              )}
            </>
          )}
        </p>
        <Link href="/wallet?tab=deposit">
          <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-400 w-full sm:w-auto">
            <Wallet className="h-3.5 w-3.5 mr-1.5 shrink-0" /> Deposit now
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
