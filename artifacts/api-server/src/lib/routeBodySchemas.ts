import { z } from "zod";

const currencyEnum = z.enum(["USD", "EUR", "BTC", "ETH", "USDT", "INR"]);

export const CheckDuplicateBody = z
  .object({
    email: z.string().email().optional(),
    username: z.string().min(1).max(64).optional(),
  })
  .refine((body) => Boolean(body.email || body.username), {
    message: "email or username is required",
    path: ["email"],
  });

export const SendOtpBody = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  channel: z.enum(["email", "sms", "whatsapp", "firebase", "mobile"]).optional(),
  fullName: z.string().max(200).optional(),
  firebaseIdToken: z.string().optional(),
});

export const VerifyOtpBody = z.object({
  email: z.string().email().optional(),
  phone: z.string().min(6).max(20).optional(),
  otp: z.string().min(4).max(10),
  channel: z.string().optional(),
});

/** Core investor registration fields; extra onboarding keys pass through for file/KYC logic. */
export const InvestorCompleteBody = z
  .object({
    fullName: z.string().min(1).max(200),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    username: z.string().min(1).max(64).optional(),
    phone: z.string().max(20).optional(),
    referralCode: z.string().max(32).optional(),
    country: z.string().max(100).optional(),
    nationality: z.string().max(100).optional(),
    emailVerificationToken: z.string().optional(),
    mobileVerificationToken: z.string().optional(),
    captchaAnswer: z.string().optional(),
    captchaToken: z.string().optional(),
  })
  .passthrough();

export const ManualDepositBody = z.object({
  amount: z.coerce.number().positive(),
  currency: currencyEnum,
  paymentMethod: z.string().min(1).max(120),
  utrReference: z.string().max(120).optional(),
  txHash: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  promoCode: z.string().max(32).optional(),
  depositMethodType: z.string().max(32).optional(),
});

export type CheckDuplicateInput = z.infer<typeof CheckDuplicateBody>;
export type SendOtpInput = z.infer<typeof SendOtpBody>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpBody>;
export type InvestorCompleteInput = z.infer<typeof InvestorCompleteBody>;
export type ManualDepositInput = z.infer<typeof ManualDepositBody>;

export const ManagerReportBody = z.object({
  subjectUserId: z.coerce.number().int().positive(),
  issueType: z.string().max(64).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
});

export const TicketReplyBody = z.object({
  message: z.string().min(1).max(5000),
});

export const TicketStatusBody = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export const ExchangeQuoteBody = z.object({
  side: z.enum(["buy", "sell"]),
  symbol: z.string().min(1).max(32),
  network: z.string().min(1).max(64),
  fiatCurrency: z.string().min(3).max(8),
  fiatAmount: z.coerce.number().positive().optional(),
  cryptoAmount: z.coerce.number().positive().optional(),
});

export const CreateExchangeOrderBody = z.object({
  side: z.enum(["buy", "sell"]),
  symbol: z.string().min(1).max(32),
  network: z.string().min(1).max(64),
  fiatCurrency: z.string().min(3).max(8).default("INR"),
  fiatAmount: z.coerce.number().positive().optional(),
  cryptoAmount: z.coerce.number().positive().optional(),
  paymentGatewayId: z.coerce.number().int().positive().optional(),
  paymentAccountId: z.coerce.number().int().positive().optional(),
  receiveWalletAddress: z.string().max(200).optional(),
  depositMethod: z.string().max(64).optional(),
});

export const ExchangeDepositProofBody = z.object({
  txHash: z.string().max(200).optional(),
  utrReference: z.string().max(120).optional(),
});

const userRoleEnum = z.enum(["user", "manager", "support", "admin", "superadmin"]);
const kycStatusEnum = z.enum(["pending", "submitted", "verified", "rejected"]);

export const CreateStaffUserBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  role: userRoleEnum.optional(),
  managerId: z.coerce.number().int().positive().optional(),
  kycStatus: kycStatusEnum.optional(),
});

export const CreateSupportAgentBody = z
  .object({
    userId: z.coerce.number().int().positive().optional(),
    email: z.string().email().optional(),
    password: z.string().min(8).max(128).optional(),
    fullName: z.string().min(1).max(200).optional(),
    phone: z.string().max(20).optional(),
  })
  .refine(
    (body) => Boolean(body.userId || (body.email && body.password && body.fullName)),
    { message: "userId or email, password, and fullName are required", path: ["userId"] },
  );

export const BulkUserUpdatesBody = z.object({
  userIds: z.array(z.coerce.number().int().positive()).min(1),
  updates: z
    .object({
      isActive: z.boolean().optional(),
      suspendReason: z.string().max(500).nullable().optional(),
      withdrawalsEnabled: z.boolean().optional(),
      withdrawalBlockMessage: z.string().max(500).nullable().optional(),
      depositsEnabled: z.boolean().optional(),
      investmentsEnabled: z.boolean().optional(),
      algoTradingEnabled: z.boolean().optional(),
      copyTradingEnabled: z.boolean().optional(),
      eaTradingEnabled: z.boolean().optional(),
      mt5Enabled: z.boolean().optional(),
      managerId: z.coerce.number().int().positive().nullable().optional(),
      kycStatus: kycStatusEnum.optional(),
      role: userRoleEnum.optional(),
    })
    .optional(),
});

export const PatchUserRoleBody = z.object({
  role: userRoleEnum,
});

export const BanLoginBody = z.object({
  reason: z.string().max(500).optional(),
});

export const TotpCodeBody = z.object({
  code: z.string().min(4).max(16),
});

export const TwoFactorVerifyLoginBody = z.object({
  tempToken: z.string().min(1),
  code: z.string().min(4).max(16),
  method: z.string().optional(),
  trustDevice: z.boolean().optional(),
});

export const TwoFactorSendLoginOtpBody = z.object({
  tempToken: z.string().min(1),
  channel: z.enum(["email", "sms", "whatsapp"]).optional(),
});

export const PaymentAccountCreateBody = z.object({
  label: z.string().min(1).max(120),
  accountType: z.enum(["bank", "upi", "crypto"]),
  accountHolderName: z.string().max(120).optional(),
  bankName: z.string().max(120).optional(),
  accountNumber: z.string().max(64).optional(),
  ifscCode: z.string().max(20).optional(),
  branchName: z.string().max(120).optional(),
  upiId: z.string().max(120).optional(),
  upiQrUrl: z.string().max(500).optional(),
  cryptoSymbol: z.string().max(16).optional(),
  cryptoNetwork: z.string().max(32).optional(),
  walletAddress: z.string().max(200).optional(),
  walletQrUrl: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

export const PaymentAccountPatchBody = PaymentAccountCreateBody.partial();

export const WithdrawConfirmBody = z.object({
  confirmationToken: z.string().min(1),
  emailOtp: z.string().min(4).max(10),
});

export const WithdrawInitBody = z.object({
  paymentAccountId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  currency: z.string().max(8).optional(),
  cryptoNetwork: z.string().max(32).optional(),
  password: z.string().min(1),
  totpCode: z.string().min(4).max(16),
});

export const WithdrawRequestBody = z.union([WithdrawConfirmBody, WithdrawInitBody]);

/** Accepts arbitrary JSON object bodies for complex admin settings forms. */
export const SettingsJsonBody = z.object({}).passthrough();

export const Mt5EndpointBody = z.object({
  endpoint: z.string().max(2000).optional(),
});

export const TradeCopierSettingsBody = z.object({
  baseUrl: z.string().max(500).optional(),
  authType: z.string().max(32).optional(),
  apiKey: z.string().max(500).optional(),
  username: z.string().max(120).optional(),
  password: z.string().max(500).optional(),
  masterAccountId: z.string().max(64).optional(),
});

export const VpsBridgeSettingsBody = z.object({
  enabled: z.boolean().optional(),
  host: z.string().max(255).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  basePath: z.string().max(255).optional(),
  apiKey: z.string().max(500).optional(),
  useHttps: z.boolean().optional(),
  marketQuotesPath: z.string().max(255).optional(),
  tradeCopierDumpPath: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
});

export const MarketDataSettingsBody = z.object({
  provider: z.string().max(64).optional(),
  defaultPairs: z.array(z.string().max(32)).optional(),
  refreshSeconds: z.coerce.number().int().min(5).max(3600).optional(),
  customApiUrl: z.string().max(500).optional(),
  customApiKey: z.string().max(500).optional(),
});

export const SmtpSettingsBody = z.object({
  enabled: z.boolean().optional(),
  host: z.string().max(255).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  secure: z.boolean().optional(),
  user: z.string().max(255).optional(),
  pass: z.string().max(500).optional(),
  from: z.string().max(255).optional(),
  tlsRejectUnauthorized: z.boolean().optional(),
});

export const SmtpTestBody = z.object({
  testTo: z.string().email().optional(),
});

export const SupportInboxSettingsBody = SmtpSettingsBody.extend({
  inboxAddress: z.string().email().optional(),
});

export const EmailCommunicationTestBody = z.object({
  purpose: z.string().min(1).max(64),
  testTo: z.string().email(),
});

export const Mt5RequestStatusBody = z.object({
  status: z.enum(["pending", "forwarded", "accepted", "rejected", "completed"]),
  externalResponse: z.string().max(5000).optional(),
});

export const ExchangeOrderAdminNotesBody = z.object({
  adminNotes: z.string().max(2000).optional(),
});

export const ExchangeOrderRejectBody = z.object({
  reason: z.string().max(2000).optional(),
});
