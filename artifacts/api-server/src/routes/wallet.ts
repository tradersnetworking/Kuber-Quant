import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { transferBetweenWallets, WalletError, getLedger, mapLedgerEntry } from "../helpers/walletService";
import { mapTxn } from "./transactions";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
  const deposits = txns.filter(t => t.type === "deposit" && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);
  const withdrawals = txns.filter(t => t.type === "withdrawal" && t.status === "approved")
    .reduce((s, t) => s + Number(t.amount), 0);

  const fiat = Number(user.balanceFiat);
  const crypto = Number(user.balanceCrypto);

  res.json({
    fiatBalance: fiat,
    cryptoBalance: crypto,
    totalDeposited: deposits,
    totalWithdrawn: withdrawals,
    totalProfit: Number(user.totalProfit),
    btcBalance: crypto * 0.4,
    ethBalance: crypto * 0.3,
    usdtBalance: crypto * 0.2,
    inrBalance: fiat * 83.5,
  });
});

/** Combined deposit/withdrawal requests + immutable ledger history */
router.get("/history", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const filter = (req.query.type as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const txnTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];
  const ledgerTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];

  const [txns, ledgerEntries] = await Promise.all([
    db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        inArray(transactionsTable.type, [...txnTypes]),
      ))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit),
    getLedger(userId, { limit, types: [...ledgerTypes] }),
  ]);

  const allTxns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
  const deposits = allTxns.filter(t => t.type === "deposit");
  const withdrawals = allTxns.filter(t => t.type === "withdrawal");

  res.json({
    summary: {
      totalDeposited: deposits.filter(t => t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
      totalWithdrawn: withdrawals.filter(t => t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
      pendingDeposits: deposits.filter(t => t.status === "pending").length,
      pendingWithdrawals: withdrawals.filter(t => t.status === "pending").length,
      rejectedDeposits: deposits.filter(t => t.status === "rejected").length,
      rejectedWithdrawals: withdrawals.filter(t => t.status === "rejected").length,
    },
    requests: txns.map(t => mapTxn(t)),
    ledger: ledgerEntries.map(mapLedgerEntry),
  });
});

router.post("/transfer", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { fromWallet, toWallet, amount } = req.body;
  if (!fromWallet || !toWallet || !amount || amount <= 0) {
    res.status(400).json({ error: "fromWallet, toWallet, amount are required" });
    return;
  }
  try {
    await transferBetweenWallets({
      userId,
      fromWallet,
      toWallet,
      amount: Number(amount),
    });
    res.json({ message: "Transfer successful" });
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

export default router;
