import { Router } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import rateLimit from "express-rate-limit";
import {
  db, usersTable, onboardingDraftsTable, userProfilesTable,
  managerApplicationsTable, kycRecordsTable, notificationsTable,
  siteSettingsTable,
} from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import {
  createEmailOtp, verifyEmailOtp, sendOtpEmail,
} from "../helpers/authHelpers";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { encryptSensitive, generateInvestorId } from "../helpers/encryption";
import { seedPaymentAccountsFromOnboarding } from "../helpers/paymentAccountSync";
import { linkMtTradingAccount } from "../helpers/mtAccountLink";
import { createCaptchaChallenge, verifyCaptchaChallenge } from "../helpers/captchaStore";
import { issueRegistrationVerification, consumeRegistrationVerification } from "../helpers/registrationVerification";
import { sendTransactionalEmail, buildWelcomeEmail } from "../helpers/mailer";
import { issueTokens, mapUser, generateReferralCode } from "./auth";
import { requireAuth, requireSuperAdmin, requireAdmin } from "../middlewares/auth";

const router = Router();
const upload = createUploadMiddleware("kyc_documents");

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many OTP requests. Try again later." },
});

const DEFAULT_CONFIG = {
  investorRegistrationEnabled: true,
  managerRegistrationEnabled: true,
  maxUploadMb: 10,
  allowedCountries: ["India", "United States", "United Kingdom", "UAE", "Singapore", "Canada", "Australia"],
  requireEmailOtp: true,
  requireMobileOtp: false,
  requireCaptcha: true,
  kycRequired: true,
};

async function getOnboardingConfig() {
  const rows = await db.select().from(siteSettingsTable)
    .where(or(
      eq(siteSettingsTable.key, "onboarding_config"),
    ));
  const row = rows[0];
  if (!row?.value) return DEFAULT_CONFIG;
  try {
    return { ...DEFAULT_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function draftExpiry() {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
}

router.get("/config", async (_req, res) => {
  const config = await getOnboardingConfig();
  res.json(config);
});

router.get("/captcha", async (_req, res) => {
  const { captchaToken, question } = createCaptchaChallenge();
  res.json({ captchaToken, question });
});

function sanitizeDraftData(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const out = { ...(data as Record<string, unknown>) };
  for (const key of ["password", "confirmPassword", "mtPassword", "withdrawalPin", "securityAnswer"]) {
    delete out[key];
  }
  return out;
}

router.get("/draft/:token", async (req, res) => {
  const { token } = req.params;
  const [draft] = await db.select().from(onboardingDraftsTable)
    .where(eq(onboardingDraftsTable.draftToken, token)).limit(1);
  if (!draft || (draft.expiresAt && draft.expiresAt < new Date())) {
    res.status(404).json({ error: "Draft not found or expired" });
    return;
  }
  res.json({
    draftToken: draft.draftToken,
    onboardingType: draft.onboardingType,
    currentStep: draft.currentStep,
    data: sanitizeDraftData(draft.data),
    email: draft.email ? `${String(draft.email).slice(0, 3)}***` : null,
  });
});

router.post("/draft", async (req, res) => {
  const { draftToken, onboardingType, currentStep, data, email } = req.body;
  if (!onboardingType || !data) {
    res.status(400).json({ error: "onboardingType and data are required" });
    return;
  }
  const token = draftToken || randomBytes(24).toString("hex");
  const expiresAt = draftExpiry();

  const existing = draftToken
    ? await db.select().from(onboardingDraftsTable).where(eq(onboardingDraftsTable.draftToken, token)).limit(1)
    : [];

  if (existing.length > 0) {
    const [updated] = await db.update(onboardingDraftsTable)
      .set({ currentStep: currentStep || existing[0].currentStep, data, email: email || existing[0].email, expiresAt, updatedAt: new Date() })
      .where(eq(onboardingDraftsTable.draftToken, token))
      .returning();
    res.json({ draftToken: updated.draftToken, currentStep: updated.currentStep, savedAt: updated.updatedAt });
    return;
  }

  const [created] = await db.insert(onboardingDraftsTable).values({
    draftToken: token,
    onboardingType,
    currentStep: currentStep || 1,
    data,
    email: email || null,
    expiresAt,
  }).returning();
  res.status(201).json({ draftToken: created.draftToken, currentStep: created.currentStep, savedAt: created.createdAt });
});

router.post("/check-duplicate", async (req, res) => {
  const { email, username } = req.body;
  const result: { emailTaken?: boolean; usernameTaken?: boolean } = {};
  if (email) {
    const [u] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.email, email.toLowerCase())).limit(1);
    result.emailTaken = !!u;
  }
  if (username) {
    const [p] = await db.select({ userId: userProfilesTable.userId }).from(userProfilesTable)
      .where(eq(userProfilesTable.username, username.toLowerCase())).limit(1);
    result.usernameTaken = !!p;
  }
  res.json(result);
});

router.post("/send-otp", otpLimiter, async (req, res) => {
  const { email, phone, channel, fullName } = req.body;
  const config = await getOnboardingConfig();
  const purpose = channel === "mobile" ? "mobile_verify" as const : "registration" as const;
  const target = channel === "mobile" ? `sms:${phone}` : email?.toLowerCase();

  if (!target) {
    res.status(400).json({ error: "email or phone is required" });
    return;
  }
  if (channel !== "mobile" && email) {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }
  }

  const { otp } = await createEmailOtp({
    email: target,
    purpose,
    ttlMinutes: 15,
  });

  if (channel === "mobile") {
    // SMS integration placeholder — OTP logged in dev
    if (process.env.NODE_ENV !== "production") {
      console.info(`[DEV] Mobile OTP for ${phone}: ${otp}`);
    }
    res.json({ message: "Verification code sent to your mobile.", devOtp: process.env.NODE_ENV !== "production" ? otp : undefined });
    return;
  }

  await sendOtpEmail({
    to: email,
    name: fullName || "Investor",
    otp,
    purpose: "Registration",
  });
  res.json({ message: "Verification code sent to your email.", devOtp: process.env.NODE_ENV !== "production" ? otp : undefined });
});

router.post("/verify-otp", otpLimiter, async (req, res) => {
  const { email, phone, otp, channel } = req.body;
  const purpose = channel === "mobile" ? "mobile_verify" as const : "registration" as const;
  const target = channel === "mobile" ? `sms:${phone}` : email?.toLowerCase();
  if (!target || !otp) {
    res.status(400).json({ error: "target and otp are required" });
    return;
  }
  const valid = await verifyEmailOtp({ email: target, otp, purpose });
  if (!valid) {
    res.status(400).json({ error: "Invalid or expired verification code" });
    return;
  }
  const verificationToken = issueRegistrationVerification(target, channel || "email");
  res.json({ verified: true, channel: channel || "email", verificationToken });
});

router.post("/investor/complete", upload.fields([
  { name: "panDocument", maxCount: 1 },
  { name: "aadhaarFront", maxCount: 1 },
  { name: "aadhaarBack", maxCount: 1 },
  { name: "passportDocument", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "signature", maxCount: 1 },
  { name: "cancelledCheque", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]), async (req, res) => {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(req.body.data || "{}");
  } catch {
    res.status(400).json({ error: "Invalid onboarding data" });
    return;
  }

  const {
    fullName, username, email, password, phone, referralCode,
    dateOfBirth, gender, nationality, country, state, city, address, postalCode,
    panCard, aadhaarNumber, taxId, passportNumber,
    accountHolderName, bankName, accountNumber, ifscCode, branchName, upiId,
    cryptoWallets, occupation, annualIncomeRange, investmentExperience,
    riskAppetite, preferredInvestmentType, sourceOfFunds, tradingInterests,
    securitySettings, agreements,
    emailVerificationToken, mobileVerificationToken,
    captchaAnswer, captchaToken,
    mtPlatform, mtAccountNumber, mtBroker, mtServer, mtPassword, linkMtLater,
  } = payload as Record<string, any>;

  const config = await getOnboardingConfig();
  if (!config.investorRegistrationEnabled) {
    res.status(403).json({ error: "Investor registration is currently disabled" });
    return;
  }
  if (!fullName || !email || !password) {
    res.status(400).json({ error: "fullName, email, password are required" });
    return;
  }
  if (config.requireEmailOtp) {
    if (!emailVerificationToken || !consumeRegistrationVerification(emailVerificationToken, email, "email")) {
      res.status(400).json({ error: "Email OTP verification required — please verify your email again" });
      return;
    }
  }
  if (config.requireMobileOtp && phone) {
    const mobileTarget = `sms:${phone}`;
    if (!mobileVerificationToken || !consumeRegistrationVerification(mobileVerificationToken, mobileTarget, "mobile")) {
      res.status(400).json({ error: "Mobile OTP verification required" });
      return;
    }
  }
  if (config.requireCaptcha) {
    if (!captchaToken || !verifyCaptchaChallenge(captchaToken, captchaAnswer)) {
      res.status(400).json({ error: "CAPTCHA verification failed" });
      return;
    }
  }

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  let referredBy: number | null = null;
  if (referralCode) {
    const [referrer] = await db.select().from(usersTable).where(eq(usersTable.referralCode, referralCode)).limit(1);
    if (referrer) {
      referredBy = referrer.id;
      await db.update(usersTable)
        .set({ referralCount: (referrer.referralCount || 0) + 1 })
        .where(eq(usersTable.id, referrer.id));
    }
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newReferralCode = generateReferralCode();
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    fullName,
    phone: phone || null,
    referralCode: newReferralCode,
    referredBy,
    kycStatus: config.kycRequired ? "submitted" : "pending",
  }).returning();

  const investorId = generateInvestorId(user.id);
  const bankingEnc = accountNumber
    ? encryptSensitive(JSON.stringify({ accountHolderName, bankName, accountNumber, ifscCode, branchName, upiId }))
    : null;

  await db.insert(userProfilesTable).values({
    userId: user.id,
    username: username?.toLowerCase() || null,
    dateOfBirth: dateOfBirth || null,
    gender: gender || null,
    nationality: nationality || null,
    country: country || null,
    state: state || null,
    city: city || null,
    address: address || null,
    postalCode: postalCode || null,
    taxId: taxId || null,
    occupation: occupation || null,
    annualIncomeRange: annualIncomeRange || null,
    investmentExperience: investmentExperience || null,
    riskAppetite: riskAppetite || null,
    preferredInvestmentType: preferredInvestmentType || null,
    sourceOfFunds: sourceOfFunds || null,
    tradingInterests: tradingInterests || [],
    cryptoWallets: cryptoWallets || {},
    bankingDetailsEnc: bankingEnc,
    securitySettings: securitySettings || {},
    agreementsAccepted: agreements || {},
    investorId,
    onboardingCompletedAt: new Date(),
  });

  await seedPaymentAccountsFromOnboarding(user.id, {
    accountHolderName,
    bankName,
    accountNumber,
    ifscCode,
    branchName,
    upiId,
    cryptoWallets,
  });

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const url = (field: string) => files?.[field]?.[0] ? getUploadUrl("kyc_documents", files[field][0].filename) : null;

  await db.insert(kycRecordsTable).values({
    userId: user.id,
    fullName,
    address: address || "",
    country: country || "",
    panCard: panCard || null,
    aadhaarNumber: aadhaarNumber || null,
    idNumber: passportNumber || aadhaarNumber || null,
    idType: passportNumber ? "passport" : aadhaarNumber ? "national_id" : null,
    taxId: taxId || null,
    bankAccountNumber: accountNumber ? `****${String(accountNumber).slice(-4)}` : null,
    bankName: bankName || null,
    ifscCode: ifscCode || null,
    branchName: branchName || null,
    upiId: upiId || null,
    panDocumentUrl: url("panDocument"),
    aadhaarFrontUrl: url("aadhaarFront"),
    aadhaarBackUrl: url("aadhaarBack"),
    passportDocumentUrl: url("passportDocument"),
    selfieUrl: url("selfie"),
    addressProofUrl: url("addressProof"),
    signatureUrl: url("signature"),
    cancelledChequeUrl: url("cancelledCheque"),
    status: "submitted",
  });

  const mtServices = ["account_handling", "algo_trading", "copy_trading"];
  const wantsMt = Array.isArray(tradingInterests) && tradingInterests.some((s: string) => mtServices.includes(s));
  if (!linkMtLater && mtAccountNumber && mtBroker && mtServer && mtPassword) {
    await linkMtTradingAccount(user.id, {
      accountNumber: String(mtAccountNumber),
      broker: String(mtBroker),
      serverName: String(mtServer),
      platform: mtPlatform === "mt4" ? "mt4" : "mt5",
      tradingPassword: String(mtPassword),
    });
    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "MT4/MT5 Account Submitted",
      message: `Account #${mtAccountNumber} is pending review for ${wantsMt ? "your selected trading services" : "linking"}.`,
      type: "info",
    });
  } else if (wantsMt && linkMtLater) {
    await db.insert(notificationsTable).values({
      userId: user.id,
      title: "Link MT4/MT5 Account",
      message: "Complete MT4/MT5 account linking from MT5 Accounts to activate Account Handling, Algo Trading, or Copy Trading.",
      type: "warning",
    });
  }

  await db.insert(notificationsTable).values({
    userId: user.id,
    title: "Welcome to Kuber Quant",
    message: `Your investor ID is ${investorId}. Complete KYC review is in progress.`,
    type: "info",
  });

  const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
  await sendTransactionalEmail({
    to: user.email,
    purpose: "registration",
    subject: "Welcome to Kuber Quant — Registration Complete",
    html: buildWelcomeEmail({ name: user.fullName, loginUrl: `${appUrl}/login` }),
  });

  const tokens = await issueTokens(user);
  res.status(201).json({
    user: mapUser(user),
    investorId,
    ...tokens,
    message: "Registration complete. KYC review has been initiated.",
  });
});

router.post("/manager/apply", upload.fields([
  { name: "resume", maxCount: 1 },
  { name: "certificate", maxCount: 1 },
  { name: "idProof", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "cancelledCheque", maxCount: 1 },
]), async (req, res) => {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(req.body.data || "{}");
  } catch {
    res.status(400).json({ error: "Invalid application data" });
    return;
  }

  const { fullName, email, password, emailOtpVerified, captchaAnswer, captchaExpected } = payload as Record<string, any>;
  const config = await getOnboardingConfig();
  if (!config.managerRegistrationEnabled) {
    res.status(403).json({ error: "Manager registration is currently disabled" });
    return;
  }
  if (!fullName || !email || !password) {
    res.status(400).json({ error: "fullName, email, password are required" });
    return;
  }
  if (config.requireEmailOtp && !emailOtpVerified) {
    res.status(400).json({ error: "Email OTP verification required" });
    return;
  }
  if (config.requireCaptcha && captchaAnswer !== captchaExpected) {
    res.status(400).json({ error: "CAPTCHA verification failed" });
    return;
  }

  const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existingUser) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [pending] = await db.select().from(managerApplicationsTable)
    .where(eq(managerApplicationsTable.applicantEmail, email.toLowerCase())).limit(1);
  if (pending && pending.status === "pending") {
    res.status(400).json({ error: "Application already submitted and pending review" });
    return;
  }

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const url = (field: string) => files?.[field]?.[0] ? getUploadUrl("kyc_documents", files[field][0].filename) : null;

  const data = {
    ...payload,
    passwordHash: await bcrypt.hash(password, 10),
    documents: {
      resume: url("resume"),
      certificate: url("certificate"),
      idProof: url("idProof"),
      selfie: url("selfie"),
      addressProof: url("addressProof"),
      cancelledCheque: url("cancelledCheque"),
    },
    submittedAt: new Date().toISOString(),
    ipAddress: req.ip,
    userAgent: req.headers["user-agent"],
  };
  delete (data as any).password;

  const [app] = await db.insert(managerApplicationsTable).values({
    applicantEmail: email.toLowerCase(),
    fullName,
    data,
    status: "pending",
  }).returning();

  res.status(201).json({
    applicationId: app.id,
    status: "pending",
    message: "Manager application submitted. Super Admin will review your documents.",
  });
});

router.get("/manager/applications", requireAuth, requireAdmin, async (_req, res) => {
  const apps = await db.select().from(managerApplicationsTable).orderBy(desc(managerApplicationsTable.createdAt));
  res.json(apps.map(a => ({
    id: a.id,
    applicantEmail: a.applicantEmail,
    fullName: a.fullName,
    status: a.status,
    data: a.data,
    reviewedBy: a.reviewedBy,
    reviewNotes: a.reviewNotes,
    userId: a.userId,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.post("/manager/applications/:id/review", requireAuth, requireSuperAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { action, reviewNotes, permissionLevel, assignedRegion } = req.body;
  const reviewerId = (req as any).user.userId;

  const [app] = await db.select().from(managerApplicationsTable).where(eq(managerApplicationsTable.id, id)).limit(1);
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  if (app.status !== "pending") {
    res.status(400).json({ error: "Application already reviewed" });
    return;
  }

  if (action === "reject") {
    const [updated] = await db.update(managerApplicationsTable)
      .set({ status: "rejected", reviewedBy: reviewerId, reviewNotes: reviewNotes || null, updatedAt: new Date() })
      .where(eq(managerApplicationsTable.id, id))
      .returning();
    res.json({ application: updated, message: "Application rejected" });
    return;
  }

  if (action !== "approve") {
    res.status(400).json({ error: "action must be approve or reject" });
    return;
  }

  const appData = app.data as Record<string, any>;
  const passwordHash = appData.passwordHash;
  if (!passwordHash) {
    res.status(400).json({ error: "Invalid application data — missing credentials" });
    return;
  }

  const newReferralCode = generateReferralCode();
  const [user] = await db.insert(usersTable).values({
    email: app.applicantEmail,
    passwordHash,
    fullName: app.fullName,
    phone: appData.phone || null,
    role: "manager",
    referralCode: newReferralCode,
  }).returning();

  await db.insert(userProfilesTable).values({
    userId: user.id,
    username: appData.username?.toLowerCase() || null,
    country: appData.country || null,
    securitySettings: { permissionLevel, assignedRegion, ...appData.rolePermissions },
    onboardingCompletedAt: new Date(),
  });

  const [updated] = await db.update(managerApplicationsTable)
    .set({
      status: "approved",
      reviewedBy: reviewerId,
      reviewNotes: reviewNotes || null,
      userId: user.id,
      updatedAt: new Date(),
    })
    .where(eq(managerApplicationsTable.id, id))
    .returning();

  const appUrl = process.env.APP_URL || "http://127.0.0.1:3000";
  await sendTransactionalEmail({
    to: user.email,
    purpose: "registration",
    subject: "Kuber Quant — Manager Application Approved",
    html: buildWelcomeEmail({ name: user.fullName, loginUrl: `${appUrl}/login` }),
  });

  res.json({ application: updated, userId: user.id, message: "Manager approved and account created" });
});

export default router;
