import { Router } from "express";
import { db, copyTradersTable, copyFollowsTable } from "@workspace/db";
import { eq, and, desc } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { generateAgreement } from "../helpers/agreementEngine";
import { linkMtTradingAccount, validateMtTradingCredentials } from "../helpers/mtAccountLink";
import { assertTradingServiceDeposit } from "../helpers/tradingServiceDepositGate";

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
  const { respondIfServiceBlocked } = await import("../helpers/userAccessControl");
  if (await respondIfServiceBlocked(userId, "copy", res)) return;

  const traderId = parseInt(String(req.params.id));
  const {
    amount, currency, mt5Login, platform, profitSharingPercent,
    accountNumber, brokerName, serverName, tradingPassword,
  } = req.body;

  const mtCreds = {
    accountNumber: String(accountNumber || mt5Login || "").trim(),
    broker: String(brokerName || "").trim(),
    serverName: String(serverName || "").trim(),
    platform: platform === "mt4" ? "mt4" : "mt5",
    tradingPassword: String(tradingPassword || ""),
  };
  const mtErr = validateMtTradingCredentials(mtCreds);
  if (mtErr) { res.status(400).json({ error: mtErr }); return; }

  const [trader] = await db.select().from(copyTradersTable).where(eq(copyTradersTable.id, traderId)).limit(1);
  if (!trader) { res.status(404).json({ error: "Trader not found" }); return; }

  try {
    await assertTradingServiceDeposit(userId);
  } catch (err: any) {
    res.status(402).json({ error: err.message, code: err.code || "TRADING_DEPOSIT_REQUIRED" });
    return;
  }

  try {
    await linkMtTradingAccount(userId, mtCreds);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to link MT account" });
    return;
  }

  const [existingFollow] = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, traderId)))
    .orderBy(desc(copyFollowsTable.id))
    .limit(1);

  let follow = existingFollow;
  const wasActive = existingFollow?.active === true;

  if (existingFollow) {
    const [updated] = await db.update(copyFollowsTable)
      .set({
        active: true,
        amount: String(amount || 100),
        currency: currency || "USD",
        profitSharingPercent: profitSharingPercent || 20,
      })
      .where(eq(copyFollowsTable.id, existingFollow.id))
      .returning();
    follow = updated;
  } else {
    await db.insert(copyFollowsTable).values({
      userId, traderId,
      amount: String(amount || 100),
      currency: currency || "USD",
      profitSharingPercent: profitSharingPercent || 20,
    });
    const [inserted] = await db.select().from(copyFollowsTable)
      .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, traderId)))
      .orderBy(desc(copyFollowsTable.id))
      .limit(1);
    follow = inserted;
    await db.update(copyTradersTable)
      .set({ followers: trader.followers + 1 })
      .where(eq(copyTradersTable.id, traderId));
  }

  if (!wasActive && existingFollow) {
    await db.update(copyTradersTable)
      .set({ followers: trader.followers + 1 })
      .where(eq(copyTradersTable.id, traderId));
  }

  try {
    const { registerSlave } = await import("../helpers/tradeCopier");
    await registerSlave({
      slaveLogin: mtCreds.accountNumber,
      slaveName: `User #${userId}`,
      profitSharingPercent: profitSharingPercent || 20,
      platform: mtCreds.platform || "mt5",
      details: `Following trader: ${trader.name}`,
    });
  } catch (err) {
    console.warn("Trade Copier API unavailable:", (err as Error).message);
  }

  if (follow) {
    generateAgreement({
      userId,
      type: "copy_trading",
      triggerEvent: "copy_trader_followed",
      triggerEntityId: follow.id,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || undefined,
      userAgent: req.headers["user-agent"] || "",
      extraData: {
        TRADER_NAME: trader.name,
        MT_ACCOUNT: mtCreds.accountNumber,
        MT_PLATFORM: String(mtCreds.platform).toUpperCase(),
      },
    }).catch((err) => console.error("Agreement generation failed:", err));
  }

  res.json({ message: "Now following trader" });
});

router.post("/:id/unfollow", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const traderId = parseInt(String(req.params.id));
  const [existing] = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, traderId), eq(copyFollowsTable.active, true)))
    .limit(1);
  await db.update(copyFollowsTable)
    .set({ active: false })
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.traderId, traderId)));
  if (existing) {
    const [trader] = await db.select().from(copyTradersTable).where(eq(copyTradersTable.id, traderId)).limit(1);
    if (trader && trader.followers > 0) {
      await db.update(copyTradersTable)
        .set({ followers: trader.followers - 1 })
        .where(eq(copyTradersTable.id, traderId));
    }
  }
  res.json({ message: "Unfollowed trader" });
});

export default router;
