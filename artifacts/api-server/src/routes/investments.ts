import { Router } from "express";
import { db, investmentsTable, investmentPlansTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { debitWallet, creditWallet, WalletError } from "../helpers/walletService";
import { generateAgreement } from "../helpers/agreementEngine";

const router = Router();

function mapInvestment(i: any) {
  return {
    id: i.id,
    userId: i.userId,
    type: i.type,
    planName: i.planName,
    amount: Number(i.amount),
    currency: i.currency,
    profit: Number(i.profit),
    profitPercent: Number(i.profitPercent),
    status: i.status,
    maturityDate: i.maturityDate ? i.maturityDate.toISOString() : null,
    createdAt: i.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const items = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  res.json(items.map(mapInvestment));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { type, amount, currency, planName, planId } = req.body;
  if (!type || !amount || !currency || !planName) {
    res.status(400).json({ error: "type, amount, currency, planName are required" });
    return;
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user?.kycStatus !== "verified") {
    res.status(400).json({ error: "KYC verification required before investing" });
    return;
  }

  let durationDays = 30;
  let roiPercent = "0";
  if (planId) {
    const [plan] = await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.id, Number(planId))).limit(1);
    if (plan) {
      durationDays = plan.durationDays;
      roiPercent = plan.roiPercent;
      if (numAmount < Number(plan.minAmount) || numAmount > Number(plan.maxAmount)) {
        res.status(400).json({ error: `Investment amount must be between ${plan.minAmount} and ${plan.maxAmount}` });
        return;
      }
    }
  }

  try {
    await debitWallet({
      userId,
      amount: numAmount,
      currency,
      type: "investment",
      description: `Investment in ${planName}`,
    });

    const maturityDate = new Date();
    maturityDate.setDate(maturityDate.getDate() + durationDays);

    const [inv] = await db.insert(investmentsTable).values({
      userId,
      type,
      amount: String(numAmount),
      currency,
      planName,
      profit: "0",
      profitPercent: roiPercent,
      status: "active",
      maturityDate,
    }).returning();

    generateAgreement({
      userId,
      type: type === "copy" ? "copy_trading" : type === "algo" ? "algo_trading" : "investment",
      triggerEvent: "investment_created",
      triggerEntityId: inv.id,
      ipAddress: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket?.remoteAddress || undefined,
      userAgent: req.headers["user-agent"] || "",
    }).catch(() => {});

    res.status(201).json(mapInvestment(inv));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.get("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [inv] = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId)))
    .limit(1);
  if (!inv) { res.status(404).json({ error: "Not found" }); return; }
  res.json(mapInvestment(inv));
});

router.post("/:id/withdraw", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [inv] = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.id, id), eq(investmentsTable.userId, userId)))
    .limit(1);
  if (!inv) { res.status(404).json({ error: "Not found" }); return; }
  if (inv.status !== "active") {
    res.status(400).json({ error: "Investment is not active" });
    return;
  }

  const totalReturn = Number(inv.amount) + Number(inv.profit);
  await creditWallet({
    userId,
    amount: totalReturn,
    currency: inv.currency,
    type: "investment",
    referenceType: "investment",
    referenceId: inv.id,
    description: "Investment withdrawal — principal + profit returned",
  });

  const [updated] = await db.update(investmentsTable)
    .set({ status: "withdrawn" })
    .where(eq(investmentsTable.id, id))
    .returning();
  res.json(mapInvestment(updated));
});

export default router;
