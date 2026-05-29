import { Router } from "express";
import { db, investmentPlansTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

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
  const plans = await db.select().from(investmentPlansTable)
    .where(eq(investmentPlansTable.isActive, true))
    .orderBy(investmentPlansTable.id);
  res.json(plans.map(mapPlan));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [plan] = await db.select().from(investmentPlansTable)
    .where(eq(investmentPlansTable.id, id)).limit(1);
  if (!plan) { res.status(404).json({ error: "Plan not found" }); return; }
  res.json(mapPlan(plan));
});

export default router;
