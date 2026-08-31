import { db, siteSettingsTable } from "@workspace/db";
import { invalidateSiteSettingsCache } from "./siteSettings";
import { logger } from "../lib/logger";

export type FxRates = {
  base: "USD";
  /** 1 USD = X INR (Google Finance / open.er-api aligned) */
  USD_INR: number;
  /** 1 USD = X EUR */
  USD_EUR: number;
  /** USDT ≈ USD */
  USDT_USD: number;
  updatedAt: string;
  source: string;
};

const DEFAULT_RATES: FxRates = {
  base: "USD",
  USD_INR: 83.5,
  USD_EUR: 0.92,
  USDT_USD: 1,
  updatedAt: new Date(0).toISOString(),
  source: "fallback",
};

const CRYPTO = new Set(["BTC", "ETH", "USDT"]);

async function upsertSetting(key: string, value: string) {
  await db.insert(siteSettingsTable).values({
    key,
    value,
    label: key,
    category: "financial",
  }).onConflictDoUpdate({
    target: siteSettingsTable.key,
    set: { value, updatedAt: new Date() },
  });
}

/** Fetch live USD-base FX (same family as Google Finance USD/INR, USD/EUR). */
async function fetchLiveUsdRates(): Promise<{ USD_INR: number; USD_EUR: number; source: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: ctrl.signal,
      headers: { Accept: "application/json", "User-Agent": "KuberQuant/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json() as { rates?: Record<string, number> };
    const inr = Number(data.rates?.INR);
    const eur = Number(data.rates?.EUR);
    if (inr > 0 && eur > 0) {
      return { USD_INR: inr, USD_EUR: eur, source: "open.er-api.com (Google Finance aligned)" };
    }
  } catch (err) {
    logger.warn({ err }, "FX fetch failed");
  } finally {
    clearTimeout(timer);
  }
  return null;
}

export async function refreshExchangeRates(force = false): Promise<FxRates> {
  const existing = await getExchangeRates();
  const lastMs = new Date(existing.updatedAt).getTime();
  if (!force && lastMs > 0 && Date.now() - lastMs < 23 * 60 * 60 * 1000) {
    return existing;
  }

  const live = await fetchLiveUsdRates();
  const rates: FxRates = live
    ? {
        base: "USD",
        USD_INR: live.USD_INR,
        USD_EUR: live.USD_EUR,
        USDT_USD: 1,
        updatedAt: new Date().toISOString(),
        source: live.source,
      }
    : { ...existing, updatedAt: existing.updatedAt || new Date().toISOString() };

  await Promise.all([
    upsertSetting("usd_inr_rate", String(rates.USD_INR)),
    upsertSetting("usd_eur_rate", String(rates.USD_EUR)),
    upsertSetting("usdt_usd_rate", String(rates.USDT_USD)),
    upsertSetting("fx_rates_updated_at", rates.updatedAt),
    upsertSetting("fx_rates_source", rates.source),
  ]);
  invalidateSiteSettingsCache();
  logger.info({ USD_INR: rates.USD_INR, USD_EUR: rates.USD_EUR, source: rates.source }, "FX rates refreshed");
  return rates;
}

export async function getExchangeRates(): Promise<FxRates> {
  let all: { key: string; value: string }[];
  try {
    all = await db.select().from(siteSettingsTable);
  } catch {
    return DEFAULT_RATES;
  }
  const map = new Map(all.map(r => [r.key, r.value]));
  const inr = Number(map.get("usd_inr_rate"));
  const eur = Number(map.get("usd_eur_rate"));
  if (!inr || !eur) return DEFAULT_RATES;
  return {
    base: "USD",
    USD_INR: inr,
    USD_EUR: eur,
    USDT_USD: Number(map.get("usdt_usd_rate")) || 1,
    updatedAt: map.get("fx_rates_updated_at") || new Date(0).toISOString(),
    source: map.get("fx_rates_source") || "site_settings",
  };
}

export function usdToInr(usd: number, rates: FxRates): number {
  return parseFloat((usd * rates.USD_INR).toFixed(2));
}

export function usdToEur(usd: number, rates: FxRates): number {
  return parseFloat((usd * rates.USD_EUR).toFixed(2));
}

/** Convert an amount in given currency to USD (wallet base for fiat). */
export async function convertToUsd(amount: number, currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return amount;
  if (cur === "USDT") return amount * (await getExchangeRates()).USDT_USD;
  if (CRYPTO.has(cur)) return amount;
  const rates = await getExchangeRates();
  if (cur === "INR") return parseFloat((amount / rates.USD_INR).toFixed(8));
  if (cur === "EUR") return parseFloat((amount / rates.USD_EUR).toFixed(8));
  return amount;
}

/** Convert USD wallet amount to display currency. */
export async function convertFromUsd(usd: number, currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "USD") return usd;
  const rates = await getExchangeRates();
  if (cur === "INR") return usdToInr(usd, rates);
  if (cur === "EUR") return usdToEur(usd, rates);
  if (cur === "USDT") return parseFloat((usd / rates.USDT_USD).toFixed(8));
  return usd;
}

export function buildDualCurrencyFields(usdAmount: number, rates: FxRates) {
  return {
    usd: usdAmount,
    inr: usdToInr(usdAmount, rates),
    eur: usdToEur(usdAmount, rates),
    exchangeRateUsdInr: rates.USD_INR,
    exchangeRateUsdEur: rates.USD_EUR,
    exchangeRateUpdatedAt: rates.updatedAt,
    exchangeRateSource: rates.source,
  };
}
