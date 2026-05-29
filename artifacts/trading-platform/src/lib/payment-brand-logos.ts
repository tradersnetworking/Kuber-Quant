/**
 * Payment, banking & crypto brand logos — CDN SVGs (Simple Icons via jsDelivr, Wikimedia, official sites).
 * Local `/public/payment-brands/*` copies are used only when a CDN entry is missing.
 */

const SI = (slug: string) =>
  `https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/${slug}.svg`;

/** Primary CDN SVG URLs (transparent, no download required). */
export const PAYMENT_BRAND_CDN: Record<string, string> = {
  // Cards & wallets
  visa: SI("visa"),
  mastercard: SI("mastercard"),
  rupay: "https://upload.wikimedia.org/wikipedia/commons/8/89/RuPay.svg",
  paypal: SI("paypal"),

  // UPI apps
  gpay: SI("googlepay"),
  paytm: SI("paytm"),
  phonepe: SI("phonepe"),
  bhim: "https://upload.wikimedia.org/wikipedia/commons/5/55/BHIM.svg",
  amazonpay: SI("amazonpay"),
  mobikwik: "https://upload.wikimedia.org/wikipedia/commons/6/6b/MobiKwik_Logo.svg",
  upi: "/payment-brands/upi.svg",

  // Payment gateways
  razorpay: SI("razorpay"),
  stripe: SI("stripe"),
  instamojo: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Instamojo_logo.svg",
  cashfree: "https://cashfree.com/assets/images/logo.svg",
  easebuzz: "https://easebuzz.in/assets/images/logo.svg",
  pinelabs: "https://upload.wikimedia.org/wikipedia/commons/4/4f/Pine_Labs_logo.svg",
  npci: "https://upload.wikimedia.org/wikipedia/commons/4/4b/NPCI_logo.svg",

  // Banking rails (generic bank icon per spec; local SVGs differ by rail when CDN fails)
  imps: SI("bank"),
  neft: SI("bank"),
  rtgs: SI("bank"),
  netbanking: SI("internetexplorer"),

  // Crypto (Simple Icons — used in payment method showcase tiles)
  btc: SI("bitcoin"),
  eth: SI("ethereum"),
  usdt: SI("tether"),
  "usdt-trc20": SI("tether"),
  "usdt-bep20": SI("tether"),
  bnb: SI("binance"),
};

/** Bundled fallbacks under `public/payment-brands/`. */
export const PAYMENT_BRAND_LOCAL: Record<string, string> = {
  visa: "/payment-brands/visa.png",
  mastercard: "/payment-brands/mastercard.png",
  paypal: "/payment-brands/paypal.png",
  rupay: "/payment-brands/rupay.png",
  gpay: "/payment-brands/gpay.png",
  phonepe: "/payment-brands/phonepe.png",
  paytm: "/payment-brands/paytm.png",
  bhim: "/payment-brands/bhim.png",
  amazonpay: "/payment-brands/amazonpay.png",
  mobikwik: "/payment-brands/mobikwik.png",
  razorpay: "/payment-brands/razorpay.png",
  payu: "/payment-brands/payu.png",
  cashfree: "/payment-brands/cashfree.png",
  stripe: "/payment-brands/stripe.png",
  easebuzz: "/payment-brands/easebuzz.png",
  netbanking: "/payment-brands/netbanking.png",
  upi: "/payment-brands/upi.svg",
  imps: "/payment-brands/imps.svg",
  neft: "/payment-brands/neft.svg",
  rtgs: "/payment-brands/rtgs.svg",
  instamojo: "/payment-brands/instamojo.png",
};

/** Resolve logo URL: CDN SVG first, then local asset. */
export function resolvePaymentBrandLogoUrl(brandId: string): string {
  return PAYMENT_BRAND_CDN[brandId] ?? PAYMENT_BRAND_LOCAL[brandId] ?? PAYMENT_BRAND_CDN.npci ?? PAYMENT_BRAND_LOCAL.upi;
}

export function resolvePaymentBrandLogoFallback(brandId: string, currentUrl: string): string | undefined {
  const local = PAYMENT_BRAND_LOCAL[brandId];
  if (local && local !== currentUrl) return local;
  const cdn = PAYMENT_BRAND_CDN[brandId];
  if (cdn && cdn !== currentUrl) return cdn;
  return undefined;
}

/** True when the resolved URL is an SVG (Simple Icons / Wikimedia). */
export function isPaymentBrandSvgUrl(url: string): boolean {
  return url.endsWith(".svg") || url.includes(".svg?");
}

/** All registered brand IDs with CDN SVG entries. */
export const PAYMENT_BRAND_CDN_IDS = Object.keys(PAYMENT_BRAND_CDN);
