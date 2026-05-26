import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
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

export default router;
