type CacheEntry = { data: unknown[]; fetchedAt: number };

const cache = new Map<string, CacheEntry>();

export function getMarketTickerCache(key: string): CacheEntry | undefined {
  return cache.get(key);
}

export function setMarketTickerCache(key: string, data: unknown[], fetchedAt: number) {
  cache.set(key, { data, fetchedAt });
}

export function clearMarketTickerCache() {
  cache.clear();
}
