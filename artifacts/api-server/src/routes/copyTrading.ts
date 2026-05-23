import { Router } from "express";
import { db, copyTradersTable, copyFollowsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapTrader(t: any, isFollowing = false) {
  return {
    id: t.id,
    name: t.name,
    avatarUrl: t.avatarUrl,
    bio: t.bio,
    roi: Number(t.roi),
    monthlyRoi: Number(t.monthlyRoi),
    followers: t.followers,
    winRate: Number(t.winRate),
    totalTrades: t.totalTrades,
    status: t.status,
    minInvestment: Number(t.minInvestment),
    riskLevel: t.riskLevel,
    isFollowing,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const traders = await db.select().from(copyTradersTable);
  const follows = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
  const followedIds = new Set(follows.map(f => f.traderId));
  res.json(traders.map(t => mapTrader(t, followedIds.has(t.id))));
});

router.get("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [trader] = await db.select().from(copyTradersTable).where(eq(copyTradersTable.id, id)).limit(1);
  if (!trader) { res.status(404).json({ error: "Trader not found" }); return; }
  const [follow] = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, id), eq(copyFollowsTable.active, true)))
    .limit(1);
  res.json(mapTrader(trader, !!follow));
});

router.post("/:id/follow", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const traderId = parseInt(String(req.params.id));
  const { amount, currency } = req.body;
  const [trader] = await db.select().from(copyTradersTable).where(eq(copyTradersTable.id, traderId)).limit(1);
  if (!trader) { res.status(404).json({ error: "Trader not found" }); return; }
  await db.insert(copyFollowsTable).values({
    userId, traderId, amount: String(amount || 100), currency: currency || "USD",
  });
  await db.update(copyTradersTable)
    .set({ followers: trader.followers + 1 })
    .where(eq(copyTradersTable.id, traderId));
  res.json({ message: "Now following trader" });
});

router.post("/:id/unfollow", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const traderId = parseInt(String(req.params.id));
  await db.update(copyFollowsTable)
    .set({ active: false })
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, traderId)));
  const [trader] = await db.select().from(copyTradersTable).where(eq(copyTradersTable.id, traderId)).limit(1);
  if (trader && trader.followers > 0) {
    await db.update(copyTradersTable)
      .set({ followers: trader.followers - 1 })
      .where(eq(copyTradersTable.id, traderId));
  }
  res.json({ message: "Unfollowed trader" });
});

export default router;
