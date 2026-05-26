import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  getUserNotifications,
  getUnreadCount,
  markAllRead,
  mapNotification,
} from "../helpers/notificationService";
import { getVapidPublicKey, subscribePush, unsubscribePush } from "../helpers/pushService";
import { db, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const category = req.query.category as string | undefined;
  const limit = Number(req.query.limit) || 50;
  const rows = await getUserNotifications(userId, { limit, category });
  res.json(rows);
});

router.get("/unread-count", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const count = await getUnreadCount(userId);
  res.json({ count });
});

router.get("/since/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const sinceId = Number(req.params.id);
  const rows = await getUserNotifications(userId, { limit: 20 });
  const newOnes = rows.filter(r => r.id > sinceId && !r.isRead);
  res.json({ notifications: newOnes, latestId: rows[0]?.id ?? sinceId });
});

router.post("/read-all", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  await markAllRead(userId);
  res.json({ message: "All marked as read" });
});

router.post("/:id/read", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [notif] = await db.select().from(notificationsTable)
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId))).limit(1);
  if (!notif) {
    res.status(404).json({ error: "Notification not found" });
    return;
  }
  const [updated] = await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.id, id)).returning();
  res.json(mapNotification(updated));
});

router.get("/push/vapid-public-key", requireAuth, async (_req, res) => {
  const publicKey = await getVapidPublicKey();
  res.json({ publicKey });
});

router.post("/push/subscribe", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { subscription } = req.body;
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    res.status(400).json({ error: "Valid push subscription required" });
    return;
  }
  await subscribePush(userId, subscription, req.headers["user-agent"] as string);
  res.json({ message: "Push notifications enabled" });
});

router.post("/push/unsubscribe", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "endpoint is required" });
    return;
  }
  await unsubscribePush(userId, endpoint);
  res.json({ message: "Push notifications disabled" });
});

export default router;
