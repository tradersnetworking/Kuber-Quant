import { randomBytes } from "crypto";
import { getRedis } from "./redis";

const memory = new Map<string, { challenge: string; expires: number }>();
const TTL_SEC = 5 * 60;
const PREFIX = "webauthn:challenge:";

function purgeMemory() {
  const now = Date.now();
  for (const [k, v] of memory) {
    if (v.expires < now) memory.delete(k);
  }
}

export async function storeWebauthnChallenge(key: string, challenge: string): Promise<void> {
  purgeMemory();
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.set(`${PREFIX}${key}`, challenge, "EX", TTL_SEC);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(key, { challenge, expires: Date.now() + TTL_SEC * 1000 });
}

export async function consumeWebauthnChallenge(key: string, expected: string): Promise<boolean> {
  purgeMemory();
  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const fullKey = `${PREFIX}${key}`;
      const stored = await redis.get(fullKey);
      if (stored === null) return false;
      await redis.del(fullKey);
      return stored === expected;
    } catch {
      /* fall through */
    }
  }
  const entry = memory.get(key);
  if (!entry || entry.expires < Date.now()) return false;
  memory.delete(key);
  return entry.challenge === expected;
}

export function newChallengeKey(prefix: string, userId?: number): string {
  return `${prefix}:${userId ?? "anon"}:${randomBytes(12).toString("hex")}`;
}
