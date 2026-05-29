import type { PaymentAccount } from "./payout-account-types";

export function formatPayoutAccount(acc: PaymentAccount): string {
  if (acc.accountType === "bank") {
    return `Bank: ${acc.bankName} | ${acc.accountHolderName} | A/C ${acc.accountNumber} | IFSC ${acc.ifscCode || "—"}`;
  }
  if (acc.accountType === "upi") return `UPI: ${acc.upiId}`;
  return `Crypto ${acc.cryptoSymbol} (${acc.cryptoNetwork || "—"}): ${acc.walletAddress}`;
}

export function currencyForAccount(acc: PaymentAccount): "USD" | "EUR" | "BTC" | "ETH" | "USDT" {
  if (acc.accountType === "crypto") {
    const sym = (acc.cryptoSymbol || "USDT").toUpperCase();
    if (sym === "BTC" || sym === "ETH" || sym === "USDT") return sym;
    return "USDT";
  }
  return "USD";
}

export function methodLabelForAccount(acc: PaymentAccount): string {
  if (acc.accountType === "bank") return "Bank Transfer";
  if (acc.accountType === "upi") return "UPI";
  return "Crypto Wallet";
}

export function walletBalanceForCurrency(
  currency: string,
  wallet?: {
    fiatBalance?: number;
    cryptoBalance?: number;
    exchangeRates?: { USD_INR?: number; USD_EUR?: number };
  },
): number {
  const cur = currency.toUpperCase();
  if (["BTC", "ETH", "USDT"].includes(cur)) return wallet?.cryptoBalance || 0;
  const fiatUsd = wallet?.fiatBalance || 0;
  const rates = wallet?.exchangeRates;
  if (cur === "INR") return fiatUsd * (rates?.USD_INR ?? 83.5);
  if (cur === "EUR") return fiatUsd * (rates?.USD_EUR ?? 0.92);
  return fiatUsd;
}

/** Default matches site setting `withdrawal_fee_percent`. */
export const DEFAULT_WITHDRAWAL_FEE_PERCENT = 2;

export function withdrawTotalWithFee(amount: number, feePercent = DEFAULT_WITHDRAWAL_FEE_PERCENT): number {
  return amount * (1 + feePercent / 100);
}

export function maxWithdrawAmountBeforeFee(available: number, feePercent = DEFAULT_WITHDRAWAL_FEE_PERCENT): number {
  if (available <= 0) return 0;
  return available / (1 + feePercent / 100);
}

/** User-facing message when withdrawal amount exceeds wallet balance. */
export function withdrawAmountExceedsAvailable(
  amount: number,
  available: number,
  feePercent = DEFAULT_WITHDRAWAL_FEE_PERCENT,
): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  return withdrawTotalWithFee(amount, feePercent) > available + 1e-9;
}

export function withdrawAmountErrorMessage(
  amount: number,
  available: number,
  currency: string,
  feePercent = DEFAULT_WITHDRAWAL_FEE_PERCENT,
): string | null {
  if (!withdrawAmountExceedsAvailable(amount, available, feePercent)) return null;
  const maxAllowed = maxWithdrawAmountBeforeFee(available, feePercent);
  return `Amount exceeds available balance. Enter an amount less than or equal to ${formatWithdrawLimit(maxAllowed, currency)}.`;
}

export function formatWithdrawLimit(available: number, currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "INR") return `₹${available.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (cur === "EUR") return `€${available.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (cur === "USD") return `$${available.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `${available.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${cur}`;
}
