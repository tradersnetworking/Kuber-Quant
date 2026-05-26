import { Router } from "express";
import { db, usersTable, investmentsTable, transactionsTable, copyFollowsTable, algoSubscriptionsTable, walletLedgerTable } from "@workspace/db";
import { eq, and, desc, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { handleGetWatchlist, handleSaveWatchlist } from "../helpers/watchlistHandlers";
import { clearMarketTickerCache } from "../helpers/marketCache";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const investments = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const activeInvestments = investments.filter(i => i.status === "active");
  const totalInvested = investments.reduce((s, i) => s + Number(i.amount), 0);
  const totalProfit = investments.reduce((s, i) => s + Number(i.profit), 0);
  const totalBalance = Number(user.balanceFiat) + Number(user.balanceCrypto);

  const follows = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
  const algoSubs = await db.select().from(algoSubscriptionsTable)
    .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)));

  res.json({
    totalBalance,
    totalProfit: totalProfit + Number(user.totalProfit),
    totalInvested,
    activeInvestments: activeInvestments.length,
    profitPercentage: totalInvested > 0 ? (totalProfit / totalInvested) * 100 : 0,
    fiatBalance: Number(user.balanceFiat),
    cryptoBalance: Number(user.balanceCrypto),
    followedTraders: follows.length,
    activeAlgoStrategies: algoSubs.length,
    referralEarnings: Number(user.referralEarnings),
  });
});

router.get("/portfolio-chart", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const ledger = await db.select().from(walletLedgerTable)
    .where(and(eq(walletLedgerTable.userId, userId), gte(walletLedgerTable.createdAt, thirtyDaysAgo)))
    .orderBy(walletLedgerTable.createdAt);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  const currentBalance = user ? Number(user.balanceFiat) + Number(user.balanceCrypto) : 0;

  if (ledger.length === 0) {
    const txns = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.status, "approved")))
      .orderBy(transactionsTable.createdAt);

    let running = 0;
    const points: { date: string; value: number }[] = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayTxns = txns.filter(t => t.createdAt.toISOString().slice(0, 10) <= dayStr);
      running = dayTxns.reduce((s, t) => {
        const amt = Number(t.amount);
        return t.type === "deposit" ? s + amt : s - amt;
      }, 0);
      points.push({ date: dayStr, value: Math.max(0, running) });
    }
    if (points.length) points[points.length - 1].value = currentBalance;
    res.json(points);
    return;
  }

  const byDay = new Map<string, number>();
  for (const entry of ledger) {
    const day = entry.createdAt.toISOString().slice(0, 10);
    byDay.set(day, Number(entry.balanceAfter));
  }

  const points: { date: string; value: number }[] = [];
  const now = new Date();
  let lastValue = currentBalance;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayStr = d.toISOString().slice(0, 10);
    if (byDay.has(dayStr)) lastValue = byDay.get(dayStr)!;
    points.push({ date: dayStr, value: lastValue });
  }
  res.json(points);
});

router.get("/recent-activity", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;

  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(10);

  const activities = txns.map((t) => ({
    id: t.id,
    type: t.type,
    description: `${t.type === "deposit" ? "Deposited" : "Withdrew"} ${Number(t.amount)} ${t.currency}`,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
  }));

  res.json(activities);
});

router.get("/market-watchlist", requireAuth, handleGetWatchlist);
router.put("/market-watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));
router.post("/market-watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));

export default router;
