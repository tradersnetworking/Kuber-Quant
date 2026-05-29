import { fetchVpsMarketQuotes, getVpsBridgeConfig } from "./vpsBridge";
import { fetchPublicMarketTicks, DEFAULT_WATCHLIST, type MarketTick } from "./publicMarketFeed";

export type { MarketTick };
export { DEFAULT_WATCHLIST };

export const AVAILABLE_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "XAU/USD", "XAG/USD", "BTC/USD", "ETH/USD",
  "US30", "NAS100", "GER40", "USOIL", "UKOIL", "USD/INR",
] as const;

const ALLOWED_PAIR_SET = new Set<string>(AVAILABLE_PAIRS as unknown as string[]);

function userWatchlistKey(userId: number) {
  return `market_watchlist_user_${userId}`;
}

export function normalizeWatchlist(pairs: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of pairs) {
    if (typeof raw !== "string") continue;
    const symbol = raw.trim();
    if (!symbol || seen.has(symbol) || !ALLOWED_PAIR_SET.has(symbol)) continue;
    seen.add(symbol);
    out.push(symbol);
    if (out.length >= 10) break;
  }
  return out;
}

export type MarketDataConfig = {
  provider: "auto" | "vps" | "public";
  defaultPairs: string[];
  refreshSeconds: number;
  customApiUrl: string;
  customApiKey: string;
};

async function getSetting(key: string): Promise<string> {
  try {
    const { db, siteSettingsTable } = await import("@workspace/db");
    const { eq } = await import("@workspace/db/orm");
    const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    return row?.value || "";
  } catch {
    return "";
  }
}

async function saveSetting(key: string, value: string, label: string, category = "market_data") {
  const { db, siteSettingsTable } = await import("@workspace/db");
  const { eq } = await import("@workspace/db/orm");
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value, label, category });
  }
}

export async function getMarketDataConfig(): Promise<MarketDataConfig> {
  try {
    const [provider, pairsJson, refresh, customUrl, customKey] = await Promise.all([
      getSetting("market_provider"),
      getSetting("market_default_pairs"),
      getSetting("market_refresh_seconds"),
      getSetting("market_custom_api_url"),
      getSetting("market_custom_api_key"),
    ]);
    let defaultPairs = [...DEFAULT_WATCHLIST];
    if (pairsJson) {
      try {
        const parsed = JSON.parse(pairsJson);
        if (Array.isArray(parsed) && parsed.length) defaultPairs = parsed.slice(0, 10);
      } catch { /* keep default */ }
    }
    return {
      provider: (provider as MarketDataConfig["provider"]) || "public",
      defaultPairs,
      refreshSeconds: refresh ? Math.max(10, Number(refresh)) : 30,
      customApiUrl: customUrl || "",
      customApiKey: customKey || "",
    };
  } catch {
    return {
      provider: "public",
      defaultPairs: [...DEFAULT_WATCHLIST],
      refreshSeconds: 30,
      customApiUrl: "",
      customApiKey: "",
    };
  }
}

export async function saveMarketDataConfig(cfg: Partial<MarketDataConfig>) {
  const ops: Promise<void>[] = [];
  if (cfg.provider !== undefined) ops.push(saveSetting("market_provider", cfg.provider, "Market Data Provider"));
  if (cfg.defaultPairs !== undefined) ops.push(saveSetting("market_default_pairs", JSON.stringify(cfg.defaultPairs.slice(0, 10)), "Default Market Pairs"));
  if (cfg.refreshSeconds !== undefined) ops.push(saveSetting("market_refresh_seconds", String(cfg.refreshSeconds), "Market Refresh Seconds"));
  if (cfg.customApiUrl !== undefined) ops.push(saveSetting("market_custom_api_url", cfg.customApiUrl, "Custom Market API URL"));
  if (cfg.customApiKey !== undefined) ops.push(saveSetting("market_custom_api_key", cfg.customApiKey, "Custom Market API Key"));
  await Promise.all(ops);
}

export async function getUserWatchlist(userId: number): Promise<string[]> {
  const stored = await getSetting(userWatchlistKey(userId));
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const normalized = normalizeWatchlist(parsed);
        if (normalized.length) return normalized;
      }
    } catch { /* fall through */ }
  }

  // Legacy: user_profiles.securitySettings.dashboardWatchlist
  try {
    const { db, userProfilesTable } = await import("@workspace/db");
    const { eq } = await import("@workspace/db/orm");
    const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1);
    const list = (profile?.securitySettings as Record<string, unknown> | null)?.dashboardWatchlist;
    if (Array.isArray(list) && list.length) {
      const normalized = normalizeWatchlist(list);
      if (normalized.length) {
        await saveUserWatchlist(userId, normalized).catch(() => {});
        return normalized;
      }
    }
  } catch { /* fall through */ }

  const config = await getMarketDataConfig();
  return config.defaultPairs;
}

export async function saveUserWatchlist(userId: number, pairs: unknown[]): Promise<string[]> {
  const normalized = normalizeWatchlist(Array.isArray(pairs) ? pairs : []);
  if (!normalized.length) {
    throw new Error("Select at least one valid trading pair");
  }

  await saveSetting(
    userWatchlistKey(userId),
    JSON.stringify(normalized),
    `Market watchlist (user ${userId})`,
    "market_watchlist",
  );

  // Keep profile in sync when the row exists (optional, non-blocking)
  try {
    const { db, userProfilesTable } = await import("@workspace/db");
    const { eq } = await import("@workspace/db/orm");
    const [profile] = await db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1);
    if (profile) {
      const settings = {
        ...((profile.securitySettings || {}) as Record<string, unknown>),
        dashboardWatchlist: normalized,
      };
      await db.update(userProfilesTable).set({ securitySettings: settings }).where(eq(userProfilesTable.userId, userId));
    }
  } catch { /* site_settings is source of truth */ }

  return normalized;
}

async function fetchCustomApiTicks(symbols: string[], cfg: MarketDataConfig): Promise<MarketTick[]> {
  if (!cfg.customApiUrl) return [];
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cfg.customApiKey) headers.Authorization = `Bearer ${cfg.customApiKey}`;
  const url = `${cfg.customApiUrl.replace(/\/$/, "")}?symbols=${encodeURIComponent(symbols.join(","))}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return [];
    const json = await res.json() as any;
    const raw = Array.isArray(json) ? json : (json.ticks || json.quotes || json.data || []);
    return raw.map((t: any) => ({
      symbol: String(t.symbol || t.pair),
      price: Number(t.price ?? t.bid ?? 0),
      changePercent: Number(t.changePercent ?? t.change_percent ?? 0),
    })).filter((t: MarketTick) => symbols.includes(t.symbol) && t.price > 0);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchLiveTicks(symbols: string[]): Promise<MarketTick[]> {
  const config = await getMarketDataConfig();
  const vpsCfg = await getVpsBridgeConfig();
  const unique = [...new Set(symbols)].slice(0, 10);
  const map = new Map<string, MarketTick>();

  const preferVps = config.provider === "vps" || (config.provider === "auto" && vpsCfg.enabled && vpsCfg.host);
  if (preferVps) {
    const vps = await fetchVpsMarketQuotes(unique);
    vps.ticks?.forEach(t => { if (t.price > 0) map.set(t.symbol, t); });
  }

  if (config.customApiUrl) {
    const custom = await fetchCustomApiTicks(unique, config);
    custom.forEach(t => map.set(t.symbol, t));
  }

  const pub = await fetchPublicMarketTicks(unique);
  pub.forEach(t => { if (!map.has(t.symbol)) map.set(t.symbol, t); });

  return unique.map(s => map.get(s)).filter((t): t is MarketTick => !!t && t.price > 0);
}

export async function testMarketDataConnection(): Promise<{ ok: boolean; message: string; sample?: MarketTick[] }> {
  const sample = await fetchPublicMarketTicks(["BTC/USD", "EUR/USD", "XAU/USD", "USD/JPY"]);
  if (sample.length) {
    return { ok: true, message: `Live data OK — ${sample.length} pair(s)`, sample };
  }
  return { ok: false, message: "Could not fetch live quotes from public APIs." };
}
