import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";
import {
  exchangeCryptoSymbol,
  exchangeChainDisplay,
  formatExchangeRateCell,
} from "@/lib/exchange-display";
import {
  ourSellingRateInr,
  ourBuyingRateInr,
  type ExchangeRateRow,
} from "@/lib/exchange-catalog";
import { ArrowDownCircle, ArrowUpCircle, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "buy" | "sell";

type Props = {
  mode: Mode;
  rates: ExchangeRateRow[];
  loading: boolean;
  onTrade: (rate: ExchangeRateRow, mode: Mode) => void;
};

function RateCard({
  rate,
  mode,
  onTrade,
}: {
  rate: ExchangeRateRow;
  mode: Mode;
  onTrade: (rate: ExchangeRateRow, mode: Mode) => void;
}) {
  const inr = mode === "buy" ? ourSellingRateInr(rate) : ourBuyingRateInr(rate);
  const isBuy = mode === "buy";

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 transition-all",
        "bg-gradient-to-br from-white/[0.06] to-white/[0.02]",
        isBuy ? "border-emerald-500/20 hover:border-emerald-500/40" : "border-amber-500/20 hover:border-amber-500/40",
      )}
    >
      <div className={cn(
        "absolute -right-8 -top-8 h-24 w-24 rounded-full blur-2xl opacity-30 pointer-events-none",
        isBuy ? "bg-emerald-500" : "bg-amber-500",
      )} />

      <div className="relative flex items-start gap-3">
        <CryptoIcon symbol={rate.symbol} network={rate.network} coinName={rate.coinName} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-base">{exchangeCryptoSymbol(rate)}</h3>
            <Badge variant="outline" className="text-[10px] border-border dark:border-white/15 text-muted-foreground font-normal">
              {exchangeChainDisplay(rate.symbol, rate.network)}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{rate.label}</p>
        </div>
      </div>

      <div className="relative mt-4 rounded-xl bg-muted dark:bg-black/25 px-3 py-2.5 border border-border/80 dark:border-white/5">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">
          {isBuy ? "Our selling rate" : "Our buying rate"}
        </p>
        <p className={cn("text-sm font-semibold", isBuy ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
          {formatExchangeRateCell(rate, inr)}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className={cn(
          "relative mt-4 w-full font-semibold cursor-pointer",
          isBuy
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
            : "bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-900/20",
          !inr && "opacity-90",
        )}
        onClick={() => onTrade(rate, mode)}
      >
        {isBuy ? (
          <><ArrowDownCircle className="h-4 w-4 mr-1.5" /> Buy Crypto</>
        ) : (
          <><ArrowUpCircle className="h-4 w-4 mr-1.5" /> Sell Crypto</>
        )}
      </Button>
    </article>
  );
}

export function ExchangeRateMarket({ mode, rates, loading, onTrade }: Props) {
  const isBuy = mode === "buy";

  if (!loading && rates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-10 text-center text-sm text-muted-foreground">
        No cryptocurrencies available yet. Ask admin to add wallets in Deposit & Withdrawal Payment Accounts and set exchange rates.
      </div>
    );
  }

  return (
    <>
      {/* Mobile / tablet cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-muted/60 dark:bg-white/5 animate-pulse border border-border dark:border-white/10" />
          ))
        ) : rates.map(rate => (
          <RateCard key={`${mode}-${rate.symbol}-${rate.network}`} rate={rate} mode={mode} onTrade={onTrade} />
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden lg:block overflow-x-auto rounded-xl border border-border dark:border-white/10">
        <Table>
          <TableHeader>
            <TableRow className="border-border dark:border-white/10 hover:bg-transparent bg-muted/50 dark:bg-white/[0.03]">
              <TableHead className="text-muted-foreground w-[220px]">Crypto currency</TableHead>
              <TableHead className="text-muted-foreground">Chain</TableHead>
              <TableHead className="text-muted-foreground">
                {isBuy ? "Our selling rate" : "Our buying rate"}
              </TableHead>
              <TableHead className="text-right text-muted-foreground w-32">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">Loading rates…</TableCell>
              </TableRow>
            ) : rates.map(rate => {
              const inr = isBuy ? ourSellingRateInr(rate) : ourBuyingRateInr(rate);
              return (
                <TableRow
                  key={`${mode}-${rate.symbol}-${rate.network}`}
                  className="border-border dark:border-white/10 hover:bg-muted/50 dark:bg-white/[0.03] transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <CryptoIcon symbol={rate.symbol} network={rate.network} coinName={rate.coinName} />
                      <div>
                        <p className="font-medium">{exchangeCryptoSymbol(rate)}</p>
                        <p className="text-[11px] text-muted-foreground">{rate.label}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-border dark:border-white/15 font-normal text-muted-foreground">
                      {exchangeChainDisplay(rate.symbol, rate.network)}
                    </Badge>
                  </TableCell>
                  <TableCell className={isBuy ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                    {formatExchangeRateCell(rate, inr)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      className={cn(
                        "min-w-[88px] font-semibold cursor-pointer",
                        isBuy
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : "bg-amber-500 hover:bg-amber-400 text-black",
                        !inr && "opacity-90",
                      )}
                      onClick={() => onTrade(rate, mode)}
                    >
                      {isBuy ? (
                        <><TrendingUp className="h-3.5 w-3.5 mr-1" /> Buy Crypto</>
                      ) : (
                        <><TrendingDown className="h-3.5 w-3.5 mr-1" /> Sell Crypto</>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
