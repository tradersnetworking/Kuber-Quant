import { Router } from "express";
import { db, usersTable, transactionsTable, userPaymentAccountsTable } from "@workspace/db";
import { eq, desc, and, inArray, gte, lte } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { transferBetweenWallets, WalletError, getLedger, mapLedgerEntry, getWalletFinancialSummary, getCryptoCurrencyBreakdown, type WalletType } from "../helpers/walletService";
import { attachWalletDisplayFields } from "../helpers/currencyDisplay";
import { getTradingServiceDepositStatus } from "../helpers/tradingServiceDepositGate";
import { mapTxn } from "./transactions";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { WalletTransferBody } from "@workspace/api-zod";
import { parseQueryDateRange, inDateRange } from "../helpers/platformStatsService";

function mapPayoutAccount(a: typeof userPaymentAccountsTable.$inferSelect) {
  return {
    id: a.id,
    label: a.label,
    accountType: a.accountType,
    accountHolderName: a.accountHolderName || null,
    bankName: a.bankName || null,
    accountNumber: a.accountNumber || null,
    ifscCode: a.ifscCode || null,
    branchName: a.branchName || null,
    upiId: a.upiId || null,
    upiQrUrl: a.upiQrUrl || null,
    cryptoSymbol: a.cryptoSymbol || null,
    cryptoNetwork: a.cryptoNetwork || null,
    walletAddress: a.walletAddress || null,
    walletQrUrl: a.walletQrUrl || null,
    isDefault: a.isDefault,
  };
}

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const summary = await getWalletFinancialSummary(userId);
  const cryptoBreakdown = await getCryptoCurrencyBreakdown(userId);
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
    totalInvestedOut: summary.totalInvestedOut,
    totalInvestmentReturns: summary.totalInvestmentReturns,
    totalReferral: summary.totalReferral,
    totalBonus: summary.totalBonus,
    netLedgerFlow: summary.netLedgerFlow,
    balanceSource: summary.source,
    btcBalance: cryptoBreakdown.BTC ?? 0,
    ethBalance: cryptoBreakdown.ETH ?? 0,
    usdtBalance: cryptoBreakdown.USDT ?? 0,
    cryptoBreakdown,
    inrBalance: display.inrBalance,
    eurBalance: display.eurBalance,
    fiatBalanceInr: display.fiatBalanceInr,
    totalBalanceInr: display.totalBalanceInr,
    totalProfitInr: display.totalProfitInr,
    exchangeRates: display.exchangeRates,
  });
});

router.get("/trading-service-deposit", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await getTradingServiceDepositStatus(userId));
});

router.get("/withdrawal-limits", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { getWithdrawalVelocityUsage } = await import("../helpers/withdrawalVelocityService");
  res.json(await getWithdrawalVelocityUsage(userId));
});

/** Pending deposit & withdrawal requests awaiting review */
router.get("/upcoming", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { listUpcomingForUser } = await import("../helpers/upcomingTransactionsService");
  res.json(await listUpcomingForUser(userId, Math.min(Number(req.query.limit) || 50, 100)));
});

/** Combined deposit/withdrawal requests + immutable ledger history */
router.get("/history", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const filter = (req.query.type as string) || "all";
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { from, to, label: periodLabel } = parseQueryDateRange({
    period: req.query.period as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  const txnTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];
  const ledgerTypes = filter === "all" ? (["deposit", "withdrawal"] as const) : [filter as "deposit" | "withdrawal"];

  const [allUserTxns, ledgerEntries, walletSummary] = await Promise.all([
    db.select().from(transactionsTable)
      .where(and(
        eq(transactionsTable.userId, userId),
        inArray(transactionsTable.type, ["deposit", "withdrawal"]),
      ))
      .orderBy(desc(transactionsTable.createdAt)),
    getLedger(userId, { limit: 500, types: [...ledgerTypes], from, to }),
    getWalletFinancialSummary(userId),
  ]);

  const txns = allUserTxns
    .filter(t => txnTypes.includes(t.type as "deposit" | "withdrawal"))
    .filter(t => inDateRange(t.createdAt, from, to))
    .slice(0, limit);

  const deposits = allUserTxns.filter(t => t.type === "deposit");
  const withdrawals = allUserTxns.filter(t => t.type === "withdrawal");
  const periodDeposits = deposits.filter(t => inDateRange(t.createdAt, from, to));
  const periodWithdrawals = withdrawals.filter(t => inDateRange(t.createdAt, from, to));

  const accountIds = [...new Set(txns.map(t => t.paymentAccountId).filter((id): id is number => id != null))];
  const payoutRows = accountIds.length
    ? await db.select().from(userPaymentAccountsTable).where(inArray(userPaymentAccountsTable.id, accountIds))
    : [];
  const payoutById = new Map(payoutRows.map(a => [a.id, mapPayoutAccount(a)]));

  const periodLedger = ledgerEntries.slice(0, limit);

  res.json({
    periodLabel,
    summary: {
      totalDeposited: walletSummary.totalDeposited,
      totalWithdrawn: walletSummary.totalWithdrawn,
      periodDeposited: periodDeposits.filter(t => t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
      periodWithdrawn: periodWithdrawals.filter(t => t.status === "approved").reduce((s, t) => s + Number(t.amount), 0),
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
    requests: txns.map(t => ({
      ...mapTxn(t),
      payoutAccount: t.paymentAccountId ? payoutById.get(t.paymentAccountId) ?? null : null,
    })),
    ledger: periodLedger.map(mapLedgerEntry),
  });
});

router.post("/transfer", requireAuth, validateBody(WalletTransferBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { fromWallet, toWallet, amount } = getValidatedBody<{
    fromWallet: string;
    toWallet: string;
    amount: number;
  }>(req);
  if (amount <= 0) {
    res.status(400).json({ error: "amount must be positive" });
    return;
  }
  try {
    const normalizeWallet = (w: string): WalletType =>
      w === "fiat" ? "fiat" : "crypto";

    await transferBetweenWallets({
      userId,
      fromWallet: normalizeWallet(fromWallet),
      toWallet: normalizeWallet(toWallet),
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

router.get("/statement", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { from, to, label } = parseQueryDateRange({
    period: req.query.period as string | undefined,
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  const toDate = to ?? new Date();
  const fromDate = from ?? new Date(toDate.getTime() - 3650 * 24 * 60 * 60 * 1000);

  const { buildInvestorStatementCsv } = await import("../helpers/investorStatementService");
  const csv = await buildInvestorStatementCsv(userId, fromDate, toDate);
  const slug = label.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "statement";
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="kuber-statement-${fromDate.toISOString().slice(0, 10)}-${slug}.csv"`);
  res.send(csv);
});

export default router;
