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
  biometricActionToken: z.string().min(1).optional(),
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

export const CreateStakeBody = z.object({
  planId: z.coerce.number().int().positive(),
  amount: z.coerce.number().positive(),
  autoReinvest: z.boolean().optional(),
  agreementAccepted: z.literal(true),
});

export const ClaimStakeRewardBody = z.object({
  amount: z.coerce.number().positive().optional(),
});

export const StakingProjectionBody = z.object({
  principal: z.coerce.number().positive(),
  aprPercent: z.coerce.number().min(0).max(1000),
  apyPercent: z.coerce.number().min(0).max(1000).optional(),
  durationDays: z.coerce.number().int().min(0).max(3650),
  compoundEnabled: z.boolean().optional(),
  rewardFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "at_maturity"]).optional(),
});

export const StakingSettingsBody = z.object({
  stakingEnabled: z.boolean().optional(),
  rewardsPaused: z.boolean().optional(),
  autoPayoutEnabled: z.boolean().optional(),
  manualApprovalRequired: z.boolean().optional(),
  defaultCurrency: z.string().max(10).optional(),
});

export const StakingPlanBody = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  planType: z.enum(["flexible", "fixed", "vip", "compound", "promotional"]).optional(),
  currency: z.string().max(10).optional(),
  minAmount: z.coerce.number().positive(),
  maxAmount: z.coerce.number().positive(),
  aprPercent: z.coerce.number().min(0).max(1000),
  apyPercent: z.coerce.number().min(0).max(1000).optional(),
  roiPercent: z.coerce.number().min(0).max(1000).optional(),
  lockDurationDays: z.coerce.number().int().min(0).optional(),
  isFlexible: z.boolean().optional(),
  rewardFrequency: z.enum(["hourly", "daily", "weekly", "monthly", "at_maturity"]).optional(),
  compoundEnabled: z.boolean().optional(),
  autoRenew: z.boolean().optional(),
  earlyWithdrawalPenalty: z.coerce.number().min(0).max(100).optional(),
  promotionalBonusPercent: z.coerce.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  isRecommended: z.boolean().optional(),
  riskLevel: z.enum(["low", "medium", "high"]).optional(),
  maxUsers: z.coerce.number().int().positive().optional().nullable(),
  totalPoolLimit: z.coerce.number().positive().optional().nullable(),
  themeColor: z.string().max(20).optional(),
  iconKey: z.string().max(40).optional(),
  sortOrder: z.coerce.number().int().optional(),
  changeReason: z.string().max(500).optional(),
});

export const StakingPlanPatchBody = StakingPlanBody.partial();

export const ManualStakeRewardBody = z.object({
  amount: z.coerce.number().positive(),
  remarks: z.string().max(500).optional(),
});

export const WebauthnRegisterVerifyBody = z.object({
  response: z.record(z.unknown()),
  challengeKey: z.string().min(8).max(128),
  deviceName: z.string().max(120).optional(),
});

export const WebauthnLoginBeginBody = z.object({
  email: z.string().email().max(320),
});

export const WebauthnLoginFinishBody = z.object({
  email: z.string().email().max(320),
  response: z.record(z.unknown()),
  challengeKey: z.string().min(8).max(128),
  userId: z.coerce.number().int().positive(),
});

export const Webauthn2faVerifyBody = z.object({
  tempToken: z.string().min(1),
  response: z.record(z.unknown()),
  challengeKey: z.string().min(8).max(128),
  trustDevice: z.boolean().optional(),
});

export const WebauthnRenameCredentialBody = z.object({
  deviceName: z.string().min(1).max(120),
});

export const WebauthnPrefsBody = z.object({
  quickLoginEnabled: z.boolean().optional(),
  biometricWithdrawalsEnabled: z.boolean().optional(),
  withdrawalThresholdInr: z.coerce.number().min(0).max(1_000_000_000).optional(),
});

export const WebauthnActionVerifyBody = z.object({
  response: z.record(z.unknown()),
  challengeKey: z.string().min(8).max(128),
});
