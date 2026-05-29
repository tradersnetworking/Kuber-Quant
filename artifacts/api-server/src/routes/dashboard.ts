import { Router } from "express";
import { db, dbRead, usersTable, investmentsTable, transactionsTable, copyFollowsTable, algoSubscriptionsTable, walletLedgerTable } from "@workspace/db";
import { eq, and, desc, inArray } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { handleGetWatchlist, handleSaveWatchlist } from "../helpers/watchlistHandlers";
import { clearMarketTickerCache } from "../helpers/marketCache";
import { getWalletFinancialSummary } from "../helpers/walletService";
import { getExchangeRates, usdToInr } from "../helpers/exchangeRateService";
import { computePlatformFinancialStats, parseQueryDateRange, daysForChartRange, inDateRange } from "../helpers/platformStatsService";
import { computePlatformFiatAudit } from "../helpers/platformLedgerAuditService";
import { computeDashboardInsights, computeMonthlyReturns } from "../helpers/dashboardInsightsService";
import { buildPortfolioChartSeries } from "../helpers/ledgerBalanceUtils";

const router = Router();

router.get("/summary", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { from, to, label: statsPeriodLabel } = parseQueryDateRange({
    period: (req.query.period as string | undefined) || "day",
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const walletSummary = await getWalletFinancialSummary(userId);

  const investments = await dbRead.select().from(investmentsTable).where(eq(investmentsTable.userId, userId));
  const activeInvestments = investments.filter(i => i.status === "active");
  const activeInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const lifetimeInvested = investments.reduce((s, i) => s + Number(i.amount), 0);

  const follows = await db.select().from(copyFollowsTable)
    .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)));
  const algoSubs = await db.select().from(algoSubscriptionsTable)
    .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)));

  const userTxns = await dbRead.select().from(transactionsTable).where(eq(transactionsTable.userId, userId));
  const [txnTotals, periodTotals, fiatAudit] = await Promise.all([
    computePlatformFinancialStats({
      transactions: userTxns,
      investments: [],
      from: null,
      to: null,
    }),
    computePlatformFinancialStats({
      transactions: userTxns,
      investments: [],
      from,
      to,
    }),
    computePlatformFiatAudit({ from, to, investorIds: [userId] }),
  ]);

  const totalPortfolio = walletSummary.totalBalance + activeInvested;
  const totalProfit = walletSummary.totalProfit;
  const fx = await getExchangeRates();
  const insights = await computeDashboardInsights(userId);
  const totalInvested = activeInvested;

  res.json({
    totalBalance: walletSummary.totalBalance,
    totalPortfolio,
    totalPortfolioInr: usdToInr(totalPortfolio, fx),
    fiatBalance: walletSummary.fiatBalance,
    fiatBalanceInr: usdToInr(walletSummary.fiatBalance, fx),
    cryptoBalance: walletSummary.cryptoBalance,
    totalDeposited: walletSummary.totalDeposited,
    totalWithdrawn: walletSummary.totalWithdrawn,
    totalFiatDeposits: txnTotals.totalFiatDeposits,
    totalFiatWithdrawals: txnTotals.totalFiatWithdrawals,
    totalCryptoDeposits: txnTotals.totalCryptoDeposits,
    totalCryptoWithdrawals: txnTotals.totalCryptoWithdrawals,
    totalFiatDepositsInr: usdToInr(txnTotals.totalFiatDeposits, fx),
    totalFiatWithdrawalsInr: usdToInr(txnTotals.totalFiatWithdrawals, fx),
    totalCryptoDepositsInr: usdToInr(txnTotals.totalCryptoDeposits, fx),
    totalCryptoWithdrawalsInr: usdToInr(txnTotals.totalCryptoWithdrawals, fx),
    monthFiatDeposits: fiatAudit.periodDeposits,
    monthFiatWithdrawals: fiatAudit.periodWithdrawals,
    monthCryptoDeposits: periodTotals.totalCryptoDeposits,
    monthCryptoWithdrawals: periodTotals.totalCryptoWithdrawals,
    monthFiatDepositsInr: usdToInr(fiatAudit.periodDeposits, fx),
    monthFiatWithdrawalsInr: usdToInr(fiatAudit.periodWithdrawals, fx),
    monthCryptoDepositsInr: usdToInr(periodTotals.totalCryptoDeposits, fx),
    monthCryptoWithdrawalsInr: usdToInr(periodTotals.totalCryptoWithdrawals, fx),
    periodFiatDeposits: fiatAudit.periodDeposits,
    periodFiatWithdrawals: fiatAudit.periodWithdrawals,
    periodCryptoDeposits: periodTotals.totalCryptoDeposits,
    periodCryptoWithdrawals: periodTotals.totalCryptoWithdrawals,
    periodFiatDepositsInr: usdToInr(fiatAudit.periodDeposits, fx),
    periodFiatWithdrawalsInr: usdToInr(fiatAudit.periodWithdrawals, fx),
    periodCryptoDepositsInr: usdToInr(periodTotals.totalCryptoDeposits, fx),
    periodCryptoWithdrawalsInr: usdToInr(periodTotals.totalCryptoWithdrawals, fx),
    periodInvested: fiatAudit.periodInvestmentOut,
    periodInvestedInr: usdToInr(fiatAudit.periodInvestmentOut, fx),
    periodMaturityProfits: fiatAudit.periodMaturityProfits,
    periodMaturityProfitsInr: usdToInr(fiatAudit.periodMaturityProfits, fx),
    fiatBalanceAudit: fiatAudit,
    statsPeriodLabel,
    totalProfit,
    totalProfitInr: usdToInr(totalProfit, fx),
    totalInvested,
    totalInvestedInr: usdToInr(totalInvested, fx),
    lifetimeInvested,
    lifetimeInvestedInr: usdToInr(lifetimeInvested, fx),
    activeInvested,
    activeInvestedInr: usdToInr(activeInvested, fx),
    ledgerInvestedNet: walletSummary.totalInvested,
    ledgerInvestedOut: walletSummary.totalInvestedOut,
    ledgerInvestmentReturns: walletSummary.totalInvestmentReturns,
    netLedgerFlow: walletSummary.netLedgerFlow,
    balanceSource: walletSummary.source,
    exchangeRates: {
      USD_INR: fx.USD_INR,
      USD_EUR: fx.USD_EUR,
      USDT_USD: fx.USDT_USD,
      updatedAt: fx.updatedAt,
      source: fx.source,
    },
    activeInvestments: activeInvestments.length,
    profitPercentage: lifetimeInvested > 0
      ? Number(((totalProfit / lifetimeInvested) * 100).toFixed(2))
      : 0,
    followedTraders: follows.length,
    activeAlgoStrategies: algoSubs.length,
    referralEarnings: Number(user.referralEarnings),
    monthPortfolioChangePct: insights.monthPortfolioChangePct,
    monthProfitChangePct: insights.monthProfitChangePct,
    thisMonthProfit: insights.thisMonthProfit,
    thisMonthProfitInr: usdToInr(insights.thisMonthProfit, fx),
    pendingActions: insights.pendingActions,
    nextPayoutDate: insights.nextPayoutDate,
    nextPayoutAmountUsd: insights.nextPayoutAmountUsd,
    nextPayoutAmountInr: insights.nextPayoutAmountUsd != null
      ? usdToInr(insights.nextPayoutAmountUsd, fx)
      : null,
    nextPayoutPlanName: insights.nextPayoutPlanName,
    nextPayoutInvestmentId: insights.nextPayoutInvestmentId,
    nextPayoutDaysUntil: insights.nextPayoutDaysUntil,
    portfolioAllocation: insights.portfolioAllocation,
  });
});

router.get("/monthly-returns", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const points = await computeMonthlyReturns(userId);
  res.json(points);
});

router.get("/portfolio-chart", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { from, to } = parseQueryDateRange({
    period: (req.query.period as string | undefined) || "day",
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  const days = daysForChartRange(from, to, 30);

  const [walletSummary, investments, ledgerRows] = await Promise.all([
    getWalletFinancialSummary(userId),
    dbRead.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)),
    dbRead.select().from(walletLedgerTable)
      .where(eq(walletLedgerTable.userId, userId))
      .orderBy(walletLedgerTable.createdAt),
  ]);

  const activeInvested = investments
    .filter(i => i.status === "active")
    .reduce((s, i) => s + Number(i.amount), 0);
  const currentTotalPortfolio = walletSummary.totalBalance + activeInvested;

  const filteredLedger = ledgerRows.filter(r => inDateRange(r.createdAt, from, to));

  if (filteredLedger.length === 0 && ledgerRows.length === 0) {
    const txns = await db.select().from(transactionsTable)
      .where(and(eq(transactionsTable.userId, userId), eq(transactionsTable.status, "approved")))
      .orderBy(transactionsTable.createdAt);

    const rangeTxns = txns.filter(t => inDateRange(t.createdAt, from, to));
    let running = 0;
    const points: { date: string; value: number }[] = [];
    const endDate = to ?? new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(endDate);
      d.setUTCDate(d.getUTCDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const dayTxns = rangeTxns.filter(t => t.createdAt.toISOString().slice(0, 10) <= dayStr);
      running = dayTxns.reduce((s, t) => {
        const amt = Number(t.amount);
        return t.type === "deposit" ? s + amt : s - amt;
      }, 0);
      points.push({ date: dayStr, value: Math.max(0, running) });
    }
    if (points.length) points[points.length - 1].value = currentTotalPortfolio;
    res.json(points);
    return;
  }

  const points = buildPortfolioChartSeries({
    ledgerRows: filteredLedger.length ? filteredLedger : ledgerRows,
    investments,
    days,
    currentTotalPortfolio,
  });
  res.json(points);
});

router.get("/recent-activity", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { from, to } = parseQueryDateRange({
    period: (req.query.period as string | undefined) || "day",
    from: req.query.from as string | undefined,
    to: req.query.to as string | undefined,
  });
  const limit = Math.min(Number(req.query.limit) || 8, 50);

  const txns = await db.select().from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, userId),
      inArray(transactionsTable.type, ["deposit", "withdrawal"]),
    ))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(200);

  const activities = txns
    .filter(t => inDateRange(t.createdAt, from, to))
    .slice(0, limit)
    .map((t) => ({
    id: t.id,
    transactionId: t.id,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    paymentMethod: t.paymentMethod || null,
    createdAt: t.createdAt.toISOString(),
  }));

  res.json(activities);
});

router.get("/market-watchlist", requireAuth, handleGetWatchlist);
router.put("/market-watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));
router.post("/market-watchlist", requireAuth, (req, res) => handleSaveWatchlist(req, res, clearMarketTickerCache));

export default router;
