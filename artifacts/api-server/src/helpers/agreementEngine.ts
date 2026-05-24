import { createHash, randomBytes } from "crypto";
import {
  db, agreementsTable, agreementTemplatesTable, agreementSignaturesTable, agreementEventsTable,
  usersTable, kycRecordsTable, investmentsTable, eaSubscriptionsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { generateAgreementPDF } from "./pdfGenerator";
import { getDefaultTemplate } from "./agreementTemplates";

export async function generateAgreementUid(): Promise<string> {
  const year = new Date().getFullYear();
  const [latest] = await db
    .select({ id: agreementsTable.id })
    .from(agreementsTable)
    .orderBy(desc(agreementsTable.id))
    .limit(1);
  const seq = (latest?.id ?? 0) + 1;
  return `KQ-AGR-${year}-${String(seq).padStart(5, "0")}`;
}

export interface GenerateAgreementOpts {
  userId: number;
  type: string;
  triggerEvent?: string;
  triggerEntityId?: number;
  ipAddress?: string;
  userAgent?: string;
  extraData?: Record<string, string>;
}

export async function generateAgreement(opts: GenerateAgreementOpts): Promise<{ id: number; agreementUid: string }> {
  const { userId, type, triggerEvent, triggerEntityId, ipAddress, userAgent, extraData = {} } = opts;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .orderBy(desc(kycRecordsTable.id))
    .limit(1)
    .catch(() => [undefined] as [undefined]);

  let investment: any = null;
  let eaSub: any = null;
  if (triggerEntityId) {
    if (["investment", "profit_sharing"].includes(type)) {
      const rows = await db.select().from(investmentsTable).where(eq(investmentsTable.id, triggerEntityId)).limit(1).catch(() => []);
      investment = rows[0] ?? null;
    }
    if (type === "ea_subscription") {
      const rows = await db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.id, triggerEntityId)).limit(1).catch(() => []);
      eaSub = rows[0] ?? null;
    }
  }

  const now = new Date();
  const agreementDate = now.toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
  const agreementUid = await generateAgreementUid();

  const deviceInfo = (() => {
    if (!userAgent) return "Unknown";
    const mobile = /Mobile/.test(userAgent);
    const browser = userAgent.includes("Chrome") ? "Chrome"
      : userAgent.includes("Firefox") ? "Firefox"
      : userAgent.includes("Safari") ? "Safari"
      : "Other";
    return `${mobile ? "Mobile" : "Desktop"} / ${browser}`;
  })();

  const investorId = `KQ-${String(user.id).padStart(6, "0")}`;

  // EA subscription expiry in days
  const eaExpiryDate = eaSub?.expiresAt
    ? new Date(eaSub.expiresAt).toLocaleDateString("en-IN")
    : extraData["EXPIRY_DATE"] || "—";
  const eaDaysRemaining = eaSub?.expiresAt
    ? String(Math.max(0, Math.ceil((new Date(eaSub.expiresAt).getTime() - now.getTime()) / 86400000)))
    : extraData["SUBSCRIPTION_DAYS"] || "30";

  const filledData: Record<string, string> = {
    // User
    FULL_NAME: user.fullName || "—",
    EMAIL: user.email || "—",
    INVESTOR_ID: investorId,
    MOBILE: user.phone || "—",
    KYC_STATUS: user.kycStatus?.toUpperCase() || "PENDING",
    // KYC fields
    FATHER_NAME: "—",
    PAN_NUMBER: kyc?.panCard || "—",
    AADHAAR_NUMBER: kyc?.aadhaarNumber ? `XXXX-XXXX-${String(kyc.aadhaarNumber).slice(-4)}` : "—",
    PASSPORT_NUMBER: kyc?.idType === "passport" ? kyc.idNumber || "—" : "—",
    ADDRESS: kyc?.address || "—",
    KYC_DOCUMENTS: kyc ? `${kyc.idType || "ID"}, Address Proof` : "Not submitted",
    KYC_DATE: kyc?.updatedAt ? new Date(kyc.updatedAt).toLocaleDateString("en-IN") : "—",
    BANK_ACCOUNT: kyc?.bankAccountNumber ? `XXXX${String(kyc.bankAccountNumber).slice(-4)}` : "—",
    BANK_NAME: kyc?.bankName || "—",
    IFSC_CODE: kyc?.ifscCode || "—",
    // Agreement meta
    AGREEMENT_DATE: agreementDate,
    AGREEMENT_UID: agreementUid,
    AGREEMENT_STATUS: "PENDING SIGNATURE",
    IP_ADDRESS: ipAddress || "—",
    DEVICE_INFO: deviceInfo,
    PDF_HASH: "Computed upon generation",
    // Investment fields
    PLAN_NAME: investment?.planName || extraData["PLAN_NAME"] || "—",
    INVESTMENT_AMOUNT: investment?.amount ? `$${Number(investment.amount).toLocaleString()}` : extraData["INVESTMENT_AMOUNT"] || "—",
    CURRENCY: investment?.currency || extraData["CURRENCY"] || "USD",
    ROI_RATE: extraData["ROI_RATE"] || "—",
    DURATION: extraData["DURATION"] || "—",
    START_DATE: investment?.createdAt ? new Date(investment.createdAt).toLocaleDateString("en-IN") : extraData["START_DATE"] || agreementDate,
    MATURITY_DATE: extraData["MATURITY_DATE"] || "—",
    TRANSACTION_ID: extraData["TRANSACTION_ID"] || "—",
    WALLET_ADDRESS: extraData["WALLET_ADDRESS"] || "—",
    PROFIT_SHARING: extraData["PROFIT_SHARING"] || "30",
    INVESTOR_SHARE: extraData["INVESTOR_SHARE"] || "70",
    // EA Subscription
    EA_NAME: eaSub?.catalogStrategyId ? `Strategy #${eaSub.catalogStrategyId}` : extraData["EA_NAME"] || "—",
    EA_PLAN: eaSub?.plan || extraData["EA_PLAN"] || "—",
    LICENSE_KEY: eaSub?.licenseKey || extraData["LICENSE_KEY"] || "—",
    MT_ACCOUNT: eaSub?.mtAccountNumber || extraData["MT_ACCOUNT"] || "—",
    MT_PLATFORM: eaSub?.mtPlatform?.toUpperCase() || extraData["MT_PLATFORM"] || "MT5",
    BROKER_SERVER: extraData["BROKER_SERVER"] || "—",
    SUBSCRIPTION_DAYS: eaDaysRemaining,
    EXPIRY_DATE: eaExpiryDate,
    SUBSCRIPTION_FEE: extraData["SUBSCRIPTION_FEE"] || "—",
    // Copy trading
    TRADER_NAME: extraData["TRADER_NAME"] || "—",
    COPY_RATIO: extraData["COPY_RATIO"] || "1:1",
    // Override with caller data last
    ...extraData,
  };

  const template = getDefaultTemplate(type) || getDefaultTemplate("terms_conditions")!;
  const contentHash = createHash("sha256")
    .update(JSON.stringify(filledData) + agreementUid)
    .digest("hex");
  filledData["PDF_HASH"] = contentHash.slice(0, 40) + "...";

  const [agreement] = await db.insert(agreementsTable).values({
    agreementUid,
    userId,
    type: type as any,
    status: "pending_signature",
    filledData,
    pdfHash: contentHash,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    deviceInfo,
    agreementDate,
    triggerEvent: triggerEvent || null,
    triggerEntityId: triggerEntityId || null,
  }).returning();

  await db.insert(agreementEventsTable).values({
    agreementId: agreement.id,
    event: "generated",
    userId,
    ipAddress: ipAddress || null,
    metadata: { type, triggerEvent },
  }).catch(() => {});

  return { id: agreement.id, agreementUid };
}

export async function signAgreement(opts: {
  agreementId: number;
  userId: number;
  signatureData?: string;
  method?: "draw" | "otp" | "checkbox";
  ipAddress?: string;
  userAgent?: string;
}): Promise<{ pdfBuffer: Buffer; pdfHash: string }> {
  const { agreementId, userId, signatureData, method = "draw", ipAddress, userAgent } = opts;

  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, agreementId)).limit(1);
  if (!agreement) throw new Error("Agreement not found");
  if (agreement.userId !== userId) throw new Error("Unauthorized");
  if (agreement.status === "signed") throw new Error("Agreement already signed");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const now = new Date();
  const verificationHash = createHash("sha256")
    .update(`${agreement.agreementUid}|${userId}|${now.toISOString()}|${randomBytes(8).toString("hex")}`)
    .digest("hex");

  const template = getDefaultTemplate(agreement.type) || getDefaultTemplate("terms_conditions")!;
  const filledData = { ...((agreement.filledData as Record<string, string>) || {}) };
  filledData["AGREEMENT_STATUS"] = "SIGNED";
  filledData["PDF_HASH"] = verificationHash.slice(0, 40) + "...";

  const { buffer, hash } = await generateAgreementPDF({
    template,
    filledData,
    agreementUid: agreement.agreementUid,
    userName: user?.fullName || "Investor",
    signatureBase64: signatureData,
  });

  await db.insert(agreementSignaturesTable).values({
    agreementId,
    signatureData: signatureData || null,
    method,
    signerName: user?.fullName || null,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    verificationHash,
  });

  await db.update(agreementsTable)
    .set({ status: "signed", signedAt: now, pdfHash: hash, filledData, updatedAt: now })
    .where(eq(agreementsTable.id, agreementId));

  await db.insert(agreementEventsTable).values({
    agreementId,
    event: "signed",
    userId,
    ipAddress: ipAddress || null,
    metadata: { method, verificationHash: verificationHash.slice(0, 20) },
  }).catch(() => {});

  return { pdfBuffer: buffer, pdfHash: hash };
}

export async function getAgreementPDF(agreementId: number, requesterId: number, isAdmin = false): Promise<Buffer> {
  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, agreementId)).limit(1);
  if (!agreement) throw new Error("Agreement not found");
  if (!isAdmin && agreement.userId !== requesterId) throw new Error("Unauthorized");

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, agreement.userId)).limit(1);
  const template = getDefaultTemplate(agreement.type) || getDefaultTemplate("terms_conditions")!;
  const filledData = { ...((agreement.filledData as Record<string, string>) || {}) };

  const [signature] = await db.select().from(agreementSignaturesTable)
    .where(eq(agreementSignaturesTable.agreementId, agreementId))
    .orderBy(desc(agreementSignaturesTable.signedAt))
    .limit(1).catch(() => [undefined] as [undefined]);

  await db.insert(agreementEventsTable).values({
    agreementId,
    event: "downloaded",
    userId: requesterId,
    ipAddress: null,
    metadata: null,
  }).catch(() => {});

  const { buffer } = await generateAgreementPDF({
    template,
    filledData,
    agreementUid: agreement.agreementUid,
    userName: user?.fullName || "Investor",
    signatureBase64: signature?.signatureData || undefined,
  });

  return buffer;
}
