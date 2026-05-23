import { Router } from "express";
import { db, mt5AccountsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router = Router();

function mapAccount(a: any) {
  return {
    id: a.id,
    userId: a.userId,
    accountNumber: a.accountNumber,
    broker: a.broker,
    serverName: a.serverName || null,
    balance: a.balance ? Number(a.balance) : null,
    equity: a.equity ? Number(a.equity) : null,
    profit: a.profit ? Number(a.profit) : null,
    status: a.status,
    managerId: a.managerId || null,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const accounts = await db.select().from(mt5AccountsTable)
    .where(eq(mt5AccountsTable.userId, userId))
    .orderBy(desc(mt5AccountsTable.createdAt));
  res.json(accounts.map(mapAccount));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { accountNumber, broker, serverName } = req.body;
  if (!accountNumber || !broker) {
    res.status(400).json({ error: "accountNumber and broker are required" });
    return;
  }
  const [account] = await db.insert(mt5AccountsTable).values({
    userId, accountNumber, broker,
    serverName: serverName || null,
    status: "pending_review",
  }).returning();
  res.status(201).json(mapAccount(account));
});

router.get("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [account] = await db.select().from(mt5AccountsTable)
    .where(eq(mt5AccountsTable.id, id)).limit(1);
  if (!account || account.userId !== userId) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(mapAccount(account));
});

export default router;
export { mapAccount };
