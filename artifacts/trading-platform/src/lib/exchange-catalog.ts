import { CRYPTO_DEPOSIT_TABS } from "@/components/wallet/crypto-networks";
import { exchangeChainDisplay, exchangeCryptoSymbol } from "@/lib/exchange-display";

export type ExchangeRateRow = {
  id: number;
  symbol: string;
  network: string;
  label: string;
  buyPriceUsd: number;
  sellPriceUsd: number;
  buyPriceInr: number | null;
  sellPriceInr: number | null;
  platformSellRateUsd: number;
  platformBuyRateUsd: number;
  platformSellRateInr: number;
  platformBuyRateInr: number;
  platformSellRateFiat: number;
  platformBuyRateFiat: number;
  fiatCurrency: string;
  minBuyUsd: number;
  minSellUsd: number;
  isEnabled: boolean;
  buyEnabled: boolean;
  sellEnabled: boolean;
  sortOrder: number;
  gatewayId?: number;
  gatewayName?: string;
  gatewayEnabled?: boolean;
  hasWallet?: boolean;
  walletAddress?: string | null;
  coinName?: string | null;
};

/** Client fallback when API returns empty — legacy static list. */
export const EXCHANGE_RATE_CATALOG: ExchangeRateRow[] = CRYPTO_DEPOSIT_TABS.map((t, i) => ({
  id: 0,
  symbol: t.symbol,
  network: t.network || "",
  label: t.label,
  buyPriceUsd: 0,
  sellPriceUsd: 0,
  buyPriceInr: null,
  sellPriceInr: null,
  platformSellRateUsd: 0,
  platformBuyRateUsd: 0,
  platformSellRateInr: 0,
  platformBuyRateInr: 0,
  platformSellRateFiat: 0,
  platformBuyRateFiat: 0,
  fiatCurrency: "INR",
  minBuyUsd: 10,
  minSellUsd: 10,
  isEnabled: true,
  buyEnabled: true,
  sellEnabled: true,
  sortOrder: i + 1,
}));

/** Use payment-gateway–synced API rates; fallback to static catalog only when empty. */
export function mergeExchangeRatesWithCatalog(apiRates: ExchangeRateRow[]): ExchangeRateRow[] {
  if (!apiRates?.length) return EXCHANGE_RATE_CATALOG;
  return [...apiRates].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** User Buy tab — "Our selling rate" (admin selling rate / platform sells to user). */
export function ourSellingRateInr(r: ExchangeRateRow): number {
  return r.platformSellRateInr || r.platformSellRateFiat || 0;
}

/** User Sell tab — "Our buying rate" (admin buying rate / platform buys from user). */
export function ourBuyingRateInr(r: ExchangeRateRow): number {
  return r.platformBuyRateInr || r.platformBuyRateFiat || 0;
}

export function rateRowKey(r: { symbol: string; network: string }) {
  return `${r.symbol.toUpperCase()}|${(r.network || "").trim()}`;
}

export function catalogDisplaySymbol(r: { symbol: string; coinName?: string | null }) {
  if (r.coinName) return `${r.coinName} (${r.symbol.toUpperCase()})`;
  return exchangeCryptoSymbol(r);
}

export function catalogChainDisplay(r: { symbol: string; network: string }) {
  return exchangeChainDisplay(r.symbol, r.network || "");
}

export function isExchangeRateActive(r: ExchangeRateRow): boolean {
  return r.isEnabled !== false;
}

export function isBuyVisibleToUser(r: ExchangeRateRow): boolean {
  return r.buyEnabled !== false && (r.isEnabled !== false);
}

export function isSellVisibleToUser(r: ExchangeRateRow): boolean {
  return r.sellEnabled !== false && (r.isEnabled !== false) && r.hasWallet === true;
}

export function truncateWallet(addr?: string | null, head = 8, tail = 6): string {
  if (!addr) return "—";
  if (addr.length <= head + tail + 3) return addr;
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}
