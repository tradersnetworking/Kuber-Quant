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

const YAHOO: Record<string, string> = {
  US30: "^DJI",
  NAS100: "^NDX",
  GER40: "^GDAXI",
  USOIL: "CL=F",
  UKOIL: "BZ=F",
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
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "KuberQuant/1.0" },
    });
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

async function fetchYahooTick(symbol: string): Promise<MarketTick | null> {
  const ticker = YAHOO[symbol];
  if (!ticker) return null;
  const data = await fetchJson<{
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }> };
  }>(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=1d`);
  const meta = data?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  if (!price || price <= 0) return null;
  const prev = meta?.chartPreviousClose ?? price;
  return { symbol, price, changePercent: prev ? ((price - prev) / prev) * 100 : 0 };
}

export async function fetchPublicMarketTicks(symbols: string[]): Promise<MarketTick[]> {
  const unique = [...new Set(symbols)].slice(0, 10);
  const forex = await fetchForexBatch(unique);

  const results = await Promise.all(unique.map(async (symbol) => {
    if (forex.has(symbol)) return forex.get(symbol)!;
    const binance = await fetchBinanceTick(symbol);
    if (binance) return binance;
    const gecko = await fetchCoinGeckoTick(symbol);
    if (gecko) return gecko;
    return fetchYahooTick(symbol);
  }));

  return results.filter((t): t is MarketTick => t != null && t.price > 0);
}
