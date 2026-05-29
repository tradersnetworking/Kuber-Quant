/** Reconstruct combined fiat + crypto wallet balance at a point in time from ledger rows. */
export function combinedWalletBalanceAt(
  rows: Array<{ walletType: string; balanceAfter: string | number; createdAt: Date }>,
  asOf: Date,
): number {
  const cutoff = asOf.getTime();
  let fiat = 0;
  let crypto = 0;
  const sorted = [...rows].sort((a, b) => {
    const diff = a.createdAt.getTime() - b.createdAt.getTime();
    if (diff !== 0) return diff;
    const aId = "id" in a ? Number((a as { id?: number }).id) : 0;
    const bId = "id" in b ? Number((b as { id?: number }).id) : 0;
    return aId - bId;
  });

  for (const row of sorted) {
    if (row.createdAt.getTime() > cutoff) break;
    if (row.walletType === "fiat") fiat = Number(row.balanceAfter);
    else if (row.walletType === "crypto") crypto = Number(row.balanceAfter);
  }

  return fiat + crypto;
}

export function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function startOfUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfPreviousUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
}

export function endOfPreviousUtcMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0, 23, 59, 59, 999));
}

export type InvestmentLike = {
  amount: string | number;
  status: string;
  createdAt: Date;
  maturityDate?: Date | null;
};

/** Whether an investment was still active (principal locked) at a given instant. */
export function wasInvestmentActiveAt(inv: InvestmentLike, at: Date): boolean {
  if (inv.createdAt.getTime() > at.getTime()) return false;
  if (inv.status === "active") return true;
  if (inv.status === "completed" && inv.maturityDate && inv.maturityDate.getTime() > at.getTime()) {
    return true;
  }
  return false;
}

export function activeInvestedAt(investments: InvestmentLike[], at: Date): number {
  return investments
    .filter((inv) => wasInvestmentActiveAt(inv, at))
    .reduce((sum, inv) => sum + Number(inv.amount), 0);
}

export function buildPortfolioChartSeries(opts: {
  ledgerRows: Array<{ walletType: string; balanceAfter: string | number; createdAt: Date }>;
  investments: InvestmentLike[];
  days?: number;
  currentTotalPortfolio: number;
}): Array<{ date: string; value: number }> {
  const days = opts.days ?? 30;
  const now = new Date();
  const points: Array<{ date: string; value: number }> = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const dayEnd = endOfUtcDay(d);
    const dayStr = d.toISOString().slice(0, 10);
    const wallet = combinedWalletBalanceAt(opts.ledgerRows, dayEnd);
    const invested = activeInvestedAt(opts.investments, dayEnd);
    points.push({ date: dayStr, value: parseFloat((wallet + invested).toFixed(2)) });
  }

  if (points.length) {
    points[points.length - 1].value = opts.currentTotalPortfolio;
  }

  return points;
}
