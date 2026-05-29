import { Router } from "express";
import { db, mt5AccountsTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { linkMtTradingAccount } from "../helpers/mtAccountLink";
import { assertTradingServiceDeposit } from "../helpers/tradingServiceDepositGate";

const router = Router();

function mapAccount(a: any) {
  return {
    id: a.id,
    userId: a.userId,
    platform: a.platform || "mt5",
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
  const { respondIfServiceBlocked } = await import("../helpers/userAccessControl");
  if (await respondIfServiceBlocked(userId, "mt5", res)) return;

  const { accountNumber, broker, serverName, platform, password } = req.body;
  if (!accountNumber || !broker) {
    res.status(400).json({ error: "accountNumber and broker are required" });
    return;
  }
  if (!serverName) {
    res.status(400).json({ error: "serverName is required" });
    return;
  }
  if (!password || String(password).length < 4) {
    res.status(400).json({ error: "MT4/MT5 trading password is required" });
    return;
  }
  try {
    await assertTradingServiceDeposit(userId);
  } catch (err: any) {
    res.status(402).json({ error: err.message, code: err.code || "TRADING_DEPOSIT_REQUIRED" });
    return;
  }
  try {
    const account = await linkMtTradingAccount(userId, {
      accountNumber: String(accountNumber),
      broker: String(broker),
      serverName: String(serverName),
      platform: platform === "mt4" ? "mt4" : "mt5",
      tradingPassword: String(password),
    });
    res.status(201).json(mapAccount(account));
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Failed to link account" });
  }
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
