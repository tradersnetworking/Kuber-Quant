import { dbRead, investmentsTable } from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import {
  getWalletFinancialSummary,
  getCryptoCurrencyBreakdown,
  isCryptoCurrency,
  walletForCurrency,
} from "./walletService";
import { convertToUsd, getExchangeRates, usdToInr } from "./exchangeRateService";

export type InvestmentFundingSnapshot = {
  currency: string;
  walletType: "fiat" | "crypto";
  availableBalance: number;
  availableBalanceInr: number | null;
  activeInvested: number;
  activeInvestedInr: number | null;
  activeInvestmentCount: number;
  totalPortfolio: number;
  totalPortfolioInr: number | null;
};

export type InvestmentFundingValidation = InvestmentFundingSnapshot & {
  ok: boolean;
  requestedAmount?: number;
  shortfall?: number;
  message?: string;
};

async function activeInvestmentsForUser(userId: number) {
  return dbRead.select().from(investmentsTable).where(and(
    eq(investmentsTable.userId, userId),
    eq(investmentsTable.status, "active"),
  ));
}

/** Liquid wallet balance available to fund a new investment in the given currency. */
export async function resolveAvailableBalance(userId: number, currency: string): Promise<number> {
  const summary = await getWalletFinancialSummary(userId);
  const cur = currency.toUpperCase();

  if (!isCryptoCurrency(cur)) {
    const fx = await getExchangeRates();
    if (cur === "USD") return summary.fiatBalance;
    if (cur === "INR") return parseFloat((summary.fiatBalance * fx.USD_INR).toFixed(2));
    if (cur === "EUR") return parseFloat((summary.fiatBalance * fx.USD_EUR).toFixed(2));
    return summary.fiatBalance;
  }

  if (cur === "USDT") return summary.cryptoBalance;

  const breakdown = await getCryptoCurrencyBreakdown(userId);
  return breakdown[cur] ?? 0;
}

export async function getInvestmentFundingSnapshot(
  userId: number,
  currency: string,
): Promise<InvestmentFundingSnapshot> {
  const cur = currency.toUpperCase();
  const fx = await getExchangeRates();
  const [summary, activeRows] = await Promise.all([
    getWalletFinancialSummary(userId),
    activeInvestmentsForUser(userId),
  ]);

  const availableBalance = await resolveAvailableBalance(userId, cur);

  let activeInvestedUsd = 0;
  for (const inv of activeRows) {
    activeInvestedUsd += await convertToUsd(Number(inv.amount), inv.currency || "USD");
  }

  let activeInvested = activeInvestedUsd;
  if (cur === "INR") activeInvested = parseFloat((activeInvestedUsd * fx.USD_INR).toFixed(2));
  else if (cur === "EUR") activeInvested = parseFloat((activeInvestedUsd * fx.USD_EUR).toFixed(2));
  else if (isCryptoCurrency(cur) && cur !== "USDT") {
    activeInvested = activeRows
      .filter((inv) => (inv.currency || "").toUpperCase() === cur)
      .reduce((s, inv) => s + Number(inv.amount), 0);
  }

  const totalPortfolioUsd = summary.totalBalance + activeInvestedUsd;
  let totalPortfolio = totalPortfolioUsd;
  if (cur === "INR") totalPortfolio = parseFloat((totalPortfolioUsd * fx.USD_INR).toFixed(2));
  else if (cur === "EUR") totalPortfolio = parseFloat((totalPortfolioUsd * fx.USD_EUR).toFixed(2));

  const availableBalanceUsd = isCryptoCurrency(cur) && cur !== "USDT"
    ? await convertToUsd(availableBalance, cur)
    : cur === "USD"
      ? availableBalance
      : await convertToUsd(availableBalance, cur);

  return {
    currency: cur,
    walletType: walletForCurrency(cur),
    availableBalance: parseFloat(availableBalance.toFixed(8)),
    availableBalanceInr: usdToInr(availableBalanceUsd, fx),
    activeInvested: parseFloat(activeInvested.toFixed(2)),
    activeInvestedInr: usdToInr(activeInvestedUsd, fx),
    activeInvestmentCount: activeRows.length,
    totalPortfolio: parseFloat(totalPortfolio.toFixed(2)),
    totalPortfolioInr: usdToInr(totalPortfolioUsd, fx),
  };
}

export async function validateInvestmentFunding(
  userId: number,
  amount: number,
  currency: string,
): Promise<InvestmentFundingValidation> {
  const snapshot = await getInvestmentFundingSnapshot(userId, currency);
  const shortfall = parseFloat((amount - snapshot.availableBalance).toFixed(8));

  if (amount > snapshot.availableBalance + 1e-8) {
    const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      ...snapshot,
      ok: false,
      requestedAmount: amount,
      shortfall: Math.max(0, shortfall),
      message: snapshot.activeInvestmentCount > 0
        ? `Insufficient available balance. You have ${fmt(snapshot.availableBalance)} ${snapshot.currency} free to invest and ${fmt(snapshot.activeInvested)} ${snapshot.currency} already locked in active plans. Add funds or reduce the amount.`
        : `Insufficient available balance. You have ${fmt(snapshot.availableBalance)} ${snapshot.currency} available. Add funds or reduce the amount.`,
    };
  }

  return { ...snapshot, ok: true };
}
