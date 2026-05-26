/**
 * Client-side live market feed — used when API server is unavailable or returns empty.
 * Sources: Binance, open.er-api.com, Frankfurter, CoinGecko.
 */
export type MarketTick = {
  symbol: string;
  price: number;
  changePercent: number;
};

export const DEFAULT_WATCHLIST = [
  "EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD",
  "ETH/USD", "AUD/USD", "US30", "NAS100", "USOIL",
];

const BINANCE: Record<string, string> = {
  "BTC/USD": "BTCUSDT",
  "ETH/USD": "ETHUSDT",
  "XAU/USD": "PAXGUSDT",
};

const FX_PAIRS = new Set([
  "EUR/USD", "GBP/USD", "AUD/USD", "NZD/USD", "USD/JPY", "USD/CAD", "USD/CHF",
  "USD/INR", "EUR/GBP", "EUR/JPY", "GBP/JPY",
]);

function fxFromUsdRates(symbol: string, rates: Record<string, number>): number | null {
  switch (symbol) {
    case "EUR/USD": return rates.EUR ? 1 / rates.EUR : null;
    case "GBP/USD": return rates.GBP ? 1 / rates.GBP : null;
    case "AUD/USD": return rates.AUD ? 1 / rates.AUD : null;
    case "NZD/USD": return rates.NZD ? 1 / rates.NZD : null;
    case "USD/JPY": return rates.JPY ?? null;
    case "USD/CAD": return rates.CAD ?? null;
    case "USD/CHF": return rates.CHF ?? null;
    case "USD/INR": return rates.INR ?? null;
    case "EUR/GBP": {
      const eur = rates.EUR ? 1 / rates.EUR : 0;
      const gbp = rates.GBP ? 1 / rates.GBP : 0;
      return eur && gbp ? eur / gbp : null;
    }
    case "EUR/JPY": {
      const eur = rates.EUR ? 1 / rates.EUR : 0;
      return eur && rates.JPY ? eur * rates.JPY : null;
    }
    case "GBP/JPY": {
      const gbp = rates.GBP ? 1 / rates.GBP : 0;
      return gbp && rates.JPY ? gbp * rates.JPY : null;
    }
    default: return null;
  }
}

async function fetchJson<T>(url: string, timeoutMs = 12000): Promise<T | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBinanceTick(symbol: string): Promise<MarketTick | null> {
  const pair = BINANCE[symbol];
  if (!pair) return null;
  for (const base of ["https://api.binance.com", "https://data-api.binance.vision"]) {
    const data = await fetchJson<{ lastPrice?: string; priceChangePercent?: string }>(
      `${base}/api/v3/ticker/24hr?symbol=${pair}`,
    );
    const price = Number(data?.lastPrice);
    if (price > 0) {
      return { symbol, price, changePercent: Number(data?.priceChangePercent ?? 0) };
    }
  }
  return null;
}

async function fetchForexBatch(symbols: string[]): Promise<Map<string, MarketTick>> {
  const map = new Map<string, MarketTick>();
  const fxNeeded = symbols.filter(s => FX_PAIRS.has(s));
  if (!fxNeeded.length) return map;

  const data = await fetchJson<{ rates?: Record<string, number> }>("https://open.er-api.com/v6/latest/USD");
  if (data?.rates) {
    for (const symbol of fxNeeded) {
      const price = fxFromUsdRates(symbol, data.rates);
      if (price && price > 0) map.set(symbol, { symbol, price, changePercent: 0 });
    }
    return map;
  }

  const eur = await fetchJson<{ rates?: { USD?: number } }>("https://api.frankfurter.app/latest?from=EUR&to=USD");
  if (eur?.rates?.USD) map.set("EUR/USD", { symbol: "EUR/USD", price: eur.rates.USD, changePercent: 0 });
  return map;
}

async function fetchCoinGeckoTick(symbol: string): Promise<MarketTick | null> {
  const ids: Record<string, string> = {
    "BTC/USD": "bitcoin",
    "ETH/USD": "ethereum",
    "XAU/USD": "tether-gold",
  };
  const id = ids[symbol];
  if (!id) return null;
  const data = await fetchJson<Record<string, { usd?: number; usd_24h_change?: number }>>(
    `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`,
  );
  if (data?.[id]?.usd) {
    return { symbol, price: data[id].usd!, changePercent: data[id].usd_24h_change ?? 0 };
  }
  return null;
}

export async function fetchClientMarketTicks(symbols: string[]): Promise<MarketTick[]> {
  const unique = [...new Set(symbols)].slice(0, 10);
  const forex = await fetchForexBatch(unique);

  const results = await Promise.all(unique.map(async (symbol) => {
    if (forex.has(symbol)) return forex.get(symbol)!;
    const binance = await fetchBinanceTick(symbol);
    if (binance) return binance;
    return fetchCoinGeckoTick(symbol);
  }));

  return results.filter((t): t is MarketTick => t != null && t.price > 0);
}

export function formatMarketPrice(symbol: string, price: number): string {
  if (!price) return "—";
  if (symbol.includes("JPY") && !symbol.startsWith("USD")) return price.toFixed(3);
  if (symbol.startsWith("EUR") || symbol.startsWith("GBP") || symbol.startsWith("AUD")) return price.toFixed(5);
  if (symbol.startsWith("XAU") || symbol.startsWith("XAG")) {
    return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return price.toLocaleString(undefined, { maximumFractionDigits: price >= 1000 ? 0 : 2 });
}

/** Try API server first, then direct public APIs from the browser. */
export async function loadMarketTicks(
  symbols: string[],
  authHeaders: Record<string, string> = {},
): Promise<{ ticks: MarketTick[]; symbols: string[]; source: "api" | "direct" }> {
  const list = symbols.length ? symbols : DEFAULT_WATCHLIST;

  try {
    const { apiPath } = await import("@/lib/token-store");
    const res = await fetch(apiPath("/market/ticker"), { headers: authHeaders });
    if (res.ok) {
      const data = await res.json();
      const live = (data.ticks || []).filter((t: MarketTick) => t.price > 0);
      if (live.length) {
        return { ticks: live, symbols: data.symbols || list, source: "api" };
      }
    }
  } catch { /* fall through */ }

  const direct = await fetchClientMarketTicks(list);
  return { ticks: direct, symbols: list, source: "direct" };
}

const WATCHLIST_LS_KEY = "kuber_market_watchlist";

const WATCHLIST_GET_PATHS = ["/dashboard/market-watchlist", "/market/watchlist"];
const WATCHLIST_SAVE_PATHS = ["/dashboard/market-watchlist", "/market/watchlist"];

async function tryAuthPaths<T>(paths: string[], init: RequestInit): Promise<T> {
  const { authFetchJson } = await import("@/lib/token-store");
  let lastError: Error | null = null;
  for (const path of paths) {
    try {
      return await authFetchJson<T>(path, init);
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Only try next path on 404; other errors (401, 400) should surface immediately
      if (!lastError.message.includes("(404)")) throw lastError;
    }
  }
  throw lastError || new Error("Watchlist API not found");
}

export async function loadUserWatchlistPairs(): Promise<string[] | null> {
  try {
    const res = await tryAuthPaths<{ pairs: string[] }>(WATCHLIST_GET_PATHS, { method: "GET" });
    if (Array.isArray(res.pairs) && res.pairs.length) {
      localStorage.setItem(WATCHLIST_LS_KEY, JSON.stringify(res.pairs));
      return res.pairs;
    }
  } catch { /* try local fallback */ }

  try {
    const raw = localStorage.getItem(WATCHLIST_LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed.filter((s): s is string => typeof s === "string");
    }
  } catch { /* ignore */ }
  return null;
}

export async function saveUserWatchlistPairs(pairs: string[]): Promise<string[]> {
  if (!pairs.length) throw new Error("Select at least one trading pair");

  const body = JSON.stringify({ pairs });

  try {
    const res = await tryAuthPaths<{ pairs: string[] }>(
      WATCHLIST_SAVE_PATHS,
      { method: "POST", body },
    );
    localStorage.setItem(WATCHLIST_LS_KEY, JSON.stringify(res.pairs));
    return res.pairs;
  } catch (postErr: any) {
    try {
      const res = await tryAuthPaths<{ pairs: string[] }>(
        WATCHLIST_SAVE_PATHS,
        { method: "PUT", body },
      );
      localStorage.setItem(WATCHLIST_LS_KEY, JSON.stringify(res.pairs));
      return res.pairs;
    } catch (putErr: any) {
      throw new Error(putErr?.message || postErr?.message || "Failed to save watchlist");
    }
  }
}
