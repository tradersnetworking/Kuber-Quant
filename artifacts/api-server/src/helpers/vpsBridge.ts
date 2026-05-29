import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

export interface VpsBridgeConfig {
  enabled: boolean;
  host: string;
  port: number;
  basePath: string;
  apiKey: string;
  useHttps: boolean;
  marketQuotesPath: string;
  tradeCopierDumpPath: string;
  notes: string;
}

const DEFAULTS: VpsBridgeConfig = {
  enabled: false,
  host: "",
  port: 8080,
  basePath: "/api",
  apiKey: "",
  useHttps: true,
  marketQuotesPath: "/v1/quotes",
  tradeCopierDumpPath: "/v1/trades/dump",
  notes: "",
};

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value || "";
}

async function saveSetting(key: string, value: string, label: string) {
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value, label, category: "vps_bridge" });
  }
}

export async function getVpsBridgeConfig(): Promise<VpsBridgeConfig> {
  const [enabled, host, port, basePath, apiKey, useHttps, marketQuotesPath, tradeCopierDumpPath, notes] = await Promise.all([
    getSetting("vps_enabled"),
    getSetting("vps_host"),
    getSetting("vps_port"),
    getSetting("vps_base_path"),
    getSetting("vps_api_key"),
    getSetting("vps_use_https"),
    getSetting("vps_market_quotes_path"),
    getSetting("vps_trade_dump_path"),
    getSetting("vps_notes"),
  ]);
  return {
    enabled: enabled === "true",
    host: host || DEFAULTS.host,
    port: port ? Number(port) : DEFAULTS.port,
    basePath: basePath || DEFAULTS.basePath,
    apiKey: apiKey || "",
    useHttps: useHttps !== "false",
    marketQuotesPath: marketQuotesPath || DEFAULTS.marketQuotesPath,
    tradeCopierDumpPath: tradeCopierDumpPath || DEFAULTS.tradeCopierDumpPath,
    notes: notes || "",
  };
}

export async function saveVpsBridgeConfig(cfg: Partial<VpsBridgeConfig>) {
  const ops: Promise<void>[] = [];
  if (cfg.enabled !== undefined) ops.push(saveSetting("vps_enabled", String(cfg.enabled), "VPS Bridge Enabled"));
  if (cfg.host !== undefined) ops.push(saveSetting("vps_host", cfg.host, "VPS Host"));
  if (cfg.port !== undefined) ops.push(saveSetting("vps_port", String(cfg.port), "VPS Port"));
  if (cfg.basePath !== undefined) ops.push(saveSetting("vps_base_path", cfg.basePath, "VPS Base Path"));
  if (cfg.apiKey !== undefined) ops.push(saveSetting("vps_api_key", cfg.apiKey, "VPS API Key"));
  if (cfg.useHttps !== undefined) ops.push(saveSetting("vps_use_https", String(cfg.useHttps), "VPS HTTPS"));
  if (cfg.marketQuotesPath !== undefined) ops.push(saveSetting("vps_market_quotes_path", cfg.marketQuotesPath, "VPS Market Quotes Path"));
  if (cfg.tradeCopierDumpPath !== undefined) ops.push(saveSetting("vps_trade_dump_path", cfg.tradeCopierDumpPath, "VPS Trade Dump Path"));
  if (cfg.notes !== undefined) ops.push(saveSetting("vps_notes", cfg.notes, "VPS Notes"));
  await Promise.all(ops);
}

export function buildVpsUrl(cfg: VpsBridgeConfig, path: string): string {
  const protocol = cfg.useHttps ? "https" : "http";
  const base = `${protocol}://${cfg.host}${cfg.port ? `:${cfg.port}` : ""}${cfg.basePath.replace(/\/$/, "")}`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function testVpsBridgeConnection(): Promise<{ ok: boolean; message: string; status?: number }> {
  const cfg = await getVpsBridgeConfig();
  if (!cfg.host) return { ok: false, message: "VPS host not configured" };

  const testPaths = ["/ping", "/health", "/status", cfg.marketQuotesPath, "/v1/ping"];
  const headers: Record<string, string> = { Accept: "application/json" };
  if (cfg.apiKey) {
    headers["X-API-Key"] = cfg.apiKey;
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  }

  for (const path of testPaths) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(buildVpsUrl(cfg, path), {
        method: "GET",
        headers,
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.status < 500) {
        return {
          ok: res.ok || res.status === 401,
          status: res.status,
          message: res.ok ? "VPS bridge reachable" : `VPS responded (HTTP ${res.status}) — check API key`,
        };
      }
    } catch { clearTimeout(timer); continue; }
  }
  return { ok: false, message: "Could not reach Windows VPS bridge. Check host, port, and firewall." };
}

export async function fetchVpsMarketQuotes(symbols: string[]): Promise<{ ok: boolean; ticks?: Array<{ symbol: string; price: number; changePercent: number }> }> {
  const cfg = await getVpsBridgeConfig();
  if (!cfg.enabled || !cfg.host) return { ok: false };

  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (cfg.apiKey) {
    headers["X-API-Key"] = cfg.apiKey;
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  }

  const url = `${buildVpsUrl(cfg, cfg.marketQuotesPath)}?symbols=${encodeURIComponent(symbols.join(","))}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false };
    const json = await res.json() as any;
    const raw = Array.isArray(json) ? json : (json.ticks || json.quotes || json.data || []);
    const ticks = raw.map((t: any) => ({
      symbol: String(t.symbol || t.pair || t.name),
      price: Number(t.price ?? t.bid ?? t.last ?? 0),
      changePercent: Number(t.changePercent ?? t.change_percent ?? t.change24h ?? 0),
    })).filter((t: any) => t.symbol && t.price);
    return { ok: ticks.length > 0, ticks };
  } catch {
    clearTimeout(timer);
    return { ok: false };
  }
}

export async function dumpTradesToVps(payload: Record<string, unknown>): Promise<{ ok: boolean; message?: string }> {
  const cfg = await getVpsBridgeConfig();
  if (!cfg.enabled || !cfg.host) return { ok: false, message: "VPS bridge disabled" };

  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (cfg.apiKey) {
    headers["X-API-Key"] = cfg.apiKey;
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(buildVpsUrl(cfg, cfg.tradeCopierDumpPath), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    return { ok: res.ok, message: res.ok ? "Dump sent to VPS" : `VPS dump failed (HTTP ${res.status})` };
  } catch (err: any) {
    clearTimeout(timer);
    return { ok: false, message: err.message || "VPS dump failed" };
  }
}
