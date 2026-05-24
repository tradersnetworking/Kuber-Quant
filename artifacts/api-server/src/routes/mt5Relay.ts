import { Router } from "express";
import { db, mt5RequestsTable, mt5AccountsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

// Submit a copy-trading or account-handling request
router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { type, mt5AccountId, profitSharingPercent, details } = req.body;

  if (!type || !["copy_trading", "account_handling"].includes(type)) {
    res.status(400).json({ error: "type must be copy_trading or account_handling" }); return;
  }

  const [request] = await db.insert(mt5RequestsTable).values({
    userId,
    mt5AccountId: mt5AccountId || null,
    type,
    profitSharingPercent: profitSharingPercent || 30,
    details: details || null,
    status: "pending",
  }).returning();

  res.status(201).json({ ...request, createdAt: request.createdAt.toISOString() });
});

// Get user's own requests
router.get("/my", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const requests = await db.select().from(mt5RequestsTable)
    .where(eq(mt5RequestsTable.userId, userId))
    .orderBy(desc(mt5RequestsTable.createdAt));
  res.json(requests.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
});

export default router;
