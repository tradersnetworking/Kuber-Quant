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
  wallet?: { fiatBalance?: number; cryptoBalance?: number },
): number {
  if (["BTC", "ETH", "USDT"].includes(currency)) return wallet?.cryptoBalance || 0;
  return wallet?.fiatBalance || 0;
}
