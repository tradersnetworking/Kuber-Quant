import {
  getExchangeRates,
  buildDualCurrencyFields,
  type FxRates,
} from "./exchangeRateService";

export async function withDualCurrencyDisplay(usdAmount: number, rates?: FxRates) {
  const fx = rates ?? await getExchangeRates();
  return buildDualCurrencyFields(usdAmount, fx);
}

export async function attachWalletDisplayFields(summary: {
  fiatBalance: number;
  cryptoBalance: number;
  totalBalance: number;
  totalProfit?: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
}) {
  const rates = await getExchangeRates();
  const fiat = buildDualCurrencyFields(summary.fiatBalance, rates);
  const total = buildDualCurrencyFields(summary.totalBalance, rates);
  const profit = buildDualCurrencyFields(summary.totalProfit ?? 0, rates);
  return {
    ...summary,
    inrBalance: fiat.inr,
    eurBalance: fiat.eur,
    fiatBalanceInr: fiat.inr,
    totalBalanceInr: total.inr,
    totalProfitInr: profit.inr,
    exchangeRates: {
      USD_INR: rates.USD_INR,
      USD_EUR: rates.USD_EUR,
      USDT_USD: rates.USDT_USD,
      updatedAt: rates.updatedAt,
      source: rates.source,
    },
  };
}
