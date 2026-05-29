import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, TrendingDown, Radio, Settings2, RefreshCw, X, Check,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getStoredToken, apiPath } from "@/lib/token-store";
import {
  DEFAULT_WATCHLIST, formatMarketPrice, loadMarketTicks,
  loadUserWatchlistPairs, saveUserWatchlistPairs, type MarketTick,
} from "@/lib/market-feed";

const ALL_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "XAU/USD", "XAG/USD", "BTC/USD", "ETH/USD",
  "US30", "NAS100", "GER40", "USOIL", "UKOIL", "USD/INR",
];

function MarketTickCard({ tick }: { tick: MarketTick }) {
  const up = tick.changePercent >= 0;
  return (
    <div className="shrink-0 w-[140px] sm:w-[152px] p-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border/80 dark:border-white/5 hover:border-border dark:border-white/10 transition-colors snap-start">
      <p className="text-xs font-semibold text-muted-foreground mb-1 truncate">{tick.symbol}</p>
      <p className="text-lg font-black font-mono text-foreground">{formatMarketPrice(tick.symbol, tick.price)}</p>
      {tick.changePercent !== 0 ? (
        <div className={cn("flex items-center gap-1 mt-1 text-xs font-medium", up ? "text-green-700 dark:text-green-400" : "text-red-400")}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {up ? "+" : ""}{tick.changePercent.toFixed(2)}%
        </div>
      ) : tick.price > 0 ? (
        <p className="text-[10px] text-muted-foreground mt-1">Live</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/80 mt-1">Loading…</p>
      )}
    </div>
  );
}

export function LiveMarketPanel() {
  const { toast } = useToast();
  const [ticks, setTicks] = useState<MarketTick[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([...DEFAULT_WATCHLIST]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [addPair, setAddPair] = useState<string | undefined>(undefined);
  const [refreshSec, setRefreshSec] = useState(60);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dataSource, setDataSource] = useState<"api" | "direct" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  const scrollBy = (delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, loading, ticks.length, watchlist.length]);

  const loadTicker = useCallback(async (symbolList?: string[]) => {
    if (document.hidden) return;
    const token = getStoredToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    const list = symbolList?.length ? symbolList : watchlist;
    const { ticks: live, symbols, source } = await loadMarketTicks(list, headers);

    if (symbols.length) setWatchlist(symbols);
    if (live.length) {
      setTicks(live);
      setUpdatedAt(new Date().toISOString());
      setDataSource(source);
    }
  }, [watchlist]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let pairs = [...DEFAULT_WATCHLIST];
      try {
        const [wl, cfg] = await Promise.all([
          loadUserWatchlistPairs(),
          fetch(apiPath("/market/config")).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (!cancelled) {
          if (wl?.length) {
            pairs = wl;
            setWatchlist(wl);
            setDraft(wl);
          }
          if (cfg?.refreshSeconds) setRefreshSec(cfg.refreshSeconds);
        }
      } catch { /* use defaults */ }

      await loadTicker(pairs);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => loadTicker(), refreshSec * 1000);
    return () => clearInterval(id);
  }, [loadTicker, refreshSec]);

  function toggleDraft(pair: string) {
    setDraft(d => {
      if (d.includes(pair)) return d.filter(p => p !== pair);
      if (d.length >= 10) {
        toast({ title: "Maximum 10 pairs", description: "Remove a pair before adding another.", variant: "destructive" });
        return d;
      }
      return [...d, pair];
    });
  }

  async function saveWatchlist() {
    if (draft.length === 0) {
      toast({ title: "No pairs selected", description: "Add at least one pair before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveUserWatchlistPairs(draft);
      setWatchlist(saved);
      setDraft(saved);
      setEditing(false);
      toast({ title: "Watchlist saved", description: `${saved.length} pair(s) on your dashboard.` });
      await loadTicker(saved);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const displayTicks = ticks.length
    ? ticks
    : watchlist.map(s => ({ symbol: s, price: 0, changePercent: 0 }));

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Radio className={cn("h-4 w-4", ticks.length ? "text-green-700 dark:text-green-400 animate-pulse" : "text-muted-foreground")} />
              Live Markets
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20 text-xs">{watchlist.length}/10 pairs</Badge>
              {dataSource === "direct" && (
                <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600 dark:text-amber-400">Direct feed</Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Swipe or scroll horizontally to view all pairs · updates every {refreshSec}s
              {updatedAt && ` · Last ${new Date(updatedAt).toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => loadTicker()} className="h-8">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => {
              if (editing) {
                setDraft(watchlist);
                setEditing(false);
              } else {
                setDraft([...watchlist]);
                setEditing(true);
              }
            }} className="h-8">
              <Settings2 className="h-3.5 w-3.5 mr-1" /> {editing ? "Cancel" : "Edit Pairs"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editing && (
          <div className="mb-4 p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-3">
            <p className="text-xs text-muted-foreground">Select up to 10 pairs for your dashboard ({draft.length}/10)</p>
            <div className="flex flex-wrap gap-2">
              {draft.map(pair => (
                <Badge key={pair} variant="outline" className="cursor-pointer border-amber-500/40 pr-1">
                  {pair}
                  <button type="button" onClick={() => toggleDraft(pair)} className="ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Select value={addPair} onValueChange={setAddPair}>
                <SelectTrigger className="w-[160px] h-8 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-xs"><SelectValue placeholder="Add pair..." /></SelectTrigger>
                <SelectContent>
                  {ALL_PAIRS.filter(p => !draft.includes(p)).map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" className="h-8" disabled={!addPair || draft.length >= 10} onClick={() => { if (addPair) { toggleDraft(addPair); setAddPair(undefined); } }}>
                Add
              </Button>
              <Button size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-black" disabled={saving || draft.length === 0} onClick={saveWatchlist}>
                {saving ? "Saving..." : <><Check className="h-3.5 w-3.5 mr-1" />Save Watchlist</>}
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2 snap-x snap-mandatory">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-[140px] sm:w-[152px] shrink-0" />
            ))}
          </div>
        ) : (
          <div className="relative group">
            {canScrollLeft && (
              <button
                type="button"
                onClick={() => scrollBy(-320)}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/80 border border-border dark:border-white/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/40 flex items-center justify-center shadow-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            {canScrollRight && (
              <button
                type="button"
                onClick={() => scrollBy(320)}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full bg-black/80 border border-border dark:border-white/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/40 flex items-center justify-center shadow-lg md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                aria-label="Scroll right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <div
              ref={scrollRef}
              className="flex gap-3 overflow-x-auto scrollbar-thin pb-2 snap-x snap-mandatory touch-pan-x overscroll-x-contain"
            >
              {displayTicks.map(tick => (
                <MarketTickCard key={tick.symbol} tick={tick} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
