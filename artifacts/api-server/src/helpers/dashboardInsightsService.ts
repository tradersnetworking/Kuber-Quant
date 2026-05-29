import {
  db,
  dbRead,
  investmentsTable,
  investmentPlansTable,
  transactionsTable,
  walletLedgerTable,
  notificationsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gte } from "@workspace/db/orm";
import { getWalletFinancialSummary } from "./walletService";
import { convertToUsd } from "./exchangeRateService";
import {
  activeInvestedAt,
  combinedWalletBalanceAt,
  endOfPreviousUtcMonth,
  startOfPreviousUtcMonth,
  startOfUtcMonth,
} from "./ledgerBalanceUtils";

async function resolvePlanByName(planName: string | null) {
  if (!planName) return null;
  const [plan] = await dbRead.select().from(investmentPlansTable)
    .where(eq(investmentPlansTable.name, planName))
    .limit(1);
  return plan ?? null;
}

export type NextPayoutInsight = {
  nextPayoutDate: string | null;
  nextPayoutAmountUsd: number | null;
  nextPayoutPlanName: string | null;
  nextPayoutInvestmentId: number | null;
  nextPayoutDaysUntil: number | null;
};

function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

function resolveRoiPercent(
  plan: Awaited<ReturnType<typeof resolvePlanByName>>,
  storedPercent?: string | null,
): number {
  if (plan && Number(plan.roiPercent) > 0) return Number(plan.roiPercent);
  if (storedPercent && Number(storedPercent) > 0) return Number(storedPercent);
  return 0;
}

function resolveCapitalReturnAmount(
  principal: number,
  plan: Awaited<ReturnType<typeof resolvePlanByName>>,
): number {
  if (!plan || plan.capitalReturn !== "no") return principal;
  return 0;
}

/** Expected wallet credit when the soonest active investment reaches maturity. */
export async function computeNextMaturityPayout(
  activeInvestments: typeof investmentsTable.$inferSelect[],
): Promise<NextPayoutInsight> {
  const now = Date.now();
  const empty: NextPayoutInsight = {
    nextPayoutDate: null,
    nextPayoutAmountUsd: null,
    nextPayoutPlanName: null,
    nextPayoutInvestmentId: null,
    nextPayoutDaysUntil: null,
  };

  const upcoming = activeInvestments
    .filter((inv) => inv.maturityDate && inv.maturityDate.getTime() > now)
    .sort((a, b) => a.maturityDate!.getTime() - b.maturityDate!.getTime());

  if (upcoming.length === 0) return empty;

  const inv = upcoming[0];
  const maturity = inv.maturityDate!;
  const plan = await resolvePlanByName(inv.planName);
  const principal = Number(inv.amount);
  const roiPercent = resolveRoiPercent(plan, inv.profitPercent);
  const totalProfit = parseFloat((principal * roiPercent / 100).toFixed(8));
  const alreadyPaid = Number(inv.profit || 0);
  const remainingProfit = parseFloat(Math.max(0, totalProfit - alreadyPaid).toFixed(8));
  const capitalReturn = resolveCapitalReturnAmount(principal, plan);
  const maturityPayoutNative = parseFloat((remainingProfit + capitalReturn).toFixed(8));

  if (maturityPayoutNative <= 0) return empty;

  const amountUsd = await convertToUsd(maturityPayoutNative, inv.currency || "USD");

  return {
    nextPayoutDate: maturity.toISOString(),
    nextPayoutAmountUsd: parseFloat(amountUsd.toFixed(2)),
    nextPayoutPlanName: inv.planName,
    nextPayoutInvestmentId: inv.id,
    nextPayoutDaysUntil: daysUntil(maturity),
  };
}

/** @deprecated Use computeNextMaturityPayout — kept as alias for dashboard summary. */
export async function computeNextScheduledPayout(
  activeInvestments: typeof investmentsTable.$inferSelect[],
): Promise<NextPayoutInsight> {
  return computeNextMaturityPayout(activeInvestments);
}

export type MonthlyReturnPoint = {
  month: string;
  return: number;
  invested: number;
};

export type PortfolioAllocation = {
  label: string;
  pct: number;
  value: number;
};

function monthKey(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

export async function computeMonthlyReturns(userId: number): Promise<MonthlyReturnPoint[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const [ledgerProfits, investments] = await Promise.all([
    dbRead.select().from(walletLedgerTable).where(and(
      eq(walletLedgerTable.userId, userId),
      eq(walletLedgerTable.type, "profit"),
      gte(walletLedgerTable.createdAt, sixMonthsAgo),
    )),
    dbRead.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)),
  ]);

  const buckets = new Map<string, { profit: number; invested: number }>();
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { profit: 0, invested: 0 });
  }

  for (const entry of ledgerProfits) {
    const d = entry.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.profit += Number(entry.amount);
  }

  for (const inv of investments) {
    const d = inv.createdAt;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.invested += Number(inv.amount);
  }

  const points: MonthlyReturnPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = buckets.get(key) || { profit: 0, invested: 0 };
    const returnPct = bucket.invested > 0
      ? Number(((bucket.profit / bucket.invested) * 100).toFixed(1))
      : 0;
    points.push({ month: monthKey(d), return: returnPct, invested: bucket.invested });
  }

  if (points.every(p => p.return === 0 && p.invested === 0) && investments.length > 0) {
    return points;
  }

  return points;
}

export function computePortfolioAllocation(opts: {
  fiatBalance: number;
  cryptoBalance: number;
  activeInvested: number;
}): PortfolioAllocation[] {
  const slices = [
    { label: "invested", value: opts.activeInvested },
    { label: "fiat", value: opts.fiatBalance },
    { label: "crypto", value: opts.cryptoBalance },
  ].filter(s => s.value > 0);

  const total = slices.reduce((s, x) => s + x.value, 0);
  if (total <= 0) return [];

  return slices.map(s => ({
    label: s.label,
    value: s.value,
    pct: Number(((s.value / total) * 100).toFixed(1)),
  }));
}

export async function computeDashboardInsights(userId: number) {
  const now = new Date();
  const startOfMonth = startOfUtcMonth(now);
  const startOfLastMonth = startOfPreviousUtcMonth(now);
  const endOfLastMonth = endOfPreviousUtcMonth(now);

  const [walletSummary, user, txns, notifications, activeInvestments, allInvestments, ledgerRows] = await Promise.all([
    getWalletFinancialSummary(userId),
    db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1).then(r => r[0]),
    dbRead.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)),
    dbRead.select().from(notificationsTable).where(and(
      eq(notificationsTable.userId, userId),
      eq(notificationsTable.isRead, false),
    )),
    dbRead.select().from(investmentsTable).where(and(
      eq(investmentsTable.userId, userId),
      eq(investmentsTable.status, "active"),
    )),
    dbRead.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)),
    dbRead.select().from(walletLedgerTable).where(eq(walletLedgerTable.userId, userId)),
  ]);

  const activeInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);
  const portfolioNow = walletSummary.totalBalance + activeInvested;

  const portfolioStartOfMonth = combinedWalletBalanceAt(ledgerRows, startOfMonth)
    + activeInvestedAt(allInvestments, startOfMonth);
  const monthPortfolioChangePct = portfolioStartOfMonth > 0
    ? Number((((portfolioNow - portfolioStartOfMonth) / portfolioStartOfMonth) * 100).toFixed(1))
    : portfolioNow > 0 ? 100 : 0;

  const thisMonthProfit = ledgerRows
    .filter(e => e.type === "profit" && e.createdAt >= startOfMonth && e.createdAt <= now)
    .reduce((s, e) => s + Number(e.amount), 0);
  const lastMonthProfit = ledgerRows
    .filter(e => e.type === "profit" && e.createdAt >= startOfLastMonth && e.createdAt <= endOfLastMonth)
    .reduce((s, e) => s + Number(e.amount), 0);
  const monthProfitChangePct = lastMonthProfit > 0
    ? Number((((thisMonthProfit - lastMonthProfit) / lastMonthProfit) * 100).toFixed(1))
    : thisMonthProfit > 0 ? 100 : 0;

  const pendingTxns = txns.filter(t => t.status === "pending").length;
  const kycPending = user && user.kycStatus !== "verified" ? 1 : 0;
  const pendingActions = pendingTxns + notifications.length + kycPending;

  const nextPayout = await computeNextMaturityPayout(activeInvestments);

  return {
    monthPortfolioChangePct,
    monthProfitChangePct,
    thisMonthProfit,
    pendingActions,
    nextPayoutDate: nextPayout.nextPayoutDate,
    nextPayoutAmountUsd: nextPayout.nextPayoutAmountUsd,
    nextPayoutPlanName: nextPayout.nextPayoutPlanName,
    nextPayoutInvestmentId: nextPayout.nextPayoutInvestmentId,
    nextPayoutDaysUntil: nextPayout.nextPayoutDaysUntil,
    portfolioAllocation: computePortfolioAllocation({
      fiatBalance: walletSummary.fiatBalance,
      cryptoBalance: walletSummary.cryptoBalance,
      activeInvested,
    }),
  };
}
