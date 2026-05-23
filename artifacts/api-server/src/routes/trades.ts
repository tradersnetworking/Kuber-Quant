import { Router } from "express";
import { db, tradesTable, algoStrategiesTable, algoSubscriptionsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapTrade(t: any) {
  return {
    id: t.id,
    userId: t.userId,
    symbol: t.symbol,
    type: t.type,
    amount: Number(t.amount),
    entryPrice: Number(t.entryPrice),
    exitPrice: t.exitPrice ? Number(t.exitPrice) : null,
    profitLoss: t.profitLoss ? Number(t.profitLoss) : null,
    status: t.status,
    strategy: t.strategy,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const trades = await db.select().from(tradesTable)
    .where(eq(tradesTable.userId, userId))
    .orderBy(desc(tradesTable.createdAt));
  res.json(trades.map(mapTrade));
});

router.get("/stats", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const trades = await db.select().from(tradesTable).where(eq(tradesTable.userId, userId));
  const closed = trades.filter(t => t.status === "closed");
  const wins = closed.filter(t => Number(t.profitLoss) > 0);
  const totalPL = closed.reduce((s, t) => s + Number(t.profitLoss || 0), 0);
  res.json({
    totalTrades: trades.length,
    winRate: closed.length > 0 ? (wins.length / closed.length) * 100 : 0,
    totalProfitLoss: totalPL,
    avgProfit: closed.length > 0 ? totalPL / closed.length : 0,
    openTrades: trades.filter(t => t.status === "open").length,
  });
});

// Algo strategies
router.get("/algo-strategies", requireAuth, async (_req, res) => {
  const strategies = await db.select().from(algoStrategiesTable);
  res.json(strategies.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    roi: Number(s.roi),
    riskLevel: s.riskLevel,
    subscribers: s.subscribers,
    status: s.status,
    minInvestment: Number(s.minInvestment),
    currency: s.currency,
  })));
});

router.post("/algo-strategies/:id/subscribe", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const strategyId = parseInt(String(req.params.id));
  const { amount, currency } = req.body;
  const [strategy] = await db.select().from(algoStrategiesTable).where(eq(algoStrategiesTable.id, strategyId)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }
  await db.insert(algoSubscriptionsTable).values({
    userId, strategyId, amount: String(amount || 100), currency: currency || "USD",
  });
  await db.update(algoStrategiesTable)
    .set({ subscribers: strategy.subscribers + 1 })
    .where(eq(algoStrategiesTable.id, strategyId));
  res.json({ message: "Subscribed to strategy successfully" });
});

export default router;
