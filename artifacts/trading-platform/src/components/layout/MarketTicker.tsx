import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStoredToken, apiPath } from "@/lib/token-store";
import { DEFAULT_WATCHLIST, fetchClientMarketTicks, formatMarketPrice, loadMarketTicks, type MarketTick } from "@/lib/market-feed";

function TickItem({ tick }: { tick: MarketTick }) {
  const up = tick.changePercent >= 0;
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 shrink-0 border-r border-border/40 last:border-r-0">
      <span className="text-muted-foreground font-semibold text-xs whitespace-nowrap">{tick.symbol}</span>
      <span className="font-mono text-xs text-foreground whitespace-nowrap">{formatMarketPrice(tick.symbol, tick.price)}</span>
      {tick.changePercent !== 0 && (
        <>
          {up ? <TrendingUp className="h-3 w-3 text-green-400 shrink-0" /> : <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />}
          <span className={cn("text-xs font-medium whitespace-nowrap", up ? "text-green-400" : "text-red-400")}>
            {up ? "+" : ""}{tick.changePercent.toFixed(2)}%
          </span>
        </>
      )}
    </div>
  );
}

export function MarketTicker() {
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [refreshMs, setRefreshMs] = useState(30_000);

  useEffect(() => {
    fetch(apiPath("/market/config"))
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.refreshSeconds) setRefreshMs(d.refreshSeconds * 1000); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const token = getStoredToken();
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        const symbols = [...DEFAULT_WATCHLIST].slice(0, 6);
        const { ticks: liveTicks } = await loadMarketTicks(symbols, headers);
        const ticksToShow = liveTicks.length ? liveTicks : await fetchClientMarketTicks(symbols);
        if (!cancelled && ticksToShow.length) {
          setTicks(ticksToShow);
          setLive(true);
          setUpdatedAt(new Date().toISOString());
        }
      } catch {
        if (cancelled) return;
        const fallback = await fetchClientMarketTicks([...DEFAULT_WATCHLIST].slice(0, 6));
        if (fallback.length) {
          setTicks(fallback);
          setLive(true);
          setUpdatedAt(new Date().toISOString());
        }
      }
    }

    load();
    const id = setInterval(load, refreshMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [refreshMs]);

  return (
    <div className="border-b border-border/60 bg-card/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-1 min-h-[34px]">
        <div className="flex items-center gap-1.5 shrink-0 pr-2 border-r border-border/40">
          <Radio className={cn("h-3 w-3", live ? "text-green-400 animate-pulse" : "text-muted-foreground")} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Live Markets
          </span>
        </div>
        <div className="flex-1 overflow-x-auto scrollbar-thin touch-pan-x overscroll-x-contain">
          <div className="flex items-center min-w-max">
            {(ticks.length ? ticks : DEFAULT_WATCHLIST.slice(0, 4).map(s => ({ symbol: s, price: 0, changePercent: 0 }))).map(t => (
              <TickItem key={t.symbol} tick={t} />
            ))}
          </div>
        </div>
        {updatedAt && (
          <span className="hidden sm:inline text-[10px] text-muted-foreground shrink-0 pl-2 whitespace-nowrap">
            {new Date(updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
    </div>
  );
}

export type { MarketTick };
