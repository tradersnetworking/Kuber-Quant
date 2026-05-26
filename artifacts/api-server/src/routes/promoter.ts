import { Router } from "express";
import { db, usersTable, referralEarningsTable, transactionsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { mapUser } from "./auth";

const router = Router();

async function assertPromoter(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user?.isPromoter) return null;
  return user;
}

router.get("/dashboard", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const user = await assertPromoter(userId);
  if (!user) { res.status(403).json({ error: "Promoter access not enabled on your account" }); return; }

  const downline = await db.select().from(usersTable).where(eq(usersTable.referredBy, userId));
  const earnings = await db.select().from(referralEarningsTable)
    .where(eq(referralEarningsTable.referrerId, userId))
    .orderBy(desc(referralEarningsTable.createdAt));

  const paid = earnings.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const pending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
  const activeInvestors = downline.filter(u => Number(u.balanceFiat) > 0 || Number(u.totalProfit) > 0).length;
  const conversionRate = downline.length > 0 ? Math.round((activeInvestors / downline.length) * 100) : 0;

  res.json({
    referralCode: user.referralCode,
    referralLink: `${process.env.APP_URL || "http://localhost:3000"}/register?ref=${user.referralCode}`,
    commissionType: user.promoterCommissionType || "revenue_share",
    totalReferrals: downline.length,
    activeInvestors,
    commissionEarned: paid,
    pendingCommissions: pending,
    conversionRate,
    referralEarnings: Number(user.referralEarnings),
    team: downline.map(u => ({
      id: u.id, fullName: u.fullName, email: u.email,
      joinedAt: u.createdAt.toISOString(),
      balanceFiat: Number(u.balanceFiat),
      kycStatus: u.kycStatus,
    })),
    earnings: earnings.map(e => ({
      id: e.id, referredUserId: e.referredUserId, amount: Number(e.amount),
      currency: e.currency, status: e.status, createdAt: e.createdAt.toISOString(),
    })),
  });
});

router.post("/upgrade-request", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (user.isPromoter) { res.json({ message: "Already a promoter" }); return; }
  res.json({ message: "Promoter upgrade request submitted. An admin will review your account." });
});

router.post("/commission-withdraw", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const user = await assertPromoter(userId);
  if (!user) { res.status(403).json({ error: "Promoter access required" }); return; }

  const { amount, currency = "USD", paymentMethod } = req.body;
  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "Valid amount required" });
    return;
  }
  if (Number(amount) > Number(user.referralEarnings)) {
    res.status(400).json({ error: "Insufficient commission balance" });
    return;
  }

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    currency,
    status: "pending",
    paymentMethod: paymentMethod || "Commission withdrawal",
    notes: "Promoter commission withdrawal",
    gatewayProvider: "promoter",
  }).returning();

  res.status(201).json({
    id: txn.id,
    message: "Commission withdrawal request submitted for admin approval",
  });
});

export default router;
