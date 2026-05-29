import { randomBytes, randomInt } from "crypto";
import { getRedis } from "./redis";

type CaptchaEntry = { answer: number; expires: number };

const memoryStore = new Map<string, CaptchaEntry>();
const CAPTCHA_TTL_SEC = 15 * 60;
const REDIS_PREFIX = "captcha:";

function purgeExpiredMemory() {
  const now = Date.now();
  for (const [k, v] of memoryStore) {
    if (v.expires < now) memoryStore.delete(k);
  }
}

export async function createCaptchaChallenge(): Promise<{ captchaToken: string; question: string }> {
  purgeExpiredMemory();
  const a = randomInt(1, 10);
  const b = randomInt(1, 10);
  const token = randomBytes(16).toString("hex");
  const answer = a + b;

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.set(`${REDIS_PREFIX}${token}`, String(answer), "EX", CAPTCHA_TTL_SEC);
      return { captchaToken: token, question: `${a} + ${b}` };
    } catch {
      // fall through to memory
    }
  }

  memoryStore.set(token, { answer, expires: Date.now() + CAPTCHA_TTL_SEC * 1000 });
  return { captchaToken: token, question: `${a} + ${b}` };
}

export async function verifyCaptchaChallenge(token: string, answer: string | number): Promise<boolean> {
  purgeExpiredMemory();
  const numericAnswer = Number(answer);

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const key = `${REDIS_PREFIX}${token}`;
      const stored = await redis.get(key);
      if (stored !== null) {
        const ok = Number(stored) === numericAnswer;
        if (ok) await redis.del(key);
        return ok;
      }
    } catch {
      // fall through
    }
  }

  const entry = memoryStore.get(token);
  if (!entry || entry.expires < Date.now()) return false;
  const ok = entry.answer === numericAnswer;
  if (ok) memoryStore.delete(token);
  return ok;
}
