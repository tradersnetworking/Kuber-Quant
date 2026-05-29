import { useQuery } from "@tanstack/react-query";
import { fetchLiveExchangeRates, type ExchangeRateSnapshot } from "@/lib/live-exchange-rates";
import { lightQueryOptions } from "@/lib/query-config";

const QUERY_KEY = ["/api/market/exchange-rates"];
const EXCHANGE_RATE_STALE_MS = 5 * 60 * 1000;

export function useLiveExchangeRates(enabled = true) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchLiveExchangeRates,
    enabled,
    refetchInterval: EXCHANGE_RATE_STALE_MS,
    ...lightQueryOptions,
    staleTime: EXCHANGE_RATE_STALE_MS,
  });
}

export function pickExchangeRates(
  primary?: ExchangeRateSnapshot | null,
  fallback?: ExchangeRateSnapshot | null,
): ExchangeRateSnapshot | null {
  if (primary?.USD_INR) return primary;
  if (fallback?.USD_INR) return fallback;
  return null;
}
