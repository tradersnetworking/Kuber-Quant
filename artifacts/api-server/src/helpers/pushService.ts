import webpush from "web-push";
import { db, pushSubscriptionsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

const VAPID_PUBLIC_KEY = "push_vapid_public_key";
const VAPID_PRIVATE_KEY = "push_vapid_private_key";
const VAPID_SUBJECT = "push_vapid_subject";

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? null;
}

async function saveSetting(key: string, value: string, label: string) {
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value, updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value, label, category: "notifications" });
  }
}

export async function ensureVapidKeys() {
  let publicKey = await getSetting(VAPID_PUBLIC_KEY);
  let privateKey = await getSetting(VAPID_PRIVATE_KEY);
  let subject = await getSetting(VAPID_SUBJECT) || process.env.VAPID_SUBJECT || "mailto:support@kuberquant.com";

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    await saveSetting(VAPID_PUBLIC_KEY, publicKey, "Push VAPID Public Key");
    await saveSetting(VAPID_PRIVATE_KEY, privateKey, "Push VAPID Private Key");
    await saveSetting(VAPID_SUBJECT, subject, "Push VAPID Subject");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, subject, configured: true };
}

export async function getVapidPublicKey() {
  const { publicKey } = await ensureVapidKeys();
  return publicKey;
}

export async function subscribePush(userId: number, subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}, userAgent?: string) {
  const [existing] = await db.select().from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint)).limit(1);

  if (existing) {
    await db.update(pushSubscriptionsTable).set({
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent: userAgent || null,
    }).where(eq(pushSubscriptionsTable.id, existing.id));
    return existing.id;
  }

  const [row] = await db.insert(pushSubscriptionsTable).values({
    userId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    userAgent: userAgent || null,
  }).returning();
  return row.id;
}

export async function unsubscribePush(userId: number, endpoint: string) {
  await db.delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, endpoint));
}

export async function sendPushToUser(userId: number, payload: {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}) {
  await ensureVapidKeys();
  const subs = await db.select().from(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.userId, userId));

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/notifications",
    tag: payload.tag || "kuber-notification",
  });

  for (const sub of subs) {
    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      }, body);
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
      }
    }
  }
}

export async function getPushStats() {
  const subs = await db.select().from(pushSubscriptionsTable);
  return { subscribers: subs.length, uniqueUsers: new Set(subs.map(s => s.userId)).size };
}
