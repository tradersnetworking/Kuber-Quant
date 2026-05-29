/** Safely format a wallet/API balance for display (handles strings and null). */
export function formatFiatBalance(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export function formatPlatformAmount(value: unknown): string {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatInrAmount(value: unknown): string {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Primary USD + secondary INR line for dashboard cards. */
export function formatUsdWithInr(usd: unknown, inr?: unknown): { primary: string; secondary: string | null } {
  const usdNum = Number(usd ?? 0);
  const primary = `$${formatPlatformAmount(usdNum)}`;
  if (inr !== undefined && inr !== null && Number.isFinite(Number(inr))) {
    return { primary, secondary: `₹${formatInrAmount(inr)}` };
  }
  return { primary, secondary: null };
}

export type WalletFiatFields = {
  fiatBalance?: number | null;
  fiatBalanceInr?: number | null;
  inrBalance?: number | null;
  exchangeRates?: { USD_INR?: number } | null;
};

/** Resolve INR equivalent from wallet API fields or live USD/INR rate. */
export function resolveWalletFiatInr(wallet?: WalletFiatFields | null): number | undefined {
  const direct = wallet?.fiatBalanceInr ?? wallet?.inrBalance;
  if (direct !== undefined && direct !== null && Number.isFinite(Number(direct))) {
    return Number(direct);
  }
  const usd = Number(wallet?.fiatBalance ?? 0);
  const rate = Number(wallet?.exchangeRates?.USD_INR);
  if (Number.isFinite(usd) && Number.isFinite(rate) && rate > 0) {
    return usd * rate;
  }
  return undefined;
}

export function formatWalletFiatDisplay(wallet?: WalletFiatFields | null) {
  return formatUsdWithInr(wallet?.fiatBalance, resolveWalletFiatInr(wallet));
}

export function formatCurrencyAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "INR") return `₹${formatInrAmount(amount)}`;
  if (cur === "EUR") return `€${formatPlatformAmount(amount)}`;
  if (["BTC", "ETH", "USDT"].includes(cur)) {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${cur}`;
  }
  return `$${formatPlatformAmount(amount)}`;
}
