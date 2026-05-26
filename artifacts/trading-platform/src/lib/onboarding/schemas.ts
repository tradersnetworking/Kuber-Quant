import { z } from "zod";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "./constants";

const fileSchema = z
  .custom<File>((v) => v instanceof File, "File required")
  .refine((f) => f.size <= MAX_FILE_SIZE, "File must be under 10MB")
  .refine((f) => ACCEPTED_FILE_TYPES.includes(f.type), "JPEG, PNG, WebP, or PDF only");

const optionalFile = z.custom<File | undefined>().optional();

export const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const upiRegex = /^[\w.-]+@[\w.-]+$/;

export const walletValidators: Record<string, RegExp> = {
  btc: /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/,
  eth: /^0x[a-fA-F0-9]{40}$/,
  usdtTrc20: /^T[A-Za-z1-9]{33}$/,
  usdtErc20: /^0x[a-fA-F0-9]{40}$/,
  usdtBep20: /^0x[a-fA-F0-9]{40}$/,
  bnb: /^0x[a-fA-F0-9]{40}$/,
  xrp: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
  tron: /^T[A-Za-z1-9]{33}$/,
};

export const investorStep1Schema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscore only"),
  email: z.string().email("Valid email required"),
  phoneCode: z.string().min(1),
  phoneNum: z.string().optional(),
  password: z.string().min(8, "Minimum 8 characters").regex(/[A-Z]/, "Include uppercase").regex(/[0-9]/, "Include number"),
  confirmPassword: z.string(),
  referralCode: z.string().optional(),
  agreeTerms: z.literal(true, { errorMap: () => ({ message: "Accept Terms & Conditions" }) }),
  agreeRisk: z.literal(true, { errorMap: () => ({ message: "Accept Risk Disclosure" }) }),
  emailOtpVerified: z.boolean().refine(v => v, "Verify email OTP"),
  mobileOtpVerified: z.boolean().optional(),
  captchaAnswer: z.string().min(1, "Complete CAPTCHA"),
  captchaExpected: z.string(),
}).refine(d => d.password === d.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] })
  .refine(d => d.captchaAnswer === d.captchaExpected, { message: "Incorrect CAPTCHA", path: ["captchaAnswer"] });

export const investorStep2Schema = z.object({
  dateOfBirth: z.string().min(1, "Date of birth required"),
  gender: z.string().min(1, "Select gender"),
  nationality: z.string().min(1, "Nationality required"),
  country: z.string().min(1, "Country required"),
  state: z.string().optional(),
  city: z.string().min(1, "City required"),
  address: z.string().min(5, "Full address required"),
  postalCode: z.string().min(3, "Postal code required"),
});

export const investorStep3Schema = z.object({
  panCard: z.string().regex(panRegex, "Invalid PAN format (e.g. ABCDE1234F)"),
  aadhaarNumber: z.string().optional(),
  passportNumber: z.string().optional(),
  taxId: z.string().optional(),
  panDocument: fileSchema,
  aadhaarFront: optionalFile,
  aadhaarBack: optionalFile,
  passportDocument: optionalFile,
  selfie: fileSchema,
  addressProof: fileSchema,
  signature: fileSchema,
});

export const investorStep4Schema = z.object({
  accountHolderName: z.string().min(2, "Account holder name required"),
  bankName: z.string().min(2, "Bank name required"),
  accountNumber: z.string().min(6, "Valid account number required"),
  confirmAccountNumber: z.string(),
  ifscCode: z.string().regex(ifscRegex, "Invalid IFSC/SWIFT format"),
  branchName: z.string().optional(),
  upiId: z.string().regex(upiRegex, "Invalid UPI ID").optional().or(z.literal("")),
  cancelledCheque: fileSchema,
}).refine(d => d.accountNumber === d.confirmAccountNumber, { message: "Account numbers must match", path: ["confirmAccountNumber"] });

export const investorStep5Schema = z.object({
  cryptoWallets: z.record(z.string()).optional(),
});

export const investorStep6Schema = z.object({
  occupation: z.string().min(1, "Occupation required"),
  annualIncomeRange: z.string().min(1, "Select income range"),
  investmentExperience: z.string().min(1, "Select experience"),
  riskAppetite: z.enum(["Conservative", "Moderate", "Aggressive"]),
  preferredInvestmentType: z.string().min(1, "Select investment type"),
  sourceOfFunds: z.string().min(1, "Select source of funds"),
});

export const investorStep7Schema = z.object({
  tradingInterests: z.array(z.string()).min(1, "Select at least one service"),
});

export const investorStep8MtSchema = z.object({
  mtPlatform: z.enum(["mt4", "mt5"]),
  mtAccountNumber: z.string(),
  mtBroker: z.string(),
  mtServer: z.string(),
  mtPassword: z.string(),
  linkMtLater: z.boolean(),
});

export const investorStep9Schema = z.object({
  enable2FA: z.boolean(),
  withdrawalPin: z.string().min(4, "PIN must be 4+ digits").max(6).optional().or(z.literal("")),
  securityQuestion: z.string().optional(),
  securityAnswer: z.string().optional(),
});

export const investorStep10Schema = z.object({
  agreeTermsFinal: z.literal(true),
  agreePrivacy: z.literal(true),
  agreeRiskFinal: z.literal(true),
  agreeAml: z.literal(true),
  agreeProfitSharing: z.literal(true),
  agreeESign: z.literal(true),
  electronicSignature: z.string().min(2, "Type your full name as signature"),
});

export const managerStep1Schema = z.object({
  fullName: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  phoneCode: z.string(),
  phoneNum: z.string().optional(),
  password: z.string().min(10, "Manager password min 10 chars").regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/, "Include special character"),
  confirmPassword: z.string(),
  emailOtpVerified: z.boolean().refine(v => v, "Verify email OTP"),
  captchaAnswer: z.string(),
  captchaExpected: z.string(),
}).refine(d => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  .refine(d => d.captchaAnswer === d.captchaExpected, { path: ["captchaAnswer"], message: "Incorrect CAPTCHA" });

export type InvestorFormValues = {
  fullName: string;
  username: string;
  email: string;
  phoneCode: string;
  phoneNum: string;
  password: string;
  confirmPassword: string;
  referralCode: string;
  agreeTerms: boolean;
  agreeRisk: boolean;
  emailOtpVerified: boolean;
  mobileOtpVerified: boolean;
  captchaAnswer: string;
  captchaExpected: string;
  captchaToken: string;
  emailVerificationToken: string;
  mobileVerificationToken: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  country: string;
  state: string;
  city: string;
  address: string;
  postalCode: string;
  panCard: string;
  aadhaarNumber: string;
  passportNumber: string;
  taxId: string;
  panDocument?: File;
  aadhaarFront?: File;
  aadhaarBack?: File;
  passportDocument?: File;
  selfie?: File;
  addressProof?: File;
  signature?: File;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  cancelledCheque?: File;
  cryptoWallets: Record<string, string>;
  occupation: string;
  annualIncomeRange: string;
  investmentExperience: string;
  riskAppetite: "Conservative" | "Moderate" | "Aggressive";
  preferredInvestmentType: string;
  sourceOfFunds: string;
  tradingInterests: string[];
  mtPlatform: "mt4" | "mt5";
  mtAccountNumber: string;
  mtBroker: string;
  mtServer: string;
  mtPassword: string;
  linkMtLater: boolean;
  enable2FA: boolean;
  withdrawalPin: string;
  securityQuestion: string;
  securityAnswer: string;
  agreeTermsFinal: boolean;
  agreePrivacy: boolean;
  agreeRiskFinal: boolean;
  agreeAml: boolean;
  agreeProfitSharing: boolean;
  agreeESign: boolean;
  electronicSignature: string;
};

export const defaultInvestorValues: InvestorFormValues = {
  fullName: "", username: "", email: "", phoneCode: "+91", phoneNum: "",
  password: "", confirmPassword: "", referralCode: "",
  agreeTerms: false, agreeRisk: false, emailOtpVerified: false, mobileOtpVerified: false,
  captchaAnswer: "", captchaExpected: "", captchaToken: "",
  emailVerificationToken: "", mobileVerificationToken: "",
  dateOfBirth: "", gender: "", nationality: "", country: "", state: "", city: "", address: "", postalCode: "",
  panCard: "", aadhaarNumber: "", passportNumber: "", taxId: "",
  accountHolderName: "", bankName: "", accountNumber: "", confirmAccountNumber: "",
  ifscCode: "", branchName: "", upiId: "",
  cryptoWallets: {},
  occupation: "", annualIncomeRange: "", investmentExperience: "",
  riskAppetite: "Moderate", preferredInvestmentType: "", sourceOfFunds: "",
  tradingInterests: [],
  mtPlatform: "mt5", mtAccountNumber: "", mtBroker: "", mtServer: "", mtPassword: "", linkMtLater: false,
  enable2FA: false, withdrawalPin: "", securityQuestion: "", securityAnswer: "",
  agreeTermsFinal: false, agreePrivacy: false, agreeRiskFinal: false,
  agreeAml: false, agreeProfitSharing: false, agreeESign: false, electronicSignature: "",
};

export const INVESTOR_STEP_SCHEMAS = [
  investorStep1Schema, investorStep2Schema, investorStep3Schema, investorStep4Schema,
  investorStep5Schema, investorStep6Schema, investorStep7Schema, investorStep8MtSchema,
  investorStep9Schema, investorStep10Schema,
];
