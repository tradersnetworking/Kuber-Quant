/** Visual catalog for deposit & withdrawal method grids (UPI, bank rails, gateways, crypto). */

export type PaymentBrandCategory = "upi" | "digital_rupee" | "bank" | "gateway" | "card" | "crypto";

export type PaymentBrandItem = {
  id: string;
  label: string;
  shortLabel?: string;
  subtitle?: string;
  category: PaymentBrandCategory;
  /** Tailwind classes for icon tile background / text */
  tileClass: string;
  /** Optional accent for icon inner */
  accentClass?: string;
  /** Show small UPI badge under logo */
  upiBadge?: boolean;
  /** Crypto network label (TRC20, BEP20, etc.) */
  network?: string;
};

const WHITE_TILE = "bg-white border-slate-200/90 text-slate-900 shadow-sm dark:bg-white dark:border-slate-200/80 dark:text-slate-900";

export const CARD_BRANDS: PaymentBrandItem[] = [
  { id: "visa", label: "Visa", category: "card", tileClass: WHITE_TILE },
  { id: "mastercard", label: "Mastercard", shortLabel: "Master", category: "card", tileClass: WHITE_TILE },
  { id: "paypal", label: "PayPal", category: "card", tileClass: WHITE_TILE },
  { id: "rupay", label: "RuPay", category: "card", tileClass: WHITE_TILE },
];

export const UPI_APP_BRANDS: PaymentBrandItem[] = [
  { id: "gpay", label: "Google Pay", shortLabel: "G Pay", category: "upi", tileClass: WHITE_TILE },
  { id: "paytm", label: "Paytm", shortLabel: "Paytm", category: "upi", tileClass: WHITE_TILE },
  { id: "phonepe", label: "PhonePe", shortLabel: "PhonePe", category: "upi", tileClass: WHITE_TILE },
  { id: "bhim", label: "BHIM UPI", shortLabel: "BHIM", subtitle: "Bharat Interface", category: "upi", tileClass: WHITE_TILE },
  { id: "amazonpay", label: "Amazon Pay", shortLabel: "Amazon Pay", category: "upi", tileClass: WHITE_TILE },
  { id: "mobikwik", label: "MobiKwik", shortLabel: "MobiKwik", category: "upi", tileClass: WHITE_TILE },
];

/** UPI app logos with UPI badge — matches banner row 2 */
export const UPI_BADGE_BRANDS: PaymentBrandItem[] = [
  { id: "paytm", label: "Paytm UPI", shortLabel: "Paytm UPI", category: "upi", tileClass: WHITE_TILE, upiBadge: true },
  { id: "phonepe", label: "PhonePe UPI", shortLabel: "PhonePe UPI", category: "upi", tileClass: WHITE_TILE, upiBadge: true },
  { id: "gpay", label: "G Pay UPI", shortLabel: "G Pay UPI", category: "upi", tileClass: WHITE_TILE, upiBadge: true },
];

/** RBI Digital Rupee (e₹ / CBDC) rails — mirrors the UPI grid with a teal identity. */
export const DIGITAL_RUPEE_BRANDS: PaymentBrandItem[] = [
  { id: "erupee", label: "Digital Rupee", shortLabel: "e₹", subtitle: "RBI CBDC", category: "digital_rupee", tileClass: "bg-teal-500/15 border-teal-500/30 text-teal-700 dark:text-teal-300" },
  { id: "erupee-upi", label: "e₹ via UPI", shortLabel: "e₹ UPI", subtitle: "Interoperable", category: "digital_rupee", tileClass: "bg-teal-500/10 border-teal-500/25 text-teal-700 dark:text-teal-300" },
  { id: "erupee-wallet", label: "CBDC Wallet", shortLabel: "CBDC", subtitle: "e-Rupee app", category: "digital_rupee", tileClass: "bg-teal-500/10 border-teal-500/25 text-teal-700 dark:text-teal-300" },
];

export const BANK_RAIL_BRANDS: PaymentBrandItem[] = [
  { id: "netbanking", label: "Net Banking", shortLabel: "Net Banking", category: "bank", tileClass: WHITE_TILE },
  { id: "imps", label: "IMPS", subtitle: "Immediate", category: "bank", tileClass: WHITE_TILE },
  { id: "neft", label: "NEFT", subtitle: "National EFT", category: "bank", tileClass: WHITE_TILE },
  { id: "rtgs", label: "RTGS", subtitle: "Real Time Gross", category: "bank", tileClass: WHITE_TILE },
];

export const GATEWAY_BRANDS: PaymentBrandItem[] = [
  { id: "razorpay", label: "Razorpay", category: "gateway", tileClass: WHITE_TILE },
  { id: "phonepe", label: "PhonePe", category: "gateway", tileClass: WHITE_TILE },
  { id: "paytm", label: "Paytm", category: "gateway", tileClass: WHITE_TILE },
  { id: "payu", label: "PayU", category: "gateway", tileClass: WHITE_TILE },
  { id: "cashfree", label: "Cashfree", category: "gateway", tileClass: WHITE_TILE },
  { id: "stripe", label: "Stripe", category: "gateway", tileClass: WHITE_TILE },
  { id: "easebuzz", label: "Easebuzz", category: "gateway", tileClass: WHITE_TILE },
  { id: "instamojo", label: "Instamojo", category: "gateway", tileClass: WHITE_TILE },
  { id: "pinelabs", label: "Pine Labs", shortLabel: "Pine Labs", category: "gateway", tileClass: WHITE_TILE },
];

export const CRYPTO_BRANDS: PaymentBrandItem[] = [
  { id: "btc", label: "Bitcoin", shortLabel: "BTC", category: "crypto", tileClass: "bg-orange-500/15 border-orange-500/30 text-orange-600 dark:text-orange-400" },
  { id: "eth", label: "Ethereum", shortLabel: "ETH", category: "crypto", tileClass: "bg-slate-500/15 border-slate-500/30 text-slate-700 dark:text-slate-200" },
  { id: "usdt-trc20", label: "Tether USDT", shortLabel: "USDT", subtitle: "TRC20", network: "TRC20", category: "crypto", tileClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
  { id: "usdt-bep20", label: "Tether USDT", shortLabel: "USDT", subtitle: "BEP20", network: "BEP20", category: "crypto", tileClass: "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" },
  { id: "bnb", label: "BNB", category: "crypto", tileClass: "bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-400" },
];

/** Banner-style row 1: cards + UPI apps (matches reference image) */
export const DEPOSIT_METHOD_BANNER_ROW_1: PaymentBrandItem[] = [
  ...CARD_BRANDS,
  ...UPI_APP_BRANDS.slice(0, 4),
];

/** Banner-style row 2: bank rails + UPI badge apps + wallets */
export const DEPOSIT_METHOD_BANNER_ROW_2: PaymentBrandItem[] = [
  ...BANK_RAIL_BRANDS,
  ...UPI_BADGE_BRANDS,
  UPI_APP_BRANDS[4], // Amazon Pay
  UPI_APP_BRANDS[5], // MobiKwik
];

export const DEPOSIT_WITHDRAW_FEATURE_CHIPS = [
  "Safe investment",
  "High returns",
  "Trust & transparency",
  "Grow with us",
] as const;
