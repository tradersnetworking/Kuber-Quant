import { randomBytes } from "crypto";
import { getRedis } from "./redis";

type StreamTicketPayload = { userId: number; role: string };

const memoryStore = new Map<string, { payload: StreamTicketPayload; expires: number }>();
const TICKET_TTL_SEC = 60;
const REDIS_PREFIX = "sse-ticket:";

function purgeExpiredMemory() {
  const now = Date.now();
  for (const [key, entry] of memoryStore) {
    if (entry.expires < now) memoryStore.delete(key);
  }
}

export async function issueStreamTicket(payload: StreamTicketPayload): Promise<string> {
  purgeExpiredMemory();
  const ticket = randomBytes(24).toString("hex");
  const encoded = JSON.stringify(payload);

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      await redis.set(`${REDIS_PREFIX}${ticket}`, encoded, "EX", TICKET_TTL_SEC);
      return ticket;
    } catch {
      // fall through to memory
    }
  }

  memoryStore.set(ticket, { payload, expires: Date.now() + TICKET_TTL_SEC * 1000 });
  return ticket;
}

export async function verifyStreamTicket(ticket: string): Promise<StreamTicketPayload | null> {
  if (!ticket) return null;
  purgeExpiredMemory();

  const redis = getRedis();
  if (redis) {
    try {
      if (redis.status !== "ready") await redis.connect();
      const stored = await redis.get(`${REDIS_PREFIX}${ticket}`);
      if (stored) {
        const parsed = JSON.parse(stored) as StreamTicketPayload;
        if (typeof parsed.userId === "number" && typeof parsed.role === "string") return parsed;
      }
    } catch {
      // fall through
    }
  }

  const entry = memoryStore.get(ticket);
  if (!entry || entry.expires < Date.now()) return null;
  return entry.payload;
}
