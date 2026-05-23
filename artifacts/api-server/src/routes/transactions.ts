import { Router } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapTxn(t: any, userEmail?: string) {
  return {
    id: t.id,
    userId: t.userId,
    userEmail: userEmail || null,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    paymentMethod: t.paymentMethod,
    txHash: t.txHash,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txns.map(t => mapTxn(t)));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { type, amount, currency, paymentMethod, txHash, notes } = req.body;
  if (!type || !amount || !currency) {
    res.status(400).json({ error: "type, amount, currency are required" });
    return;
  }
  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type,
    amount: String(amount),
    currency,
    paymentMethod,
    txHash,
    notes,
    status: "pending",
  }).returning();
  res.status(201).json(mapTxn(txn));
});

export default router;
