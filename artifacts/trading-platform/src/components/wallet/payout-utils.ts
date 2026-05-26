import type { PaymentAccount } from "./PersonalPaymentAccounts";

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
