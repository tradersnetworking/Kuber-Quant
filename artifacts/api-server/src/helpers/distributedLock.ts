import { getRedis } from "./redis";
import { logger } from "../lib/logger";

const memoryLocks = new Map<string, number>();

/**
 * Acquire a distributed lock (Redis SET NX EX) with in-memory fallback for single-instance dev.
 */
export async function withDistributedLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T | null> {
  const redis = getRedis();
  const lockKey = `lock:${key}`;

  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const acquired = await redis.set(lockKey, String(process.pid), "EX", ttlSeconds, "NX");
      if (acquired !== "OK") {
        logger.debug({ key }, "Distributed lock not acquired — skipping");
        return null;
      }
      try {
        return await fn();
      } finally {
        await redis.del(lockKey).catch(() => {});
      }
    } catch (err) {
      logger.warn({ err, key }, "Redis lock failed — falling back to memory lock");
    }
  }

  const now = Date.now();
  const existing = memoryLocks.get(lockKey);
  if (existing && existing > now) return null;
  memoryLocks.set(lockKey, now + ttlSeconds * 1000);
  try {
    return await fn();
  } finally {
    memoryLocks.delete(lockKey);
  }
}
