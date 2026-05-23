import { Router } from "express";
import { db, usersTable, referralEarningsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/stats", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const earnings = await db.select().from(referralEarningsTable)
    .where(eq(referralEarningsTable.referrerId, userId));

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEarnings = earnings.filter(e => e.createdAt >= startOfMonth);

  const totalEarnings = earnings.reduce((s, e) => s + Number(e.amount), 0);
  const pendingEarnings = earnings.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
  const thisMonthReferredUsers = await db.select().from(usersTable)
    .where(eq(usersTable.referredBy, userId));

  res.json({
    referralCode: user.referralCode || `KC${userId.toString().padStart(6, "0")}`,
    totalReferrals: user.referralCount || 0,
    totalEarnings,
    pendingEarnings,
    thisMonthReferrals: thisMonthReferredUsers.filter(u => u.createdAt >= startOfMonth).length,
    thisMonthEarnings: thisMonthEarnings.reduce((s, e) => s + Number(e.amount), 0),
  });
});

router.get("/earnings", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const earnings = await db.select().from(referralEarningsTable)
    .where(eq(referralEarningsTable.referrerId, userId))
    .orderBy(desc(referralEarningsTable.createdAt));

  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  res.json(earnings.map(e => {
    const ru = userMap.get(e.referredUserId);
    return {
      id: e.id,
      referredUserName: ru?.fullName || null,
      referredUserEmail: ru?.email || null,
      amount: Number(e.amount),
      currency: e.currency,
      status: e.status,
      createdAt: e.createdAt.toISOString(),
    };
  }));
});

export default router;
