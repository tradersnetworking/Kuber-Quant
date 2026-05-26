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

export function formatCurrencyAmount(amount: number, currency: string): string {
  const cur = currency.toUpperCase();
  if (cur === "INR") return `₹${formatInrAmount(amount)}`;
  if (cur === "EUR") return `€${formatPlatformAmount(amount)}`;
  if (["BTC", "ETH", "USDT"].includes(cur)) {
    return `${amount.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${cur}`;
  }
  return `$${formatPlatformAmount(amount)}`;
}
