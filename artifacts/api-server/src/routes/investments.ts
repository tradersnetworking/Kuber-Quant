import { Router } from "express";
import { db, investmentsTable, investmentPlansTable, usersTable } from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { debitWallet, creditWallet, WalletError } from "../helpers/walletService";
import { validateInvestmentFunding, getInvestmentFundingSnapshot } from "../helpers/investmentFundingService";
import { generateAgreement } from "../helpers/agreementEngine";
import { accrueReferralCommission } from "../helpers/referralCommissionService";
import { convertToUsd } from "../helpers/exchangeRateService";
import { clientIp } from "../helpers/trustedDeviceService";
import { emitN8nEvent } from "../helpers/n8nWebhookService";

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

router.get("/funding-status", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const currency = String(req.query.currency || "USD").toUpperCase();
  const snapshot = await getInvestmentFundingSnapshot(userId, currency);
  res.json(snapshot);
});

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const items = await db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  res.json(items.map(mapInvestment));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { respondIfServiceBlocked } = await import("../helpers/userAccessControl");
  if (await respondIfServiceBlocked(userId, "investments", res)) return;

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

  const fundingCheck = await validateInvestmentFunding(userId, numAmount, currency);
  if (!fundingCheck.ok) {
    res.status(400).json({
      error: fundingCheck.message,
      code: "INSUFFICIENT_BALANCE",
      currency: fundingCheck.currency,
      walletType: fundingCheck.walletType,
      availableBalance: fundingCheck.availableBalance,
      availableBalanceInr: fundingCheck.availableBalanceInr,
      activeInvested: fundingCheck.activeInvested,
      activeInvestedInr: fundingCheck.activeInvestedInr,
      activeInvestmentCount: fundingCheck.activeInvestmentCount,
      totalPortfolio: fundingCheck.totalPortfolio,
      totalPortfolioInr: fundingCheck.totalPortfolioInr,
      requestedAmount: fundingCheck.requestedAmount,
      shortfall: fundingCheck.shortfall,
    });
    return;
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
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "",
    }).catch(() => {});

    const investUsd = currency === "USD" ? numAmount : await convertToUsd(numAmount, currency);
    await accrueReferralCommission({
      referredUserId: userId,
      event: "investment",
      baseAmountUsd: investUsd,
      referenceId: inv.id,
    }).catch(() => {});

    emitN8nEvent("investment.created", {
      investmentId: inv.id,
      userId,
      amount: numAmount,
      currency,
      planName,
    });

    res.status(201).json(mapInvestment(inv));
  } catch (err) {
    if (err instanceof WalletError) {
      if (err.code === "INSUFFICIENT_BALANCE") {
        const fundingCheck = await validateInvestmentFunding(userId, numAmount, currency);
        res.status(400).json({
          error: err.message,
          code: "INSUFFICIENT_BALANCE",
          currency: fundingCheck.currency,
          walletType: fundingCheck.walletType,
          availableBalance: fundingCheck.availableBalance,
          availableBalanceInr: fundingCheck.availableBalanceInr,
          activeInvested: fundingCheck.activeInvested,
          activeInvestedInr: fundingCheck.activeInvestedInr,
          activeInvestmentCount: fundingCheck.activeInvestmentCount,
          totalPortfolio: fundingCheck.totalPortfolio,
          totalPortfolioInr: fundingCheck.totalPortfolioInr,
          requestedAmount: numAmount,
          shortfall: Math.max(0, parseFloat((numAmount - fundingCheck.availableBalance).toFixed(8))),
        });
        return;
      }
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

  const plan = inv.planName
    ? await db.select().from(investmentPlansTable).where(eq(investmentPlansTable.name, inv.planName)).limit(1).then(r => r[0])
    : null;

  const principal = Number(inv.amount);
  const accruedProfit = Number(inv.profit || 0);
  const penaltyPct = plan ? Number(plan.earlyWithdrawalPenalty || 0) : 0;
  const isEarly = inv.maturityDate && new Date() < new Date(inv.maturityDate);
  const penalty = isEarly && penaltyPct > 0
    ? parseFloat((principal * penaltyPct / 100).toFixed(2))
    : 0;
  const returnPrincipal = parseFloat((principal - penalty).toFixed(2));
  const totalReturn = parseFloat((returnPrincipal + accruedProfit).toFixed(2));

  if (totalReturn > 0) {
    await creditWallet({
      userId,
      amount: totalReturn,
      currency: inv.currency,
      type: "investment",
      referenceType: "investment",
      referenceId: inv.id,
      description: penalty > 0
        ? `Early investment withdrawal — penalty ${penalty} ${inv.currency} applied`
        : "Investment withdrawal — principal + profit returned",
    });
  }

  const [updated] = await db.update(investmentsTable)
    .set({ status: "withdrawn" })
    .where(eq(investmentsTable.id, id))
    .returning();
  res.json(mapInvestment(updated));
});

router.get("/maturity-payout/pending", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { listPendingMaturityChoices } = await import("../helpers/maturityPayoutService");
  res.json(await listPendingMaturityChoices(userId));
});

router.post("/:id/maturity-payout-choice", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) { res.status(400).json({ error: "Invalid investment id" }); return; }

  const { destination, paymentAccountId, paymentMethod, consent } = req.body;
  if (destination !== "wallet" && destination !== "personal") {
    res.status(400).json({ error: "destination must be wallet or personal" });
    return;
  }

  try {
    const { submitMaturityPayoutChoice } = await import("../helpers/maturityPayoutService");
    const result = await submitMaturityPayoutChoice(userId, id, {
      destination,
      paymentAccountId: paymentAccountId != null ? Number(paymentAccountId) : undefined,
      paymentMethod,
      consent: Boolean(consent),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to save payout preference" });
  }
});

export default router;
