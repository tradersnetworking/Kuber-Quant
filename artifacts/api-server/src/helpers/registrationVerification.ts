import { randomBytes } from "crypto";
import { getRedis } from "./redis";

type Entry = { email: string; channel: string; expires: number };

const memoryStore = new Map<string, Entry>();
const TTL_SEC = 30 * 60;
const REDIS_PREFIX = "reg-verify:";

function purgeExpiredMemory() {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expires < now) memoryStore.delete(k);
  }
}

export async function issueRegistrationVerification(email: string, channel: string): Promise<string> {
  purgeExpiredMemory();
  const token = randomBytes(24).toString("hex");
  const entry: Entry = { email: email.toLowerCase(), channel, expires: Date.now() + TTL_SEC * 1000 };

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.set(`${REDIS_PREFIX}${token}`, JSON.stringify(entry), "EX", TTL_SEC);
      return token;
    } catch {
      // fall through
    }
  }

  memoryStore.set(token, entry);
  return token;
}

export async function consumeRegistrationVerification(token: string, email: string, channel: string): Promise<boolean> {
  purgeExpiredMemory();
  const normalizedEmail = email.toLowerCase();

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const key = `${REDIS_PREFIX}${token}`;
      const raw = await redis.get(key);
      if (raw) {
        const entry = JSON.parse(raw) as Entry;
        const ok = entry.email === normalizedEmail && entry.channel === channel && entry.expires > Date.now();
        if (ok) await redis.del(key);
        return ok;
      }
    } catch {
      // fall through
    }
  }

  const entry = memoryStore.get(token);
  if (!entry || entry.expires < Date.now()) return false;
  if (entry.email !== normalizedEmail || entry.channel !== channel) return false;
  memoryStore.delete(token);
  return true;
}
