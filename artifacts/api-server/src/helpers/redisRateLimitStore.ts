import type { Store, Options, ClientRateLimitInfo } from "express-rate-limit";
import type Redis from "ioredis";
import { getRedis } from "./redis";
import { logger } from "../lib/logger";

/** In-memory fallback when Redis is unavailable. */
class MemoryRateLimitStore implements Store {
  private hits = new Map<string, { count: number; resetTime: Date }>();
  private windowMs = 900_000;

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  increment(key: string): ClientRateLimitInfo {
    const now = Date.now();
    const existing = this.hits.get(key);
    if (!existing || existing.resetTime.getTime() <= now) {
      const resetTime = new Date(now + this.windowMs);
      this.hits.set(key, { count: 1, resetTime });
      return { totalHits: 1, resetTime };
    }
    existing.count += 1;
    return { totalHits: existing.count, resetTime: existing.resetTime };
  }

  decrement(key: string): void {
    const existing = this.hits.get(key);
    if (existing && existing.count > 0) existing.count -= 1;
  }

  resetKey(key: string): void {
    this.hits.delete(key);
  }
}

class RedisRateLimitStore implements Store {
  private redis: Redis;
  prefix: string;
  private windowMs = 900_000;

  constructor(redis: Redis, prefix: string) {
    this.redis = redis;
    this.prefix = prefix;
  }

  init(options: Options): void {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = `${this.prefix}${key}`;
    const count = await this.redis.incr(redisKey);
    if (count === 1) {
      await this.redis.pexpire(redisKey, this.windowMs);
    }
    const ttl = await this.redis.pttl(redisKey);
    const resetTime = ttl > 0 ? new Date(Date.now() + ttl) : new Date(Date.now() + this.windowMs);
    return { totalHits: count, resetTime };
  }

  async decrement(key: string): Promise<void> {
    const redisKey = `${this.prefix}${key}`;
    const val = await this.redis.decr(redisKey);
    if (val < 0) await this.redis.set(redisKey, "0", "PX", this.windowMs);
  }

  async resetKey(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}

const storeCache = new Map<string, Store>();

/**
 * Shared rate-limit store — Redis when REDIS_URL is set, otherwise in-memory.
 */
export function createRateLimitStore(prefix: string): Store {
  if (storeCache.has(prefix)) return storeCache.get(prefix)!;

  const redis = getRedis();
  let store: Store;
  if (redis) {
    store = new RedisRateLimitStore(redis, prefix);
    logger.info({ prefix }, "Rate limit store: Redis");
  } else {
    store = new MemoryRateLimitStore();
    logger.info({ prefix }, "Rate limit store: in-memory fallback");
  }

  storeCache.set(prefix, store);
  return store;
}
