import type { Transaction, Investment } from "@workspace/db";
import { convertToUsd } from "./exchangeRateService";

export type StatsPeriod = "all" | "present" | "day" | "week" | "month" | "quarter" | "half_year" | "year" | "custom";

const CRYPTO_CURRENCIES = new Set(["BTC", "ETH", "USDT", "TRX", "BNB"]);

export function isCryptoCurrency(currency: string): boolean {
  return CRYPTO_CURRENCIES.has(currency.toUpperCase());
}

export function parseStatsPeriod(raw?: string, fallback: StatsPeriod = "day"): StatsPeriod {
  const p = (raw || fallback).toLowerCase().replace(/-/g, "_");
  if (p === "halfyear" || p === "halfyearly") return "half_year";
  if (
    p === "present" || p === "day" || p === "week" || p === "month" || p === "quarter"
    || p === "half_year" || p === "year" || p === "custom" || p === "all"
  ) return p;
  return fallback;
}

export function parseStaffStatsPeriod(raw?: string): StatsPeriod {
  return parseStatsPeriod(raw, "present");
}

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function endOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

export function resolveStatsDateRange(
  period: StatsPeriod,
  fromParam?: string,
  toParam?: string,
): { from: Date | null; to: Date | null; label: string } {
  const now = new Date();

  if (period === "present") {
    return { from: null, to: now, label: "Present" };
  }
  if (period === "day") {
    const from = startOfUtcDay(now);
    return { from, to: now, label: "Today" };
  }
  if (period === "week") {
    const from = startOfUtcDay(now);
    const dow = from.getUTCDay();
    const daysFromMonday = (dow + 6) % 7;
    from.setUTCDate(from.getUTCDate() - daysFromMonday);
    return { from, to: now, label: "This week" };
  }
  if (period === "month") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { from, to: now, label: "This month" };
  }
  if (period === "quarter") {
    const qStartMonth = Math.floor(now.getUTCMonth() / 3) * 3;
    const from = new Date(Date.UTC(now.getUTCFullYear(), qStartMonth, 1));
    return { from, to: now, label: "This quarter" };
  }
  if (period === "half_year") {
    const halfStartMonth = now.getUTCMonth() < 6 ? 0 : 6;
    const from = new Date(Date.UTC(now.getUTCFullYear(), halfStartMonth, 1));
    return { from, to: now, label: "This half-year" };
  }
  if (period === "year") {
    const from = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    return { from, to: now, label: "This year" };
  }
  if (period === "custom") {
    if (!fromParam?.trim()) {
      return { from: null, to: null, label: "All time" };
    }
    const fromDate = new Date(`${fromParam.trim()}T00:00:00.000Z`);
    if (Number.isNaN(fromDate.getTime())) {
      return { from: null, to: null, label: "All time" };
    }
    const toDate = toParam?.trim()
      ? endOfUtcDay(new Date(`${toParam.trim()}T00:00:00.000Z`))
      : endOfUtcDay(fromDate);
    if (Number.isNaN(toDate.getTime())) {
      return { from: startOfUtcDay(fromDate), to: endOfUtcDay(fromDate), label: fromParam };
    }
    const from = startOfUtcDay(fromDate);
    const label = fromParam === toParam?.trim() || !toParam?.trim()
      ? fromParam
      : `${fromParam} → ${toParam}`;
    return { from, to: toDate, label };
  }

  return { from: null, to: null, label: "All time" };
}

export function inDateRange(iso: Date | string | null | undefined, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return true;
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t <= to.getTime();
}

export function parseQueryDateRange(query: { period?: string; from?: string; to?: string }) {
  const period = parseStatsPeriod(query.period);
  const { from, to, label } = resolveStatsDateRange(period, query.from, query.to);
  return { period, from, to, label };
}

/** Chart day count from a resolved stats range (defaults to 30). */
export function daysForChartRange(from: Date | null, to: Date | null, defaultDays = 30): number {
  if (!from || !to) return defaultDays;
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.min(366, Math.ceil(ms / (24 * 60 * 60 * 1000)) + 1));
}

async function sumTransactionsUsd(
  txns: Transaction[],
  type: "deposit" | "withdrawal",
  asset: "fiat" | "crypto" | "all",
): Promise<number> {
  let total = 0;
  for (const t of txns) {
    if (t.type !== type || t.status !== "approved") continue;
    const crypto = isCryptoCurrency(t.currency);
    if (asset === "fiat" && crypto) continue;
    if (asset === "crypto" && !crypto) continue;
    total += await convertToUsd(Number(t.amount), t.currency);
  }
  return total;
}

export async function computePlatformFinancialStats(opts: {
  transactions: Transaction[];
  investments: Investment[];
  from: Date | null;
  to: Date | null;
}) {
  const txns = opts.transactions.filter(t => inDateRange(t.createdAt, opts.from, opts.to));
  const investments = opts.investments.filter(i => inDateRange(i.createdAt, opts.from, opts.to));

  const [
    totalFiatDeposits,
    totalCryptoDeposits,
    totalFiatWithdrawals,
    totalCryptoWithdrawals,
  ] = await Promise.all([
    sumTransactionsUsd(txns, "deposit", "fiat"),
    sumTransactionsUsd(txns, "deposit", "crypto"),
    sumTransactionsUsd(txns, "withdrawal", "fiat"),
    sumTransactionsUsd(txns, "withdrawal", "crypto"),
  ]);

  const totalDeposits = totalFiatDeposits + totalCryptoDeposits;
  const totalWithdrawals = totalFiatWithdrawals + totalCryptoWithdrawals;

  return {
    totalDeposits,
    totalWithdrawals,
    netFunds: totalDeposits - totalWithdrawals,
    totalFiatDeposits,
    totalFiatWithdrawals,
    totalCryptoDeposits,
    totalCryptoWithdrawals,
    totalInvestments: investments.reduce((s, i) => s + Number(i.amount), 0),
    activeInvestmentCount: investments.filter(i => i.status === "active").length,
    totalProfit: investments.reduce((s, i) => s + Number(i.profit), 0),
  };
}

/** Calendar-today outbound: withdrawal requests + investment plan maturity payouts. */
export async function computeTodayPayments(opts: {
  transactions: Transaction[];
  investments: Investment[];
}) {
  const { from, to, label } = resolveStatsDateRange("day");

  let todayWithdrawalRequestsUsd = 0;
  let todayWithdrawalRequestsCount = 0;

  for (const t of opts.transactions) {
    if (t.type !== "withdrawal" || t.status === "rejected") continue;
    if (!inDateRange(t.createdAt, from, to)) continue;
    todayWithdrawalRequestsUsd += await convertToUsd(Number(t.amount), t.currency);
    todayWithdrawalRequestsCount++;
  }

  let todayMaturityPayoutsUsd = 0;
  let todayMaturityCount = 0;

  for (const inv of opts.investments) {
    if (!inv.maturityDate) continue;
    if (!inDateRange(inv.maturityDate, from, to)) continue;
    if (inv.status !== "completed" && inv.status !== "active") continue;

    const amount = Number(inv.amount);
    const profitRecorded = Number(inv.profit || 0);
    let payoutNative: number;

    if (inv.status === "completed") {
      payoutNative = amount + profitRecorded;
    } else {
      const roiPercent = Number(inv.profitPercent || 0);
      const totalProfit = parseFloat((amount * roiPercent / 100).toFixed(8));
      payoutNative = amount + totalProfit;
    }

    todayMaturityPayoutsUsd += await convertToUsd(payoutNative, inv.currency || "USD");
    todayMaturityCount++;
  }

  const todayPaymentsUsd = todayWithdrawalRequestsUsd + todayMaturityPayoutsUsd;

  return {
    todayLabel: label,
    todayPaymentsUsd,
    todayWithdrawalRequestsUsd,
    todayWithdrawalRequestsCount,
    todayMaturityPayoutsUsd,
    todayMaturityCount,
  };
}
