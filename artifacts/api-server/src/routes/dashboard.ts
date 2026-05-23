import { Router } from "express";
import { db, usersTable, investmentsTable, transactionsTable, copyFollowsTable, algoSubscriptionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const activeInvestments = investments.filter(i => i.status === "active");
  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalProfit = investments.reduce((s, i) => s + Number(i.profit), 0);
  const totalBalance = Number(user.balanceFiat) + Number(user.balanceCrypto) * 45000;

  const follows = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
  const algoSubs = await db.select().from(algoSubscriptionsTable)
    .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)));

  res.json({
    totalBalance,
    totalProfit,
    totalInvested,
    activeInvestments: activeInvestments.length,
    profitPercentage: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
    fiatBalance: Number(user.balanceFiat),
    cryptoBalance: Number(user.balanceCrypto),
    followedTraders: follows.length,
    activeAlgoStrategies: algoSubs.length,
  });
});

router.get("/portfolio-chart", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const baseBalance = Number(user.balanceFiat) + 5000;
  const points = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const noise = (Math.random() - 0.3) * (baseBalance * 0.05);
    const trend = (baseBalance * 0.002) * (30 - i);
    points.push({
      date: d.toISOString().slice(0, 10),
      value: Math.max(0, baseBalance - (baseBalance * 0.1) + trend + noise),
    });
  }
  res.json(points);
});

router.get("/recent-activity", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  const activities = txns.map((t, idx) => ({
    id: idx + 1,
    type: t.type,
    description: `${t.type === "deposit" ? "Deposited" : "Withdrew"} ${Number(t.amount)} ${t.currency}`,
    amount: Number(t.amount),
    currency: t.currency,
    createdAt: t.createdAt.toISOString(),
  }));

  res.json(activities);
});

export default router;
