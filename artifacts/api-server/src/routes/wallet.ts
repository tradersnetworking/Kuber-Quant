import { Router } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { transferBetweenWallets, WalletError, getLedger, mapLedgerEntry, getWalletFinancialSummary } from "../helpers/walletService";
import { attachWalletDisplayFields } from "../helpers/currencyDisplay";
import { mapTxn } from "./transactions";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const summary = await getWalletFinancialSummary(userId);
  const display = await attachWalletDisplayFields({
    fiatBalance: summary.fiatBalance,
    cryptoBalance: summary.cryptoBalance,
    totalBalance: summary.totalBalance,
    totalProfit: summary.totalProfit,
    totalDeposited: summary.totalDeposited,
    totalWithdrawn: summary.totalWithdrawn,
  });

  res.json({
    fiatBalance: summary.fiatBalance,
    cryptoBalance: summary.cryptoBalance,
    totalBalance: summary.totalBalance,
    totalDeposited: summary.totalDeposited,
    totalWithdrawn: summary.totalWithdrawn,
    totalProfit: summary.totalProfit,
    totalInvested: summary.totalInvested,
    totalReferral: summary.totalReferral,
    totalBonus: summary.totalBonus,
    netLedgerFlow: summary.netLedgerFlow,
    balanceSource: summary.source,
    btcBalance: summary.cryptoBalance * 0.4,
    ethBalance: summary.cryptoBalance * 0.3,
    usdtBalance: summary.cryptoBalance * 0.2,
    inrBalance: display.inrBalance,
    eurBalance: display.eurBalance,
    fiatBalanceInr: display.fiatBalanceInr,
    totalBalanceInr: display.totalBalanceInr,
    totalProfitInr: display.totalProfitInr,
    exchangeRates: display.exchangeRates,
  });
});

/** Combined deposit/withdrawal requests + immutable ledger history */
router.get("/history", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const filter = (req.query.type as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const txnTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];
  const ledgerTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];

  const [txns, ledgerEntries, walletSummary] = await Promise.all([
    db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        inArray(transactionsTable.type, [...txnTypes]),
      ))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit),
    getLedger(userId, { limit, types: [...ledgerTypes] }),
    getWalletFinancialSummary(userId),
  ]);

  const allTxns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
  const deposits = allTxns.filter(t => t.type === "deposit");
  const withdrawals = allTxns.filter(t => t.type === "withdrawal");

  res.json({
    summary: {
      totalDeposited: walletSummary.totalDeposited,
      totalWithdrawn: walletSummary.totalWithdrawn,
      fiatBalance: walletSummary.fiatBalance,
      cryptoBalance: walletSummary.cryptoBalance,
      totalBalance: walletSummary.totalBalance,
      netLedgerFlow: walletSummary.netLedgerFlow,
      balanceSource: walletSummary.source,
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
