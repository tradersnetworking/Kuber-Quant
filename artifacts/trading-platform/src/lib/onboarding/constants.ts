export const INVESTOR_REQUIRED_STEP_COUNT = 3;
export const INVESTOR_OPTIONAL_STEP_START = 4;

export const INVESTOR_STEPS = [
  { num: 1, label: "Account", key: "account" },
  { num: 2, label: "Personal", key: "personal" },
  { num: 3, label: "KYC", key: "kyc" },
  { num: 4, label: "Banking", key: "banking" },
  { num: 5, label: "Crypto", key: "crypto" },
  { num: 6, label: "Investment", key: "investment" },
  { num: 7, label: "Services", key: "services" },
  { num: 8, label: "MT4/MT5", key: "mtAccount" },
  { num: 9, label: "Security", key: "security" },
  { num: 10, label: "Agreements", key: "agreements" },
] as const;

/** Services that require MT4/MT5 account credentials */
export const MT_LINKED_SERVICE_IDS = ["account_handling", "algo_trading", "copy_trading"] as const;

export function requiresMtAccountLink(tradingInterests: string[]): boolean {
  return tradingInterests.some(id => (MT_LINKED_SERVICE_IDS as readonly string[]).includes(id));
}

export const MANAGER_STEPS = [
  { num: 1, label: "Account", key: "account" },
  { num: 2, label: "Personal", key: "personal" },
  { num: 3, label: "Professional", key: "professional" },
  { num: 4, label: "Identity", key: "identity" },
  { num: 5, label: "Banking", key: "banking" },
  { num: 6, label: "Crypto", key: "crypto" },
  { num: 7, label: "Role", key: "role" },
  { num: 8, label: "Security", key: "security" },
  { num: 9, label: "Agreements", key: "agreements" },
] as const;

export { ALL_COUNTRY_DIAL_CODES as COUNTRY_CODES } from "@/lib/country-codes";

export const COUNTRIES = ["India", "United States", "United Kingdom", "UAE", "Singapore", "Canada", "Australia", "Germany", "France", "Japan", "Other"];

export const STATES_BY_COUNTRY: Record<string, string[]> = {
  India: ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Rajasthan", "West Bengal", "Uttar Pradesh", "Other"],
  "United States": ["California", "New York", "Texas", "Florida", "Illinois", "Other"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
};

export const GENDERS = ["Male", "Female", "Non-binary", "Prefer not to say"];
export const INCOME_RANGES = ["Under $10,000", "$10,000 – $50,000", "$50,000 – $100,000", "$100,000 – $500,000", "$500,000+"];
export const EXPERIENCE_LEVELS = ["Beginner (< 1 year)", "Novice (1–3 years)", "Intermediate (3–5 years)", "Experienced (5–10 years)", "Expert (10+ years)"];
export const RISK_LEVELS = ["Conservative", "Moderate", "Aggressive"];
export const FUND_SOURCES = ["Salary", "Business Income", "Savings", "Inheritance", "Investment Returns", "Other"];
export const INVESTMENT_TYPES = ["Fixed ROI Plans", "Equity", "Forex", "Crypto", "Mixed Portfolio"];

export const TRADING_SERVICES = [
  { id: "investment_plans", label: "Investment Plans" },
  { id: "algo_trading", label: "Algo Trading" },
  { id: "copy_trading", label: "Copy Trading" },
  { id: "account_handling", label: "Account Handling" },
  { id: "ea_marketplace", label: "EA Marketplace" },
  { id: "signal_services", label: "Signal Services" },
];

export const MANAGER_PERMISSIONS = [
  "KYC Verification",
  "Deposit Verification",
  "Withdrawal Verification",
  "Support Management",
  "Investor Management",
];

export const WALLET_FIELDS = [
  { key: "btc", label: "BTC Wallet", placeholder: "bc1..." },
  { key: "eth", label: "ETH Wallet", placeholder: "0x..." },
  { key: "usdtTrc20", label: "USDT TRC20", placeholder: "T..." },
  { key: "usdtErc20", label: "USDT ERC20", placeholder: "0x..." },
  { key: "usdtBep20", label: "USDT BEP20", placeholder: "0x..." },
  { key: "bnb", label: "BNB Wallet", placeholder: "0x..." },
  { key: "xrp", label: "XRP Wallet", placeholder: "r..." },
  { key: "tron", label: "Tron Wallet", placeholder: "T..." },
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
