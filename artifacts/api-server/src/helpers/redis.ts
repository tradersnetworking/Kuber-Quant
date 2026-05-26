import Redis from "ioredis";
import { logger } from "../lib/logger";

let client: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
    });
    client.on("error", (err) => {
      logger.warn({ err }, "Redis connection error");
    });
  }

  return client;
}

export async function pingRedis(): Promise<"ok" | "error" | "skipped"> {
  const redis = getRedis();
  if (!redis) return "skipped";

  try {
    if (redis.status !== "ready") {
      await redis.connect();
    }
    const pong = await redis.ping();
    return pong === "PONG" ? "ok" : "error";
  } catch {
    return "error";
  }
}
