import { publicFetchJson } from "@/lib/api-fetch";

export type ExchangeRateSnapshot = {
  base?: string;
  USD_INR?: number;
  USD_EUR?: number;
  USDT_USD?: number;
  updatedAt?: string | null;
  source?: string;
};

export function usdToInrEstimate(usd: number, usdInr: number): number {
  return parseFloat((usd * usdInr).toFixed(2));
}

export async function fetchLiveExchangeRates(): Promise<ExchangeRateSnapshot> {
  return publicFetchJson<ExchangeRateSnapshot>("/market/exchange-rates");
}
