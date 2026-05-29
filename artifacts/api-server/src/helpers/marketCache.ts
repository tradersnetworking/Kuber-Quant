import { getRedis } from "./redis";
import { logger } from "../lib/logger";

type CacheEntry = { data: unknown[]; fetchedAt: number };

const memoryCache = new Map<string, CacheEntry>();
const REDIS_PREFIX = "cache:market-ticker:";
const REDIS_TTL_SEC = 30;

export function getMarketTickerCache(key: string): CacheEntry | undefined {
  return memoryCache.get(key);
}

export async function getSharedMarketTickerCache(key: string): Promise<CacheEntry | undefined> {
  const local = memoryCache.get(key);
  if (local) return local;

  const redis = getRedis();
  if (!redis) return undefined;

  try {
    const raw = await redis.get(`${REDIS_PREFIX}${key}`);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as CacheEntry;
    memoryCache.set(key, parsed);
    return parsed;
  } catch (err) {
    logger.warn({ err, key }, "Market ticker Redis cache read failed");
    return undefined;
  }
}

export async function setMarketTickerCache(key: string, data: unknown[], fetchedAt: number) {
  const entry = { data, fetchedAt };
  memoryCache.set(key, entry);

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(`${REDIS_PREFIX}${key}`, JSON.stringify(entry), "EX", REDIS_TTL_SEC);
  } catch (err) {
    logger.warn({ err, key }, "Market ticker Redis cache write failed");
  }
}

export function clearMarketTickerCache() {
  memoryCache.clear();
  const redis = getRedis();
  if (!redis) return;
  void (async () => {
    try {
      let cursor = "0";
      do {
        const [next, keys] = await redis.scan(cursor, "MATCH", `${REDIS_PREFIX}*`, "COUNT", 100);
        cursor = next;
        if (keys.length) await redis.del(...keys);
      } while (cursor !== "0");
    } catch (err) {
      logger.warn({ err }, "Market ticker Redis cache clear failed");
    }
  })();
}
