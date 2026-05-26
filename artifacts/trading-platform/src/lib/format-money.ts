/** Safely format a wallet/API balance for display (handles strings and null). */
export function formatFiatBalance(value: unknown): string {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export function formatPlatformAmount(value: unknown): string {
  const n = Number(value ?? 0);
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
