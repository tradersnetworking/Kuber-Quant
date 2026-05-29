import { Router } from "express";
import { db, algoStrategiesTable, algoSubscriptionsTable } from "@workspace/db";
import { eq, and, desc } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { generateAgreement } from "../helpers/agreementEngine";
import { linkMtTradingAccount, validateMtTradingCredentials } from "../helpers/mtAccountLink";
import { assertTradingServiceDeposit } from "../helpers/tradingServiceDepositGate";

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
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
    priceMonthly: Number(s.priceMonthly),
    priceQuarterly: Number(s.priceQuarterly),
    priceBiannual: Number(s.priceBiannual),
    priceAnnual: Number(s.priceAnnual),
  })));
});

router.post("/:id/subscribe", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { respondIfServiceBlocked } = await import("../helpers/userAccessControl");
  if (await respondIfServiceBlocked(userId, "algo", res)) return;

  const strategyId = parseInt(String(req.params.id));
  const { amount, currency, plan, accountNumber, brokerName, serverName, platform, tradingPassword } = req.body;
  const selectedPlan = ["monthly", "quarterly", "biannual", "annual"].includes(String(plan)) ? String(plan) : "monthly";
  const planDays: Record<string, number> = { monthly: 30, quarterly: 90, biannual: 180, annual: 365 };

  const mtCreds = {
    accountNumber: String(accountNumber || "").trim(),
    broker: String(brokerName || "").trim(),
    serverName: String(serverName || "").trim(),
    platform: platform === "mt4" ? "mt4" : "mt5",
    tradingPassword: String(tradingPassword || ""),
  };
  const mtErr = validateMtTradingCredentials(mtCreds);
  if (mtErr) { res.status(400).json({ error: mtErr }); return; }

  const [strategy] = await db.select().from(algoStrategiesTable).where(eq(algoStrategiesTable.id, strategyId)).limit(1);
  if (!strategy) { res.status(404).json({ error: "Strategy not found" }); return; }

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

  await db.insert(algoSubscriptionsTable).values({
    userId,
    strategyId,
    amount: String(amount || strategy.minInvestment),
    currency: currency || "USD",
    plan: selectedPlan as "monthly" | "quarterly" | "biannual" | "annual",
    expiresAt: new Date(Date.now() + (planDays[selectedPlan] || 30) * 24 * 60 * 60 * 1000),
  });
  const [sub] = await db.select().from(algoSubscriptionsTable)
    .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.strategyId, strategyId)))
    .orderBy(desc(algoSubscriptionsTable.id))
    .limit(1);
  await db.update(algoStrategiesTable)
    .set({ subscribers: strategy.subscribers + 1 })
    .where(eq(algoStrategiesTable.id, strategyId));

  if (sub) {
    generateAgreement({
      userId,
      type: "algo_trading",
      triggerEvent: "algo_strategy_subscribed",
      triggerEntityId: sub.id,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || undefined,
      userAgent: req.headers["user-agent"] || "",
    }).catch((err) => console.error("Agreement generation failed:", err));
  }

  res.json({ message: "Subscribed to strategy successfully" });
});

export default router;
