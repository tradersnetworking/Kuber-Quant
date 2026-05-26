import type { usersTable, userProfilesTable, kycRecordsTable, userPaymentAccountsTable, mt5AccountsTable } from "@workspace/db";
import { maskAccountNumber } from "./paymentAccountSync";

export type PlaceholderMeta = { key: string; label: string; group: string };

const CRYPTO_WALLET_KEYS = [
  { key: "BTC_WALLET", profileKey: "btc", label: "BTC Wallet" },
  { key: "ETH_WALLET", profileKey: "eth", label: "ETH Wallet" },
  { key: "USDT_TRC20_WALLET", profileKey: "usdtTrc20", label: "USDT TRC20" },
  { key: "USDT_ERC20_WALLET", profileKey: "usdtErc20", label: "USDT ERC20" },
  { key: "USDT_BEP20_WALLET", profileKey: "usdtBep20", label: "USDT BEP20" },
  { key: "BNB_WALLET", profileKey: "bnb", label: "BNB Wallet" },
  { key: "XRP_WALLET", profileKey: "xrp", label: "XRP Wallet" },
  { key: "TRON_WALLET", profileKey: "tron", label: "Tron Wallet" },
] as const;

function dash(v: string | null | undefined): string {
  return v?.trim() ? v.trim() : "—";
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

function fmtMoney(amount: unknown, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${currency === "USD" ? "$" : ""}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${currency !== "USD" ? ` ${currency}` : ""}`;
}

export function maskAadhaar(num: string | null | undefined): string {
  if (!num?.trim()) return "—";
  const digits = num.replace(/\D/g, "");
  if (digits.length < 4) return "XXXX-XXXX-XXXX";
  return `XXXX-XXXX-${digits.slice(-4)}`;
}

export function maskGenericId(num: string | null | undefined): string {
  if (!num?.trim()) return "—";
  const s = num.trim();
  if (s.length <= 4) return s;
  return `${"*".repeat(Math.min(6, s.length - 4))}${s.slice(-4)}`;
}

export function composeFullAddress(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
}): string {
  const line = [parts.address, parts.city, parts.state, parts.postalCode, parts.country]
    .map(p => p?.trim())
    .filter(Boolean);
  return line.length ? line.join(", ") : "—";
}

export function buildUserCollectedPlaceholders(input: {
  user: typeof usersTable.$inferSelect;
  profile?: typeof userProfilesTable.$inferSelect | null;
  kyc?: typeof kycRecordsTable.$inferSelect | null;
  paymentAccounts?: typeof userPaymentAccountsTable.$inferSelect[];
  mt5Account?: typeof mt5AccountsTable.$inferSelect | null;
  bankingFromEnc?: {
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    upiId?: string;
  };
}): Record<string, string> {
  const { user, profile, kyc, paymentAccounts = [], mt5Account, bankingFromEnc = {} } = input;

  const bankAccount = paymentAccounts.find(a => a.accountType === "bank" && a.isActive);
  const upiAccount = paymentAccounts.find(a => a.accountType === "upi" && a.isActive);
  const cryptoAccounts = paymentAccounts.filter(a => a.accountType === "crypto" && a.isActive);

  const profileWallets = (profile?.cryptoWallets || {}) as Record<string, string>;
  const paymentCryptoMeta: Record<string, { symbol: string; network?: string }> = {
    btc: { symbol: "BTC" },
    eth: { symbol: "ETH", network: "ERC20" },
    usdtTrc20: { symbol: "USDT", network: "TRC20" },
    usdtErc20: { symbol: "USDT", network: "ERC20" },
    usdtBep20: { symbol: "USDT", network: "BEP20" },
    bnb: { symbol: "BNB", network: "BEP20" },
    xrp: { symbol: "XRP", network: "XRP" },
    tron: { symbol: "TRX", network: "TRC20" },
  };
  const cryptoWalletValues: Record<string, string> = {};
  for (const { key, profileKey } of CRYPTO_WALLET_KEYS) {
    const fromProfile = profileWallets[profileKey]?.trim();
    if (fromProfile) {
      cryptoWalletValues[key] = fromProfile;
      continue;
    }
    const meta = paymentCryptoMeta[profileKey];
    const fromPayment = meta
      ? cryptoAccounts.find(a =>
        a.walletAddress
        && a.cryptoSymbol === meta.symbol
        && (!meta.network || a.cryptoNetwork === meta.network),
      )?.walletAddress
      : undefined;
    cryptoWalletValues[key] = fromPayment || "—";
  }

  const cryptoSummary = [
    ...Object.entries(profileWallets).filter(([, v]) => v?.trim()).map(([k, v]) => `${k.toUpperCase()}: ${v}`),
    ...cryptoAccounts
      .filter(a => a.walletAddress)
      .map(a => `${a.cryptoSymbol || "Crypto"}${a.cryptoNetwork ? ` (${a.cryptoNetwork})` : ""}: ${a.walletAddress}`),
  ];
  const uniqueCrypto = [...new Set(cryptoSummary)];

  const accountHolder =
    bankAccount?.accountHolderName
    || bankingFromEnc.accountHolderName
    || kyc?.fullName
    || user.fullName
    || "—";
  const bankName = bankAccount?.bankName || kyc?.bankName || bankingFromEnc.bankName || "—";
  const rawAccount =
    bankAccount?.accountNumber
    || bankingFromEnc.accountNumber
    || kyc?.bankAccountNumber
    || "";
  const bankAccountMasked = rawAccount
    ? maskAccountNumber(String(rawAccount).replace(/^\*+/, ""))
    : "—";
  const ifsc = bankAccount?.ifscCode || kyc?.ifscCode || bankingFromEnc.ifscCode || "—";
  const branch = bankAccount?.branchName || kyc?.branchName || bankingFromEnc.branchName || "—";
  const upi = upiAccount?.upiId || kyc?.upiId || bankingFromEnc.upiId || "—";

  const address = kyc?.address || profile?.address || "—";
  const country = kyc?.country || profile?.country || "—";
  const tradingInterests = Array.isArray(profile?.tradingInterests)
    ? profile!.tradingInterests.join(", ")
    : "—";

  const idType = kyc?.idType?.replace(/_/g, " ").toUpperCase() || "—";
  const passportNumber = kyc?.idType === "passport"
    ? dash(kyc.idNumber)
    : kyc?.passportDocumentUrl
      ? "On file"
      : "—";

  return {
    USER_ID: String(user.id),
    USERNAME: dash(profile?.username),
    FULL_NAME: dash(kyc?.fullName || user.fullName),
    EMAIL: dash(user.email),
    MOBILE: dash(user.phone),
    PHONE: dash(user.phone),
    INVESTOR_ID: dash(profile?.investorId || `KQ-${String(user.id).padStart(6, "0")}`),
    ROLE: user.role?.toUpperCase() || "USER",
    MEMBER_SINCE: fmtDate(user.createdAt),
    ACCOUNT_STATUS: user.isActive ? "ACTIVE" : "SUSPENDED",
    TWO_FACTOR_ENABLED: user.twoFactorEnabled ? "YES" : "NO",

    DATE_OF_BIRTH: dash(profile?.dateOfBirth),
    GENDER: dash(profile?.gender),
    NATIONALITY: dash(profile?.nationality),
    FATHER_NAME: "—",

    COUNTRY: dash(country),
    STATE: dash(profile?.state),
    CITY: dash(profile?.city),
    ADDRESS: dash(address),
    POSTAL_CODE: dash(profile?.postalCode),
    FULL_ADDRESS: composeFullAddress({
      address: kyc?.address || profile?.address,
      city: profile?.city,
      state: profile?.state,
      country: kyc?.country || profile?.country,
      postalCode: profile?.postalCode,
    }),

    KYC_STATUS: user.kycStatus?.toUpperCase() || "PENDING",
    KYC_SUBMIT_STATUS: kyc?.status?.toUpperCase() || "NOT SUBMITTED",
    KYC_DATE: kyc?.updatedAt ? fmtDate(kyc.updatedAt) : "—",
    KYC_SUBMIT_DATE: kyc?.createdAt ? fmtDate(kyc.createdAt) : "—",
    KYC_DOCUMENTS: kyc
      ? [
          kyc.idType ? String(kyc.idType).replace(/_/g, " ") : null,
          kyc.panCard ? "PAN" : null,
          kyc.aadhaarNumber ? "Aadhaar" : null,
          kyc.passportDocumentUrl ? "Passport" : null,
          kyc.addressProofUrl ? "Address Proof" : null,
          kyc.selfieUrl ? "Selfie" : null,
          kyc.signatureUrl ? "Signature" : null,
          kyc.cancelledChequeUrl ? "Cancelled Cheque" : null,
        ].filter(Boolean).join(", ") || "Submitted"
      : "Not submitted",
    KYC_REJECTION_REASON: dash(kyc?.rejectionReason),

    PAN_NUMBER: dash(kyc?.panCard || profile?.taxId),
    AADHAAR_NUMBER: maskAadhaar(kyc?.aadhaarNumber),
    PASSPORT_NUMBER: passportNumber,
    ID_TYPE: idType,
    ID_NUMBER: kyc?.idType === "passport"
      ? dash(kyc.idNumber)
      : kyc?.aadhaarNumber
        ? maskAadhaar(kyc.aadhaarNumber)
        : maskGenericId(kyc?.idNumber),
    TAX_ID: dash(kyc?.taxId || profile?.taxId),

    ACCOUNT_HOLDER_NAME: dash(accountHolder),
    BANK_ACCOUNT: bankAccountMasked,
    BANK_NAME: dash(bankName),
    IFSC_CODE: dash(ifsc),
    BRANCH_NAME: dash(branch),
    UPI_ID: dash(upi),

    CRYPTO_WALLETS: uniqueCrypto.length ? uniqueCrypto.join("; ") : "—",
    ...cryptoWalletValues,

    OCCUPATION: dash(profile?.occupation),
    ANNUAL_INCOME_RANGE: dash(profile?.annualIncomeRange),
    INVESTMENT_EXPERIENCE: dash(profile?.investmentExperience),
    RISK_APPETITE: dash(profile?.riskAppetite),
    PREFERRED_INVESTMENT_TYPE: dash(profile?.preferredInvestmentType),
    SOURCE_OF_FUNDS: dash(profile?.sourceOfFunds),
    TRADING_INTERESTS: tradingInterests,
    ONBOARDING_DATE: profile?.onboardingCompletedAt ? fmtDate(profile.onboardingCompletedAt) : "—",

    REFERRAL_CODE: dash(user.referralCode),
    REFERRAL_COUNT: String(user.referralCount ?? 0),
    REFERRAL_EARNINGS: fmtMoney(user.referralEarnings),
    BALANCE_FIAT: fmtMoney(user.balanceFiat),
    BALANCE_CRYPTO: fmtMoney(user.balanceCrypto, "CRYPTO"),
    TOTAL_PROFIT: fmtMoney(user.totalProfit),

    MT_BROKER: dash(mt5Account?.broker),
    MT_SERVER: dash(mt5Account?.serverName),
    MT_BALANCE: mt5Account?.balance != null ? fmtMoney(mt5Account.balance) : "—",
    MT_EQUITY: mt5Account?.equity != null ? fmtMoney(mt5Account.equity) : "—",
    MT_PROFIT: mt5Account?.profit != null ? fmtMoney(mt5Account.profit) : "—",
    MT_ACCOUNT_STATUS: mt5Account?.status?.toUpperCase().replace(/_/g, " ") || "—",
  };
}

/** All placeholders available in agreement templates — mirrors collected onboarding/profile/KYC data */
export const AGREEMENT_PLACEHOLDERS: PlaceholderMeta[] = [
  { key: "USER_ID", label: "User ID", group: "User Account" },
  { key: "USERNAME", label: "Username", group: "User Account" },
  { key: "FULL_NAME", label: "Full Name", group: "User Account" },
  { key: "EMAIL", label: "Email", group: "User Account" },
  { key: "MOBILE", label: "Mobile / Phone", group: "User Account" },
  { key: "PHONE", label: "Phone (alias)", group: "User Account" },
  { key: "INVESTOR_ID", label: "Investor ID", group: "User Account" },
  { key: "ROLE", label: "Account Role", group: "User Account" },
  { key: "MEMBER_SINCE", label: "Registration Date", group: "User Account" },
  { key: "ACCOUNT_STATUS", label: "Account Active / Suspended", group: "User Account" },
  { key: "TWO_FACTOR_ENABLED", label: "2FA Enabled", group: "User Account" },

  { key: "DATE_OF_BIRTH", label: "Date of Birth", group: "Profile" },
  { key: "GENDER", label: "Gender", group: "Profile" },
  { key: "NATIONALITY", label: "Nationality", group: "Profile" },
  { key: "FATHER_NAME", label: "Father's Name", group: "Profile" },
  { key: "OCCUPATION", label: "Occupation", group: "Profile" },

  { key: "COUNTRY", label: "Country", group: "Address" },
  { key: "STATE", label: "State / Province", group: "Address" },
  { key: "CITY", label: "City", group: "Address" },
  { key: "ADDRESS", label: "Street Address", group: "Address" },
  { key: "POSTAL_CODE", label: "Postal / PIN Code", group: "Address" },
  { key: "FULL_ADDRESS", label: "Full Formatted Address", group: "Address" },

  { key: "KYC_STATUS", label: "KYC Status (user)", group: "KYC & Identity" },
  { key: "KYC_SUBMIT_STATUS", label: "KYC Submission Status", group: "KYC & Identity" },
  { key: "KYC_DATE", label: "KYC Last Updated", group: "KYC & Identity" },
  { key: "KYC_SUBMIT_DATE", label: "KYC Submitted On", group: "KYC & Identity" },
  { key: "KYC_DOCUMENTS", label: "Documents on File", group: "KYC & Identity" },
  { key: "KYC_REJECTION_REASON", label: "KYC Rejection Reason", group: "KYC & Identity" },
  { key: "PAN_NUMBER", label: "PAN Number", group: "KYC & Identity" },
  { key: "AADHAAR_NUMBER", label: "Aadhaar (masked)", group: "KYC & Identity" },
  { key: "PASSPORT_NUMBER", label: "Passport Number", group: "KYC & Identity" },
  { key: "ID_TYPE", label: "ID Document Type", group: "KYC & Identity" },
  { key: "ID_NUMBER", label: "ID Number (masked)", group: "KYC & Identity" },
  { key: "TAX_ID", label: "Tax ID", group: "KYC & Identity" },

  { key: "ACCOUNT_HOLDER_NAME", label: "Bank Account Holder", group: "Banking & UPI" },
  { key: "BANK_ACCOUNT", label: "Bank Account (masked)", group: "Banking & UPI" },
  { key: "BANK_NAME", label: "Bank Name", group: "Banking & UPI" },
  { key: "IFSC_CODE", label: "IFSC / SWIFT Code", group: "Banking & UPI" },
  { key: "BRANCH_NAME", label: "Bank Branch", group: "Banking & UPI" },
  { key: "UPI_ID", label: "UPI ID", group: "Banking & UPI" },

  { key: "CRYPTO_WALLETS", label: "All Crypto Wallets (summary)", group: "Crypto Wallets" },
  ...CRYPTO_WALLET_KEYS.map(w => ({ key: w.key, label: w.label, group: "Crypto Wallets" as const })),

  { key: "ANNUAL_INCOME_RANGE", label: "Annual Income Range", group: "Financial Profile" },
  { key: "INVESTMENT_EXPERIENCE", label: "Investment Experience", group: "Financial Profile" },
  { key: "RISK_APPETITE", label: "Risk Appetite", group: "Financial Profile" },
  { key: "PREFERRED_INVESTMENT_TYPE", label: "Preferred Investment Type", group: "Financial Profile" },
  { key: "SOURCE_OF_FUNDS", label: "Source of Funds", group: "Financial Profile" },
  { key: "TRADING_INTERESTS", label: "Selected Services", group: "Financial Profile" },
  { key: "ONBOARDING_DATE", label: "Onboarding Completed", group: "Financial Profile" },

  { key: "REFERRAL_CODE", label: "Referral Code", group: "Wallet & Referrals" },
  { key: "REFERRAL_COUNT", label: "Referrals Count", group: "Wallet & Referrals" },
  { key: "REFERRAL_EARNINGS", label: "Referral Earnings", group: "Wallet & Referrals" },
  { key: "BALANCE_FIAT", label: "Fiat Wallet Balance", group: "Wallet & Referrals" },
  { key: "BALANCE_CRYPTO", label: "Crypto Wallet Balance", group: "Wallet & Referrals" },
  { key: "TOTAL_PROFIT", label: "Total Profit", group: "Wallet & Referrals" },

  { key: "AGREEMENT_UID", label: "Agreement Reference", group: "Agreement" },
  { key: "AGREEMENT_DATE", label: "Agreement Date", group: "Agreement" },
  { key: "AGREEMENT_STATUS", label: "Agreement Status", group: "Agreement" },
  { key: "IP_ADDRESS", label: "IP Address", group: "Agreement" },
  { key: "DEVICE_INFO", label: "Device Info", group: "Agreement" },
  { key: "PDF_HASH", label: "Verification Hash", group: "Agreement" },

  { key: "PLAN_NAME", label: "Investment Plan Name", group: "Investment" },
  { key: "PLAN_CATEGORY", label: "Plan Category", group: "Investment" },
  { key: "PLAN_TYPE", label: "Plan Type", group: "Investment" },
  { key: "INVESTMENT_TYPE", label: "Investment Type", group: "Investment" },
  { key: "INVESTMENT_AMOUNT", label: "Investment Amount", group: "Investment" },
  { key: "CURRENCY", label: "Currency", group: "Investment" },
  { key: "ROI_RATE", label: "ROI Rate %", group: "Investment" },
  { key: "DURATION", label: "Duration (days)", group: "Investment" },
  { key: "START_DATE", label: "Investment Start Date", group: "Investment" },
  { key: "MATURITY_DATE", label: "Maturity Date", group: "Investment" },
  { key: "TRANSACTION_ID", label: "Transaction / Investment ID", group: "Investment" },
  { key: "WALLET_ADDRESS", label: "Payment Wallet Address", group: "Investment" },
  { key: "PROFIT_SHARING", label: "Manager Profit Share %", group: "Investment" },
  { key: "INVESTOR_SHARE", label: "Investor Share %", group: "Investment" },

  { key: "EA_NAME", label: "EA Strategy Name", group: "Trading & MT" },
  { key: "EA_PLAN", label: "EA Plan", group: "Trading & MT" },
  { key: "LICENSE_KEY", label: "License Key", group: "Trading & MT" },
  { key: "MT_ACCOUNT", label: "MT4/MT5 Account Number", group: "Trading & MT" },
  { key: "MT_PLATFORM", label: "MT Platform", group: "Trading & MT" },
  { key: "MT_BROKER", label: "MT Broker", group: "Trading & MT" },
  { key: "MT_SERVER", label: "MT Server", group: "Trading & MT" },
  { key: "BROKER_SERVER", label: "Broker / Server", group: "Trading & MT" },
  { key: "MT_BALANCE", label: "MT Account Balance", group: "Trading & MT" },
  { key: "MT_EQUITY", label: "MT Account Equity", group: "Trading & MT" },
  { key: "MT_PROFIT", label: "MT Account Profit", group: "Trading & MT" },
  { key: "MT_ACCOUNT_STATUS", label: "MT Account Status", group: "Trading & MT" },
  { key: "SUBSCRIPTION_DAYS", label: "Subscription Days Remaining", group: "Trading & MT" },
  { key: "EXPIRY_DATE", label: "Subscription Expiry", group: "Trading & MT" },
  { key: "SUBSCRIPTION_FEE", label: "Subscription Fee", group: "Trading & MT" },

  { key: "TRADER_NAME", label: "Copy Trader Name", group: "Copy Trading" },
  { key: "TRADER_ROI", label: "Copy Trader ROI", group: "Copy Trading" },
  { key: "TRADER_RISK", label: "Copy Trader Risk Level", group: "Copy Trading" },
  { key: "COPY_RATIO", label: "Copy Ratio", group: "Copy Trading" },
  { key: "COPY_AMOUNT", label: "Copy Amount", group: "Copy Trading" },
  { key: "REQUEST_DETAILS", label: "MT Request Notes", group: "Copy Trading" },
  { key: "REQUEST_STATUS", label: "MT Request Status", group: "Copy Trading" },

  { key: "ALGO_STRATEGY", label: "Algo Strategy Name", group: "Algo Trading" },
  { key: "ALGO_DESCRIPTION", label: "Algo Strategy Description", group: "Algo Trading" },
  { key: "ALGO_RISK", label: "Algo Risk Level", group: "Algo Trading" },
  { key: "ALGO_ROI", label: "Algo ROI", group: "Algo Trading" },
  { key: "ALGO_AMOUNT", label: "Algo Subscription Amount", group: "Algo Trading" },
  { key: "ALGO_SUBSCRIPTION_DATE", label: "Algo Subscription Date", group: "Algo Trading" },
];
