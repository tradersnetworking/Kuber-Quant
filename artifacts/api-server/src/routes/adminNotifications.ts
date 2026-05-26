import { Router } from "express";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import {
  broadcastNotification,
  getPlatformNotifications,
  getNotificationStats,
} from "../helpers/notificationService";
import { getPushStats, ensureVapidKeys } from "../helpers/pushService";

const router = Router();

router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  const [stats, push] = await Promise.all([
    getNotificationStats(),
    getPushStats(),
  ]);
  res.json({ ...stats, push });
});

router.get("/", requireAuth, requireAdmin, async (req, res) => {
  const limit = Number(req.query.limit) || 100;
  const offset = Number(req.query.offset) || 0;
  const category = req.query.category as string | undefined;
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const entries = await getPlatformNotifications({ limit, offset, category, userId });
  res.json({ entries, limit, offset });
});

router.post("/broadcast", requireAuth, requireAdmin, async (req, res) => {
  const { title, message, type, category, actionUrl, targetRole, userIds, sendPush } = req.body;
  if (!title || !message) {
    res.status(400).json({ error: "title and message are required" });
    return;
  }
  const sent = await broadcastNotification({
    title,
    message,
    type,
    category: category || "system",
    actionUrl,
    targetRole,
    userIds,
    sendPush: sendPush !== false,
  });
  res.status(201).json({ sent: sent.length, notifications: sent.slice(0, 10) });
});

router.get("/push-config", requireAuth, requireAdmin, async (_req, res) => {
  const { publicKey, subject, configured } = await ensureVapidKeys();
  const push = await getPushStats();
  res.json({
    configured,
    publicKey,
    subject,
    pushEnabled: configured,
    ...push,
  });
});

export default router;
