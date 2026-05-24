import { Router } from "express";
import { db, roiPayoutsTable, investmentsTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { processMaturedInvestments, processManualPayout } from "../helpers/roiEngine";
import { logAudit } from "../helpers/audit";

const router = Router();

// Admin: trigger ROI processing cycle
router.post("/process", requireAuth, requireAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const result = await processMaturedInvestments();
  await logAudit({ req, userId, role, action: "roi_process_triggered", details: result });
  res.json({ message: "ROI processing complete", ...result });
});

// Admin: manual payout for a specific investment
router.post("/manual-payout/:investmentId", requireAuth, requireAdmin, async (req, res) => {
  const { userId, role } = (req as any).user;
  const investmentId = parseInt(String(req.params.investmentId));
  const { note } = req.body;
  const result = await processManualPayout(investmentId, note);
  if (!result.ok) { res.status(400).json({ error: result.message }); return; }
  await logAudit({ req, userId, role, action: "roi_manual_payout", entity: "investment", entityId: investmentId, details: { note } });
  res.json({ message: result.message });
});

// Admin: view all ROI payouts
router.get("/payouts", requireAuth, requireAdmin, async (_req, res) => {
  const payouts = await db.select().from(roiPayoutsTable).orderBy(desc(roiPayoutsTable.createdAt)).limit(200);
  res.json(payouts.map(p => ({
    id: p.id, investmentId: p.investmentId, userId: p.userId,
    amount: Number(p.amount), roiPercent: Number(p.roiPercent),
    status: p.status, planName: p.planName, note: p.note,
    processedAt: p.processedAt, createdAt: p.createdAt,
  })));
});

// User: view their own ROI payouts
router.get("/my-payouts", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const payouts = await db.select().from(roiPayoutsTable)
    .where(eq(roiPayoutsTable.userId, userId))
    .orderBy(desc(roiPayoutsTable.createdAt))
    .limit(100);
  res.json(payouts.map(p => ({
    id: p.id, investmentId: p.investmentId,
    amount: Number(p.amount), roiPercent: Number(p.roiPercent),
    status: p.status, planName: p.planName, note: p.note,
    processedAt: p.processedAt, createdAt: p.createdAt,
  })));
});

// Admin: view all active investments for manual ROI
router.get("/active-investments", requireAuth, requireAdmin, async (_req, res) => {
  const invs = await db.select().from(investmentsTable)
    .where(eq(investmentsTable.status, "active"))
    .orderBy(desc(investmentsTable.createdAt));

  const users = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json(invs.map(i => ({
    id: i.id, userId: i.userId,
    userEmail: userMap[i.userId]?.email,
    userName: userMap[i.userId]?.fullName,
    planName: i.planName, amount: Number(i.amount),
    currency: i.currency, status: i.status,
    maturityDate: i.maturityDate, createdAt: i.createdAt,
  })));
});

export default router;
