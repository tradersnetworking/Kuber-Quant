import { getRedis } from "./redis";
import { logger } from "../lib/logger";

const CHANNEL_PREFIX = "notif:user:";

export type NotificationStreamEvent = {
  type: "notification";
  notification: Record<string, unknown>;
};

export function publishNotificationEvent(userId: number, notification: Record<string, unknown>): void {
  const redis = getRedis();
  const payload: NotificationStreamEvent = { type: "notification", notification };
  const message = JSON.stringify(payload);

  if (redis) {
    void redis.publish(`${CHANNEL_PREFIX}${userId}`, message).catch(err => {
      logger.warn({ err, userId }, "Notification pub/sub publish failed");
    });
    return;
  }

  // In-memory fallback for single-instance dev without Redis
  inMemoryEmit(userId, message);
}

type Subscriber = (message: string) => void;
const inMemoryChannels = new Map<number, Set<Subscriber>>();

function inMemoryEmit(userId: number, message: string) {
  const subs = inMemoryChannels.get(userId);
  if (!subs) return;
  for (const fn of subs) {
    try { fn(message); } catch { /* ignore */ }
  }
}

export async function subscribeUserNotifications(
  userId: number,
  onMessage: (message: string) => void,
): Promise<() => void> {
  const redis = getRedis();

  if (redis) {
    const sub = redis.duplicate();
    const channel = `${CHANNEL_PREFIX}${userId}`;

    const handler = (ch: string, message: string) => {
      if (ch === channel) onMessage(message);
    };

    sub.on("message", handler);
    await sub.subscribe(channel);

    return () => {
      sub.off("message", handler);
      void sub.unsubscribe(channel).finally(() => sub.disconnect());
    };
  }

  let subs = inMemoryChannels.get(userId);
  if (!subs) {
    subs = new Set();
    inMemoryChannels.set(userId, subs);
  }
  subs.add(onMessage);

  return () => {
    subs!.delete(onMessage);
    if (subs!.size === 0) inMemoryChannels.delete(userId);
  };
}
