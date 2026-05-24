import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface TradeCopierConfig {
  baseUrl: string;
  authType: "api_key" | "bearer" | "basic_auth";
  apiKey: string;
  username: string;
  password: string;
  masterAccountId: string;
}

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value || "";
}

async function saveSetting(key: string, value: string, label: string, category = "trade_copier") {
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value, label, category });
  }
}

export async function getTradeCopierConfig(): Promise<TradeCopierConfig> {
  const [baseUrl, authType, apiKey, username, password, masterAccountId] = await Promise.all([
    getSetting("tc_base_url"),
    getSetting("tc_auth_type"),
    getSetting("tc_api_key"),
    getSetting("tc_username"),
    getSetting("tc_password"),
    getSetting("tc_master_account_id"),
  ]);
  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    authType: (authType as TradeCopierConfig["authType"]) || "api_key",
    apiKey,
    username,
    password,
    masterAccountId,
  };
}

export async function saveTradeCopierConfig(cfg: Partial<TradeCopierConfig>) {
  const ops: Promise<void>[] = [];
  if (cfg.baseUrl !== undefined)        ops.push(saveSetting("tc_base_url", cfg.baseUrl, "Trade Copier Base URL"));
  if (cfg.authType !== undefined)       ops.push(saveSetting("tc_auth_type", cfg.authType, "Trade Copier Auth Type"));
  if (cfg.apiKey !== undefined)         ops.push(saveSetting("tc_api_key", cfg.apiKey, "Trade Copier API Key"));
  if (cfg.username !== undefined)       ops.push(saveSetting("tc_username", cfg.username, "Trade Copier Username"));
  if (cfg.password !== undefined)       ops.push(saveSetting("tc_password", cfg.password, "Trade Copier Password"));
  if (cfg.masterAccountId !== undefined) ops.push(saveSetting("tc_master_account_id", cfg.masterAccountId, "Trade Copier Master Account ID"));
  await Promise.all(ops);
}

function buildHeaders(cfg: TradeCopierConfig): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Accept": "application/json" };
  if (cfg.authType === "api_key" && cfg.apiKey) {
    headers["X-API-Key"] = cfg.apiKey;
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  } else if (cfg.authType === "bearer" && cfg.apiKey) {
    headers["Authorization"] = `Bearer ${cfg.apiKey}`;
  } else if (cfg.authType === "basic_auth" && cfg.username) {
    headers["Authorization"] = "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
  }
  return headers;
}

export async function testTradeCopierConnection(): Promise<{ ok: boolean; status?: number; message: string }> {
  const cfg = await getTradeCopierConfig();
  if (!cfg.baseUrl) return { ok: false, message: "Base URL not configured" };

  const testPaths = ["/ping", "/health", "/status", "/v1/ping", "/api/ping", "/accounts"];
  for (const path of testPaths) {
    try {
      const res = await fetch(`${cfg.baseUrl}${path}`, {
        method: "GET",
        headers: buildHeaders(cfg),
        signal: AbortSignal.timeout(8000),
      });
      if (res.status < 500) {
        return { ok: res.ok || res.status === 401, status: res.status, message: res.ok ? "Connection successful" : `Reached server (HTTP ${res.status}) — check credentials` };
      }
    } catch { continue; }
  }
  return { ok: false, message: "Could not reach trade copier server. Check the base URL." };
}

export interface RegisterSlavePayload {
  slaveLogin: string;
  slaveName: string;
  masterAccountId?: string;
  profitSharingPercent?: number;
  platform?: string;
  details?: string;
}

export async function registerSlave(payload: RegisterSlavePayload): Promise<{ ok: boolean; slaveId?: string; raw?: any }> {
  const cfg = await getTradeCopierConfig();
  if (!cfg.baseUrl) return { ok: false };

  const body = {
    login: payload.slaveLogin,
    name: payload.slaveName,
    master_account_id: payload.masterAccountId || cfg.masterAccountId,
    profit_sharing_percent: payload.profitSharingPercent,
    platform: payload.platform || "mt5",
    notes: payload.details,
  };

  try {
    const res = await fetch(`${cfg.baseUrl}/v1/slaves`, {
      method: "POST",
      headers: buildHeaders(cfg),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => ({})) as Record<string, any>;
    return { ok: res.ok, slaveId: json.id || json.slave_id || json.slaveId, raw: json };
  } catch {
    return { ok: false };
  }
}

export async function removeSlave(slaveId: string): Promise<{ ok: boolean }> {
  const cfg = await getTradeCopierConfig();
  if (!cfg.baseUrl || !slaveId) return { ok: false };

  try {
    const res = await fetch(`${cfg.baseUrl}/v1/slaves/${slaveId}`, {
      method: "DELETE",
      headers: buildHeaders(cfg),
      signal: AbortSignal.timeout(10000),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false };
  }
}

export async function listSlaves(): Promise<{ ok: boolean; data?: any[] }> {
  const cfg = await getTradeCopierConfig();
  if (!cfg.baseUrl) return { ok: false };
  try {
    const res = await fetch(`${cfg.baseUrl}/v1/slaves`, {
      method: "GET",
      headers: buildHeaders(cfg),
      signal: AbortSignal.timeout(10000),
    });
    const json = await res.json().catch(() => []) as any;
    return { ok: res.ok, data: Array.isArray(json) ? json : (json.data || json.slaves || []) };
  } catch {
    return { ok: false };
  }
}
