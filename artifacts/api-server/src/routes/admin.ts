import { Router } from "express";
import {
  db, usersTable, transactionsTable, investmentsTable,
  kycRecordsTable, investmentPlansTable, mt5AccountsTable,
  ticketsTable, ticketRepliesTable, referralEarningsTable,
} from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { mapUser } from "./auth";
import { mapKyc } from "./kyc";
import { mapPlan } from "./plans";
import { mapAccount } from "./mt5";
import { mapTicket } from "./tickets";

const router = Router();

function mapTxn(t: any, email?: string, userName?: string) {
  return {
    id: t.id, userId: t.userId, userEmail: email || null,
    userName: userName || null, type: t.type,
    amount: Number(t.amount), currency: t.currency, status: t.status,
    paymentMethod: t.paymentMethod || null, txHash: t.txHash || null,
    notes: t.notes || null, createdAt: t.createdAt.toISOString(),
  };
}

router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.select().from(usersTable);
  const txns = await db.select().from(transactionsTable);
  const investments = await db.select().from(investmentsTable);
  const kycs = await db.select().from(kycRecordsTable);
  const tickets = await db.select().from(ticketsTable);

  const deposits = txns.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawals = txns.filter(t => t.type === "withdrawal" && t.status === "approved");
  const pending = txns.filter(t => t.status === "pending");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newUsers = users.filter(u => u.createdAt >= startOfMonth);
  const pendingKyc = kycs.filter(k => k.status === "submitted").length;
  const openTickets = tickets.filter(t => t.status === "open").length;
  const managers = users.filter(u => u.role === "manager").length;

  res.json({
    totalUsers: users.length,
    totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
    totalWithdrawals: withdrawals.reduce((s, t) => s + Number(t.amount), 0),
    totalInvestments: investments.reduce((s, i) => s + Number(i.amount), 0),
    pendingTransactions: pending.length,
    activeUsers: users.filter(u => u.isActive).length,
    totalProfit: investments.reduce((s, i) => s + Number(i.profit), 0),
    newUsersThisMonth: newUsers.length,
    pendingKyc,
    openTickets,
    totalManagers: managers,
  });
});

router.get("/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(users.map(mapUser));
});

router.get("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { role, kycStatus, balanceFiat, balanceCrypto, isActive, managerId } = req.body;
  const updates: Record<string, any> = {};
  if (role !== undefined) updates.role = role;
  if (kycStatus !== undefined) updates.kycStatus = kycStatus;
  if (balanceFiat !== undefined) updates.balanceFiat = String(balanceFiat);
  if (balanceCrypto !== undefined) updates.balanceCrypto = String(balanceCrypto);
  if (isActive !== undefined) updates.isActive = isActive;
  if (managerId !== undefined) updates.managerId = managerId;
  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json(mapUser(user));
});

router.get("/transactions", requireAuth, requireAdmin, async (_req, res) => {
  const txns = await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt));
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(txns.map(t => {
    const u = userMap.get(t.userId);
    return mapTxn(t, u?.email, u?.fullName);
  }));
});

router.post("/transactions/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [txn] = await db.update(transactionsTable).set({ status: "approved" })
    .where(eq(transactionsTable.id, id)).returning();
  if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
  if (txn.type === "deposit") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, txn.userId)).limit(1);
    if (user) {
      const isCrypto = ["BTC", "ETH", "USDT"].includes(txn.currency);
      if (isCrypto) {
        await db.update(usersTable).set({ balanceCrypto: String(Number(user.balanceCrypto) + Number(txn.amount)) })
          .where(eq(usersTable.id, user.id));
      } else {
        await db.update(usersTable).set({ balanceFiat: String(Number(user.balanceFiat) + Number(txn.amount)) })
          .where(eq(usersTable.id, user.id));
      }
    }
  }
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const u = userMap.get(txn.userId);
  res.json(mapTxn(txn, u?.email, u?.fullName));
});

router.post("/transactions/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [txn] = await db.update(transactionsTable).set({ status: "rejected" })
    .where(eq(transactionsTable.id, id)).returning();
  if (!txn) { res.status(404).json({ error: "Transaction not found" }); return; }
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const u = userMap.get(txn.userId);
  res.json(mapTxn(txn, u?.email, u?.fullName));
});

router.get("/kyc", requireAuth, requireAdmin, async (_req, res) => {
  const kycs = await db.select().from(kycRecordsTable).orderBy(desc(kycRecordsTable.createdAt));
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  res.json(kycs.map(k => {
    const u = userMap.get(k.userId);
    return mapKyc(k, u?.email, u?.fullName);
  }));
});

router.post("/kyc/:id/approve", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [kyc] = await db.update(kycRecordsTable).set({ status: "verified" })
    .where(eq(kycRecordsTable.id, id)).returning();
  if (!kyc) { res.status(404).json({ error: "KYC not found" }); return; }
  await db.update(usersTable).set({ kycStatus: "verified" }).where(eq(usersTable.id, kyc.userId));
  res.json(mapKyc(kyc));
});

router.post("/kyc/:id/reject", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { reason } = req.body;
  const [kyc] = await db.update(kycRecordsTable)
    .set({ status: "rejected", rejectionReason: reason || "Not approved" })
    .where(eq(kycRecordsTable.id, id)).returning();
  if (!kyc) { res.status(404).json({ error: "KYC not found" }); return; }
  await db.update(usersTable).set({ kycStatus: "rejected" }).where(eq(usersTable.id, kyc.userId));
  res.json(mapKyc(kyc));
});

router.get("/plans", requireAuth, requireAdmin, async (_req, res) => {
  const plans = await db.select().from(investmentPlansTable).orderBy(investmentPlansTable.id);
  res.json(plans.map(mapPlan));
});

router.post("/plans", requireAuth, requireAdmin, async (req, res) => {
  const { name, description, minAmount, maxAmount, roiPercent, durationDays, currency, isActive, category } = req.body;
  if (!name || !minAmount || !maxAmount || !roiPercent || !durationDays) {
    res.status(400).json({ error: "name, minAmount, maxAmount, roiPercent, durationDays are required" }); return;
  }
  const [plan] = await db.insert(investmentPlansTable).values({
    name, description: description || null,
    minAmount: String(minAmount), maxAmount: String(maxAmount),
    roiPercent: String(roiPercent), durationDays,
    currency: currency || "USD", isActive: isActive !== false,
    category: category || "starter",
  }).returning();
  res.status(201).json(mapPlan(plan));
});

router.patch("/plans/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { name, description, minAmount, maxAmount, roiPercent, durationDays, currency, isActive, category } = req.body;
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (minAmount !== undefined) updates.minAmount = String(minAmount);
  if (maxAmount !== undefined) updates.maxAmount = String(maxAmount);
  if (roiPercent !== undefined) updates.roiPercent = String(roiPercent);
  if (durationDays !== undefined) updates.durationDays = durationDays;
  if (currency !== undefined) updates.currency = currency;
  if (isActive !== undefined) updates.isActive = isActive;
  if (category !== undefined) updates.category = category;
  const [plan] = await db.update(investmentPlansTable).set(updates).where(eq(investmentPlansTable.id, id)).returning();
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(mapPlan(plan));
});

router.post("/wallet-adjust", requireAuth, requireAdmin, async (req, res) => {
  const { userId, amount, walletType, reason } = req.body;
  if (!userId || amount === undefined || !walletType || !reason) {
    res.status(400).json({ error: "userId, amount, walletType, reason are required" }); return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (walletType === "fiat") {
    await db.update(usersTable).set({ balanceFiat: String(Math.max(0, Number(user.balanceFiat) + amount)) })
      .where(eq(usersTable.id, userId));
  } else {
    await db.update(usersTable).set({ balanceCrypto: String(Math.max(0, Number(user.balanceCrypto) + amount)) })
      .where(eq(usersTable.id, userId));
  }
  res.json({ message: `Wallet adjusted by ${amount} for user ${userId}` });
});

router.get("/mt5-accounts", requireAuth, requireAdmin, async (_req, res) => {
  const accounts = await db.select().from(mt5AccountsTable).orderBy(desc(mt5AccountsTable.createdAt));
  res.json(accounts.map(mapAccount));
});

router.get("/tickets", requireAuth, requireAdmin, async (_req, res) => {
  const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName }).from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));
  const mapped = await Promise.all(tickets.map(t => {
    const u = userMap.get(t.userId);
    return mapTicket(t, u?.email, u?.fullName);
  }));
  res.json(mapped);
});

router.post("/tickets/:id/reply", requireAuth, requireAdmin, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message, isAdmin: true });
  await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));
  res.json({ message: "Reply sent" });
});

router.post("/tickets/:id/close", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.update(ticketsTable).set({ status: "closed" }).where(eq(ticketsTable.id, id));
  res.json({ message: "Ticket closed" });
});

router.get("/referral-stats", requireAuth, requireAdmin, async (_req, res) => {
  const earnings = await db.select().from(referralEarningsTable);
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  const topReferrerMap = new Map<number, { count: number; earnings: number }>();
  for (const e of earnings) {
    const r = topReferrerMap.get(e.referrerId) || { count: 0, earnings: 0 };
    r.count++;
    r.earnings += Number(e.amount);
    topReferrerMap.set(e.referrerId, r);
  }

  const topReferrers = Array.from(topReferrerMap.entries())
    .sort((a, b) => b[1].earnings - a[1].earnings)
    .slice(0, 10)
    .map(([userId, stats]) => {
      const u = userMap.get(userId);
      return { userId, userName: u?.fullName || "Unknown", referralCount: stats.count, earnings: stats.earnings };
    });

  const totalPaid = earnings.filter(e => e.status === "paid").reduce((s, e) => s + Number(e.amount), 0);
  const pending = earnings.filter(e => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);

  res.json({
    totalReferrals: earnings.length,
    totalCommissionPaid: totalPaid,
    pendingCommission: pending,
    topReferrers,
  });
});

export default router;
