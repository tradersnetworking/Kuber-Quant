/** Max INR per single UPI deposit / buy order — must match API. */
export const UPI_MAX_INR_PER_TRANSACTION = 100_000;

export function formatUpiLimitInr(): string {
  return UPI_MAX_INR_PER_TRANSACTION.toLocaleString("en-IN");
}

export function upiLimitErrorMessage(): string {
  return `UPI limit is ₹${formatUpiLimitInr()} per transaction. Use bank transfer or payment gateway for larger amounts.`;
}

/** Check INR amount (buy flow / INR wallet deposits). */
export function upiInrAmountExceedsLimit(amountInr: number): boolean {
  return Number.isFinite(amountInr) && amountInr > UPI_MAX_INR_PER_TRANSACTION;
}

/** Convert amount to INR using optional USD/INR rate for non-INR currency fields. */
export function depositAmountInInr(
  amount: number,
  currency = "INR",
  usdInrRate?: number,
): number {
  const cur = currency.toUpperCase();
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (cur === "INR") return amount;
  if (cur === "USD" && usdInrRate && usdInrRate > 0) return amount * usdInrRate;
  return amount;
}

export function upiDepositExceedsLimit(
  amount: number,
  currency = "INR",
  usdInrRate?: number,
): boolean {
  return depositAmountInInr(amount, currency, usdInrRate) > UPI_MAX_INR_PER_TRANSACTION;
}

/** Max INR per single Digital Rupee (e-Rupee/CBDC) deposit / buy order — must match API. */
export const DIGITAL_RUPEE_MAX_INR_PER_TRANSACTION = 100_000;

export function formatDigitalRupeeLimitInr(): string {
  return DIGITAL_RUPEE_MAX_INR_PER_TRANSACTION.toLocaleString("en-IN");
}

export function digitalRupeeLimitErrorMessage(): string {
  return `Digital Rupee limit is ₹${formatDigitalRupeeLimitInr()} per transaction. Use bank transfer or payment gateway for larger amounts.`;
}

export function digitalRupeeInrAmountExceedsLimit(amountInr: number): boolean {
  return Number.isFinite(amountInr) && amountInr > DIGITAL_RUPEE_MAX_INR_PER_TRANSACTION;
}

export function digitalRupeeDepositExceedsLimit(
  amount: number,
  currency = "INR",
  usdInrRate?: number,
): boolean {
  return depositAmountInInr(amount, currency, usdInrRate) > DIGITAL_RUPEE_MAX_INR_PER_TRANSACTION;
}
