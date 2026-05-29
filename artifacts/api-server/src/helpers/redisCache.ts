import { getRedis } from "./redis";
import { logger } from "../lib/logger";

export async function getCachedJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const redis = getRedis();
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) return JSON.parse(cached) as T;
    } catch (err) {
      logger.warn({ err, key }, "Redis cache read failed");
    }
  }

  const value = await loader();

  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    } catch (err) {
      logger.warn({ err, key }, "Redis cache write failed");
    }
  }

  return value;
}

export async function invalidateRedisCache(keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, "Redis cache invalidation failed");
  }
}

export async function invalidateRedisCacheByPrefix(prefix: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await redis.scan(cursor, "MATCH", `${prefix}*`, "COUNT", 100);
      cursor = next;
      if (keys.length) await redis.del(...keys);
    } while (cursor !== "0");
  } catch (err) {
    logger.warn({ err, prefix }, "Redis cache prefix invalidation failed");
  }
}
