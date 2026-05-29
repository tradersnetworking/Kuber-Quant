/** Shared deposit account types & helpers (mirrors WP Payment Forms Pro patterns) */

import { resolveMediaUrl } from "@/lib/media-url";

export type DepositAccount = {
  id: number;
  name: string;
  type: string;
  symbol?: string | null;
  network?: string | null;
  description?: string | null;
  walletAddress?: string | null;
  upiId?: string | null;
  digitalRupeeId?: string | null;
  qrCodeUrl?: string | null;
  minAmount: number;
  maxAmount?: number | null;
  isEnabled?: boolean;
  sortOrder?: number;
  extraConfig?: Record<string, string>;
  accountHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  accountType?: string | null;
  swiftCode?: string | null;
  micrCode?: string | null;
  badge?: string | null;
  note?: string | null;
  logoUrl?: string | null;
};

export type OnlineGatewayMeta = {
  type: string;
  label: string;
  description: string;
  envVars: string[];
};

/** Supported online payment gateways — managed in super admin */
export const ONLINE_GATEWAY_CATALOG: OnlineGatewayMeta[] = [
  { type: "razorpay", label: "Razorpay", description: "Cards, UPI, netbanking, wallets", envVars: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"] },
  { type: "phonepe", label: "PhonePe", description: "UPI & PhonePe wallet checkout", envVars: ["PHONEPE_MERCHANT_ID", "PHONEPE_SALT_KEY"] },
  { type: "paytm", label: "Paytm", description: "Paytm wallet & UPI", envVars: ["PAYTM_MERCHANT_ID", "PAYTM_MERCHANT_KEY"] },
  { type: "payu", label: "PayU", description: "Cards, UPI, netbanking", envVars: ["PAYU_MERCHANT_KEY", "PAYU_MERCHANT_SALT"] },
  { type: "cashfree", label: "Cashfree", description: "Cards, UPI, payouts", envVars: ["CASHFREE_APP_ID", "CASHFREE_SECRET_KEY"] },
  { type: "stripe", label: "Stripe", description: "International cards & wallets", envVars: ["STRIPE_PUBLISHABLE_KEY", "STRIPE_SECRET_KEY"] },
  { type: "instamojo", label: "Instamojo", description: "Payment links & UPI", envVars: ["INSTAMOJO_API_KEY", "INSTAMOJO_AUTH_TOKEN"] },
  { type: "pinelabs", label: "Pine Labs", description: "POS & online payments", envVars: ["PINELABS_MERCHANT_ID", "PINELABS_ACCESS_CODE"] },
  { type: "easebuzz", label: "Easebuzz", description: "UPI, cards, netbanking", envVars: ["EASEBUZZ_MERCHANT_KEY", "EASEBUZZ_SALT"] },
  { type: "paypal", label: "PayPal", description: "International PayPal checkout", envVars: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"] },
];

export const ONLINE_GATEWAY_TYPES = ONLINE_GATEWAY_CATALOG.map(g => g.type);

/** Gateways with live checkout flow implemented in the app. */
export const LIVE_CHECKOUT_GATEWAY_TYPES = new Set(["razorpay", "phonepe", "payu"]);

export function isLiveCheckoutGateway(type: string): boolean {
  return LIVE_CHECKOUT_GATEWAY_TYPES.has(type);
}

export function getOnlineGatewayMeta(type: string): OnlineGatewayMeta | undefined {
  return ONLINE_GATEWAY_CATALOG.find(g => g.type === type);
}

export function getOnlineGatewayLabel(type: string): string {
  return getOnlineGatewayMeta(type)?.label ?? type;
}

export function isOnlineGatewayType(type: string): boolean {
  return ONLINE_GATEWAY_TYPES.includes(type);
}

export function trimCredential(v?: string | null): string | null {
  if (!v?.trim()) return null;
  return v.trim();
}

export function enrichDepositAccount(g: DepositAccount): DepositAccount {
  const ec = g.extraConfig || {};
  const logoRaw = ec.logoUrl || g.logoUrl || null;
  return {
    ...g,
    name: trimCredential(g.name) || g.name,
    description: trimCredential(g.description),
    walletAddress: trimCredential(g.walletAddress),
    upiId: trimCredential(g.upiId)?.toLowerCase() || null,
    digitalRupeeId: trimCredential(g.digitalRupeeId) || null,
    qrCodeUrl: publicAssetUrl(g.qrCodeUrl) || null,
    accountHolderName: trimCredential(ec.accountHolderName || g.accountHolderName),
    bankName: trimCredential(ec.bankName || g.bankName || g.name),
    accountNumber: trimCredential(ec.accountNumber || g.accountNumber),
    ifscCode: trimCredential(ec.ifscCode || g.ifscCode)?.toUpperCase() || null,
    branchName: trimCredential(ec.branchName || g.branchName),
    accountType: trimCredential(ec.accountType || g.accountType),
    swiftCode: trimCredential(ec.swiftCode || g.swiftCode),
    micrCode: trimCredential(ec.micrCode || ec.micr || g.micrCode),
    badge: trimCredential(ec.badge || g.badge),
    note: trimCredential(ec.note || g.note),
    logoUrl: publicAssetUrl(logoRaw) || null,
    symbol: trimCredential(g.symbol)?.toUpperCase() || g.symbol || null,
    network: trimCredential(g.network),
  };
}

export function buildUpiPayUri(upiId: string, payeeName: string, amount?: number, currency = "INR") {
  const pa = upiId.trim().toLowerCase();
  if (!pa) return "";
  const params = new URLSearchParams({
    pa,
    pn: (payeeName || "UPI").trim().slice(0, 50),
    cu: currency,
    tn: "Kuber Quant Deposit",
  });
  if (amount && amount > 0) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}

export function upiQrImageUrl(upiId: string, payeeName: string, amount?: number) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const params = new URLSearchParams({ upiId, name: payeeName });
  if (amount && amount > 0) params.set("amount", String(amount));
  const path = `${base}/api/payments/qr/upi?${params.toString()}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

export function buildDigitalRupeePayUri(digitalRupeeId: string, payeeName: string, amount?: number, currency = "INR") {
  const pa = digitalRupeeId.trim();
  if (!pa) return "";
  const params = new URLSearchParams({
    pa,
    pn: (payeeName || "Digital Rupee").trim().slice(0, 50),
    cu: currency,
    tn: "Kuber Quant Deposit",
    mode: "CBDC",
  });
  if (amount && amount > 0) params.set("am", String(amount));
  return `cbdc://pay?${params.toString()}`;
}

export function digitalRupeeQrImageUrl(walletId: string, payeeName: string, amount?: number) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const params = new URLSearchParams({ walletId, name: payeeName });
  if (amount && amount > 0) params.set("amount", String(amount));
  const path = `${base}/api/payments/qr/digital-rupee?${params.toString()}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

export function cryptoQrImageUrl(address: string) {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const path = `${base}/api/payments/qr/wallet?${new URLSearchParams({ address }).toString()}`;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path;
}

export function isManualDepositType(type: string) {
  return ["upi", "digital_rupee", "bank", "fiat", "crypto"].includes(type);
}

export type DepositAccountsResponse = {
  upi: DepositAccount[];
  digitalRupee: DepositAccount[];
  bank: DepositAccount[];
  crypto: DepositAccount[];
  online: DepositAccount[];
};

/** Fiat deposit gateways (UPI, bank, online) use INR; crypto uses USD minimums. */
export function minAmountLabelForGatewayType(type: string): string {
  return type === "crypto" ? "Min Amount ($)" : "Min Amount (₹)";
}

export function formatGatewayMinAmount(type: string, amount: number): string {
  return type === "crypto" ? `Min $${amount}` : `Min ₹${amount}`;
}

/** Resolve QR image src: stored upload, or live-generated from platform API. */
export function resolveDepositQrSrc(opts: {
  qrCodeUrl?: string | null;
  upiId?: string | null;
  digitalRupeeId?: string | null;
  walletAddress?: string | null;
  payeeName?: string;
  amount?: number;
}): string | undefined {
  // Dynamic amount UPI QR must be generated on the fly.
  if (opts.upiId?.trim() && opts.amount && opts.amount > 0) {
    return upiQrImageUrl(opts.upiId.trim(), opts.payeeName || "UPI", opts.amount);
  }
  if (opts.digitalRupeeId?.trim() && opts.amount && opts.amount > 0) {
    return digitalRupeeQrImageUrl(opts.digitalRupeeId.trim(), opts.payeeName || "Digital Rupee", opts.amount);
  }

  const stored = publicAssetUrl(opts.qrCodeUrl);
  if (stored) return stored;

  if (opts.upiId?.trim()) {
    return upiQrImageUrl(opts.upiId.trim(), opts.payeeName || "UPI", opts.amount);
  }
  if (opts.digitalRupeeId?.trim()) {
    return digitalRupeeQrImageUrl(opts.digitalRupeeId.trim(), opts.payeeName || "Digital Rupee", opts.amount);
  }
  if (opts.walletAddress?.trim()) {
    return cryptoQrImageUrl(opts.walletAddress.trim());
  }
  return undefined;
}

/** Resolve payout / withdrawal account QR (UPI or crypto wallet). */
export function resolvePayoutQrSrc(opts: {
  accountType?: string;
  label?: string;
  upiId?: string | null;
  digitalRupeeId?: string | null;
  upiQrUrl?: string | null;
  walletAddress?: string | null;
  walletQrUrl?: string | null;
}): string | undefined {
  if (opts.accountType === "upi") {
    const stored = publicAssetUrl(opts.upiQrUrl);
    if (stored) return stored;
    if (opts.upiId?.trim()) return upiQrImageUrl(opts.upiId.trim(), opts.label || "UPI");
    return undefined;
  }
  if (opts.accountType === "digital_rupee") {
    const stored = publicAssetUrl(opts.upiQrUrl);
    if (stored) return stored;
    if (opts.digitalRupeeId?.trim()) {
      return digitalRupeeQrImageUrl(opts.digitalRupeeId.trim(), opts.label || "Digital Rupee");
    }
    return undefined;
  }
  if (opts.accountType === "crypto") {
    const stored = publicAssetUrl(opts.walletQrUrl);
    if (stored) return stored;
    if (opts.walletAddress?.trim()) return cryptoQrImageUrl(opts.walletAddress.trim());
    return undefined;
  }
  return publicAssetUrl(opts.upiQrUrl || opts.walletQrUrl);
}

/** Resolve stored upload paths (/uploads/...) for img src. */
export function publicAssetUrl(path?: string | null): string | undefined {
  return resolveMediaUrl(path);
}
