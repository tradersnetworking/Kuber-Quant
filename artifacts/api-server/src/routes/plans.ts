import { Router } from "express";
import { db, investmentPlansTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { getDefaultInvestmentPlans } from "../helpers/defaultPlans";
import { isMissingRelationError } from "../helpers/pgErrors";
import { logger } from "../lib/logger";

const router = Router();

export function mapPlan(p: any) {
  return {
    id: p.id,
    name: p.name,
    description: p.description || null,
    minAmount: Number(p.minAmount),
    maxAmount: Number(p.maxAmount),
    roiPercent: Number(p.roiPercent),
    durationDays: p.durationDays,
    currency: p.currency,
    isActive: p.isActive,
    totalInvestors: p.totalInvestors,
    category: p.category,
    planType: p.planType || "monthly",
    profitFrequency: p.profitFrequency || "monthly",
    capitalReturn: p.capitalReturn || "yes",
    autoRenewal: p.autoRenewal || false,
    earlyWithdrawalPenalty: Number(p.earlyWithdrawalPenalty || 0),
    features: (() => { try { return p.features ? JSON.parse(p.features) : []; } catch { return []; } })(),
    maxInvestors: p.maxInvestors || null,
    createdAt: p.createdAt?.toISOString?.() || null,
  };
}

router.get("/", async (_req, res) => {
  try {
    const plans = await db.select().from(investmentPlansTable)
      .where(eq(investmentPlansTable.isActive, true))
      .orderBy(investmentPlansTable.id);
    if (plans.length === 0) {
      res.json(getDefaultInvestmentPlans());
      return;
    }
    res.json(plans.map(mapPlan));
  } catch (err) {
    if (isMissingRelationError(err)) {
      logger.warn("investment_plans table missing — serving default demo plans");
    } else {
      logger.warn({ err }, "Failed to load investment plans — serving defaults");
    }
    res.json(getDefaultInvestmentPlans());
  }
});

router.get("/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(investmentPlansTable)
    .where(eq(investmentPlansTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(mapPlan(plan));
});

export default router;
