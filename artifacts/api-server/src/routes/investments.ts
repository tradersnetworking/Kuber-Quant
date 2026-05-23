import { Router } from "express";
import { db, investmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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
  const { type, amount, currency, planName } = req.body;
  if (!type || !amount || !currency || !planName) {
    res.status(400).json({ error: "type, amount, currency, planName are required" });
    return;
  }
  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + 30);
  const [inv] = await db.insert(investmentsTable).values({
    userId,
    type,
    amount: String(amount),
    currency,
    planName,
    profit: "0",
    profitPercent: "0",
    status: "active",
    maturityDate,
  }).returning();
  res.status(201).json(mapInvestment(inv));
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
  const [updated] = await db.update(investmentsTable)
    .set({ status: "withdrawn" })
    .where(eq(investmentsTable.id, id))
    .returning();
  res.json(mapInvestment(updated));
});

export default router;
