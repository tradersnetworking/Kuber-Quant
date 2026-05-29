import { Router } from "express";
import { requireAuth, optionalAuth } from "../middlewares/auth";
import {
  AVAILABLE_PAIRS,
  fetchLiveTicks,
  getMarketDataConfig,
  getUserWatchlist,
  DEFAULT_WATCHLIST,
} from "../helpers/marketData";
import { fetchPublicMarketTicks } from "../helpers/publicMarketFeed";
import { getExchangeRates, refreshExchangeRates } from "../helpers/exchangeRateService";
import { handleGetWatchlist, handleSaveWatchlist } from "../helpers/watchlistHandlers";
import { clearMarketTickerCache, getMarketTickerCache, getSharedMarketTickerCache, setMarketTickerCache } from "../helpers/marketCache";

const router = Router();

async function resolveSymbols(req: { user?: { userId: number } }, querySymbols?: string): Promise<string[]> {
  try {
    const config = await getMarketDataConfig();
    let symbols = config.defaultPairs;
    if (req.user?.userId) {
      symbols = await getUserWatchlist(req.user.userId);
    } else if (querySymbols?.trim()) {
      symbols = querySymbols.split(",").map(s => s.trim()).filter(Boolean).slice(0, 10);
    }
    return symbols.length ? symbols : [...DEFAULT_WATCHLIST];
  } catch {
    return [...DEFAULT_WATCHLIST];
  }
}

async function getCachedTicks(symbols: string[]) {
  let refreshSeconds = 30;
  try {
    const config = await getMarketDataConfig();
    refreshSeconds = config.refreshSeconds;
  } catch { /* default */ }

  const key = symbols.slice().sort().join(",");
  const now = Date.now();
  const hit = getMarketTickerCache(key) ?? await getSharedMarketTickerCache(key);
  if (hit && now - hit.fetchedAt < refreshSeconds * 1000) {
    return { ticks: hit.data as Awaited<ReturnType<typeof fetchLiveTicks>>, cached: true, updatedAt: new Date(hit.fetchedAt).toISOString() };
  }

  let ticks = await fetchLiveTicks(symbols);
  if (!ticks.some(t => t.price > 0)) {
    ticks = await fetchPublicMarketTicks(symbols);
  }

  if (ticks.some(t => t.price > 0)) {
    await setMarketTickerCache(key, ticks, now);
  }
  return { ticks, cached: false, updatedAt: new Date(now).toISOString() };
}

router.get("/config", async (_req, res) => {
  try {
    const config = await getMarketDataConfig();
    res.json({
      refreshSeconds: config.refreshSeconds,
      availablePairs: AVAILABLE_PAIRS,
      maxPairs: 10,
    });
  } catch {
    res.json({ refreshSeconds: 30, availablePairs: AVAILABLE_PAIRS, maxPairs: 10 });
  }
});

router.get("/pairs", (_req, res) => {
  res.json({ pairs: AVAILABLE_PAIRS, maxPairs: 10 });
});

router.get("/watchlist", requireAuth, handleGetWatchlist);

router.put("/watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));
router.post("/watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));

router.get("/exchange-rates", async (_req, res) => {
  try {
    const rates = await getExchangeRates();
    res.json({
      base: rates.base,
      USD_INR: rates.USD_INR,
      USD_EUR: rates.USD_EUR,
      USDT_USD: rates.USDT_USD,
      updatedAt: rates.updatedAt,
      source: rates.source,
    });
  } catch {
    res.json({
      base: "USD",
      USD_INR: 83.5,
      USD_EUR: 0.92,
      USDT_USD: 1,
      updatedAt: null,
      source: "fallback",
    });
  }
});

router.post("/exchange-rates/refresh", requireAuth, async (req, res) => {
  const role = (req as any).user?.role;
  if (!["superadmin", "admin"].includes(role)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const rates = await refreshExchangeRates(true);
  res.json(rates);
});

router.get("/ticker", optionalAuth, async (req, res) => {
  const user = (req as any).user as { userId: number } | undefined;
  const querySymbols = typeof req.query.symbols === "string" ? req.query.symbols : undefined;
  const symbols = await resolveSymbols({ user }, querySymbols);

  try {
    const result = await getCachedTicks(symbols);
    res.json({ ...result, symbols });
  } catch {
    const ticks = await fetchPublicMarketTicks(symbols);
    res.json({ ticks, symbols, cached: false, updatedAt: new Date().toISOString() });
  }
});

export default router;
