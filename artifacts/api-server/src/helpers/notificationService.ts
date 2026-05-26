import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";
import { sendPushToUser } from "./pushService";

export type NotificationCategory =
  | "deposit" | "withdrawal" | "service" | "kyc" | "investment"
  | "support" | "system" | "promo" | "security";

export type NotificationLevel = "info" | "success" | "warning" | "error";

export function mapNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    category: n.category,
    actionUrl: n.actionUrl || null,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  };
}

export async function notifyUser(opts: {
  userId: number;
  title: string;
  message: string;
  type?: NotificationLevel;
  category?: NotificationCategory;
  actionUrl?: string;
  sendPush?: boolean;
}) {
  const [row] = await db.insert(notificationsTable).values({
    userId: opts.userId,
    title: opts.title,
    message: opts.message,
    type: opts.type || "info",
    category: opts.category || "system",
    actionUrl: opts.actionUrl || null,
  }).returning();

  if (opts.sendPush !== false) {
    await sendPushToUser(opts.userId, {
      title: opts.title,
      body: opts.message,
      url: opts.actionUrl || "/notifications",
      tag: `${opts.category}-${row.id}`,
    }).catch(() => {});
  }

  return mapNotification(row);
}

export async function notifyUsers(userIds: number[], opts: Omit<Parameters<typeof notifyUser>[0], "userId">) {
  const results = [];
  for (const userId of userIds) {
    results.push(await notifyUser({ ...opts, userId }));
  }
  return results;
}

export async function broadcastNotification(opts: {
  title: string;
  message: string;
  type?: NotificationLevel;
  category?: NotificationCategory;
  actionUrl?: string;
  targetRole?: string;
  userIds?: number[];
  sendPush?: boolean;
}) {
  let userIds = opts.userIds || [];
  if (!userIds.length) {
    const users = await db.select({ id: usersTable.id, role: usersTable.role, isActive: usersTable.isActive })
      .from(usersTable);
    userIds = users
      .filter(u => u.isActive && (!opts.targetRole || u.role === opts.targetRole))
      .map(u => u.id);
  }
  return notifyUsers(userIds, {
    title: opts.title,
    message: opts.message,
    type: opts.type,
    category: opts.category || "system",
    actionUrl: opts.actionUrl,
    sendPush: opts.sendPush,
  });
}

export async function getUserNotifications(userId: number, opts: { limit?: number; category?: string } = {}) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const conditions = [eq(notificationsTable.userId, userId)];
  if (opts.category && opts.category !== "all") {
    conditions.push(eq(notificationsTable.category, opts.category as NotificationCategory));
  }
  const rows = await db.select().from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit);
  return rows.map(mapNotification);
}

export async function getUnreadCount(userId: number) {
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
  return row?.count ?? 0;
}

export async function markAllRead(userId: number) {
  await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));
}

export async function getPlatformNotifications(opts: {
  limit?: number;
  offset?: number;
  category?: string;
  userId?: number;
}) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  const conditions = [];
  if (opts.category && opts.category !== "all") {
    conditions.push(eq(notificationsTable.category, opts.category as NotificationCategory));
  }
  if (opts.userId) {
    conditions.push(eq(notificationsTable.userId, opts.userId));
  }

  const rows = await db.select().from(notificationsTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set(rows.map(r => r.userId))];
  const users = userIds.length
    ? await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  return rows.map(r => ({
    ...mapNotification(r),
    userEmail: userMap.get(r.userId)?.email || null,
    userName: userMap.get(r.userId)?.fullName || null,
  }));
}

export async function getNotificationStats() {
  const rows = await db.select({
    category: notificationsTable.category,
    total: sql<number>`count(*)::int`,
    unread: sql<number>`count(*) filter (where ${notificationsTable.isRead} = false)::int`,
  }).from(notificationsTable).groupBy(notificationsTable.category);

  const [totals] = await db.select({
    total: sql<number>`count(*)::int`,
    unread: sql<number>`count(*) filter (where ${notificationsTable.isRead} = false)::int`,
    today: sql<number>`count(*) filter (where ${notificationsTable.createdAt} >= now() - interval '24 hours')::int`,
  }).from(notificationsTable);

  return { byCategory: rows, totals: totals || { total: 0, unread: 0, today: 0 } };
}
