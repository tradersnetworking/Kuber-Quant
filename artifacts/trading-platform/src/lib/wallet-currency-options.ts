export const FIAT_CURRENCY_OPTIONS = [
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
] as const;

export const CRYPTO_CURRENCY_OPTIONS = [
  { value: "USDT", label: "USDT — Tether" },
  { value: "BTC", label: "BTC — Bitcoin" },
  { value: "ETH", label: "ETH — Ethereum" },
] as const;

export const DEPOSIT_FIAT_CURRENCIES = ["INR", "USD", "EUR"] as const;
export const WITHDRAW_FIAT_CURRENCIES = ["INR", "USD", "EUR"] as const;

export type FiatCurrency = (typeof DEPOSIT_FIAT_CURRENCIES)[number];
export type WalletCurrency = FiatCurrency | "USDT" | "BTC" | "ETH";
