/** Shared deposit account types & helpers (mirrors WP Payment Forms Pro patterns) */

export type DepositAccount = {
  id: number;
  name: string;
  type: string;
  symbol?: string | null;
  network?: string | null;
  description?: string | null;
  walletAddress?: string | null;
  upiId?: string | null;
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

export function getOnlineGatewayMeta(type: string): OnlineGatewayMeta | undefined {
  return ONLINE_GATEWAY_CATALOG.find(g => g.type === type);
}

export function getOnlineGatewayLabel(type: string): string {
  return getOnlineGatewayMeta(type)?.label ?? type;
}

export function isOnlineGatewayType(type: string): boolean {
  return ONLINE_GATEWAY_TYPES.includes(type);
}

export function enrichDepositAccount(g: DepositAccount): DepositAccount {
  const ec = g.extraConfig || {};
  return {
    ...g,
    accountHolderName: ec.accountHolderName || g.accountHolderName || null,
    bankName: ec.bankName || g.bankName || g.name,
    accountNumber: ec.accountNumber || g.accountNumber || null,
    ifscCode: ec.ifscCode || g.ifscCode || null,
    branchName: ec.branchName || g.branchName || null,
    accountType: ec.accountType || g.accountType || null,
    swiftCode: ec.swiftCode || g.swiftCode || null,
    micrCode: ec.micrCode || ec.micr || null,
    badge: ec.badge || g.badge || null,
    note: ec.note || g.note || null,
    logoUrl: ec.logoUrl || g.logoUrl || null,
  };
}

export function buildUpiPayUri(upiId: string, payeeName: string, amount?: number, currency = "INR") {
  const params = new URLSearchParams({
    pa: upiId,
    pn: payeeName.slice(0, 50),
    cu: currency,
    tn: "Kuber Quant Deposit",
  });
  if (amount && amount > 0) params.set("am", String(amount));
  return `upi://pay?${params.toString()}`;
}

export function upiQrImageUrl(upiId: string, payeeName: string, amount?: number) {
  const uri = buildUpiPayUri(upiId, payeeName, amount);
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(uri)}`;
}

export function cryptoQrImageUrl(address: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
}

export function isManualDepositType(type: string) {
  return ["upi", "bank", "fiat", "crypto"].includes(type);
}

export type DepositAccountsResponse = {
  upi: DepositAccount[];
  bank: DepositAccount[];
  crypto: DepositAccount[];
  online: DepositAccount[];
};
