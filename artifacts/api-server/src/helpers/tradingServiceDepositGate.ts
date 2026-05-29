import { db, transactionsTable, siteSettingsTable } from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import { convertToUsd, getExchangeRates, usdToInr } from "./exchangeRateService";
import { getWalletFinancialSummary, WalletError } from "./walletService";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

export type TradingServiceDepositStatus = {
  qualified: boolean;
  minUsd: number;
  minInr: number;
  minUsdt: number;
  totalDepositedUsd: number;
  totalInrDeposits: number;
  walletUsd: number;
  walletInr: number;
  exchangeRateUsdInr: number;
  exchangeRateSource: string;
  exchangeRateUpdatedAt: string;
  shortfallUsd: number;
  shortfallInr: number;
};

export async function getTradingServiceDepositStatus(userId: number): Promise<TradingServiceDepositStatus> {
  const minUsd = Number(await getSetting("trading_service_min_deposit_usd", "100"));
  const minInr = Number(await getSetting("trading_service_min_deposit_inr", "10000"));
  const minUsdt = minUsd;

  const rates = await getExchangeRates();
  const summary = await getWalletFinancialSummary(userId);
  const walletUsd = summary.fiatBalance + summary.cryptoBalance;
  const walletInr = usdToInr(walletUsd, rates);

  const approvedDeposits = await db.select().from(transactionsTable).where(and(
    eq(transactionsTable.userId, userId),
    eq(transactionsTable.type, "deposit"),
    eq(transactionsTable.status, "approved"),
  ));

  let totalDepositedUsd = 0;
  let totalInrDeposits = 0;
  for (const txn of approvedDeposits) {
    const amount = Number(txn.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const cur = String(txn.currency || "USD").toUpperCase();
    if (cur === "INR") totalInrDeposits += amount;
    totalDepositedUsd += await convertToUsd(amount, cur);
  }

  const bestUsd = Math.max(totalDepositedUsd, walletUsd);
  const bestInr = Math.max(totalInrDeposits, walletInr);

  const qualified =
    bestUsd >= minUsd - 1e-6 ||
    bestInr >= minInr - 1e-6;

  return {
    qualified,
    minUsd,
    minInr,
    minUsdt,
    totalDepositedUsd: parseFloat(totalDepositedUsd.toFixed(2)),
    totalInrDeposits: parseFloat(totalInrDeposits.toFixed(2)),
    walletUsd: parseFloat(walletUsd.toFixed(2)),
    walletInr,
    exchangeRateUsdInr: rates.USD_INR,
    exchangeRateSource: rates.source,
    exchangeRateUpdatedAt: rates.updatedAt,
    shortfallUsd: Math.max(0, parseFloat((minUsd - bestUsd).toFixed(2))),
    shortfallInr: Math.max(0, parseFloat((minInr - bestInr).toFixed(2))),
  };
}

export async function assertTradingServiceDeposit(userId: number): Promise<TradingServiceDepositStatus> {
  const status = await getTradingServiceDepositStatus(userId);
  if (status.qualified) return status;

  throw new WalletError(
    `An initial deposit of at least ₹${status.minInr.toLocaleString("en-IN")} or $${status.minUsd} / ${status.minUsdt} USDT is required before using copy trading, algo trading, account handling, or MT4/MT5 services. ` +
    `Live rate: 1 USD = ₹${status.exchangeRateUsdInr.toFixed(2)}. ` +
    `Approved deposits: ~$${status.totalDepositedUsd.toFixed(2)} (₹${status.totalInrDeposits.toLocaleString("en-IN")} in INR). ` +
    `Wallet: $${status.walletUsd.toFixed(2)} (~₹${status.walletInr.toLocaleString("en-IN")}).`,
    "TRADING_DEPOSIT_REQUIRED",
  );
}
