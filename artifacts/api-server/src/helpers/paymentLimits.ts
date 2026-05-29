import { WalletError } from "./walletService";
import { getExchangeRates, usdToInr } from "./exchangeRateService";

/** Max INR per single UPI deposit / buy order. */
export const UPI_MAX_INR_PER_TRANSACTION = 100_000;

export function formatUpiLimitInr(): string {
  return UPI_MAX_INR_PER_TRANSACTION.toLocaleString("en-IN");
}

/** Convert deposit amount to INR for limit checks. */
export async function depositAmountInInr(amount: number, currency?: string): Promise<number> {
  const cur = (currency || "INR").toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cur === "INR") return amount;
  const fx = await getExchangeRates();
  if (cur === "USD") return usdToInr(amount, fx);
  if (cur === "EUR" && fx.USD_EUR) {
    const usd = amount / fx.USD_EUR;
    return usdToInr(usd, fx);
  }
  return amount;
}

export async function assertUpiDepositWithinLimit(
  amount: number,
  currency?: string,
): Promise<void> {
  const inr = await depositAmountInInr(amount, currency);
  if (inr > UPI_MAX_INR_PER_TRANSACTION) {
    throw new WalletError(
      `UPI payments are limited to ₹${formatUpiLimitInr()} per transaction. Use bank transfer or payment gateway for larger amounts.`,
      "UPI_LIMIT_EXCEEDED",
    );
  }
}
