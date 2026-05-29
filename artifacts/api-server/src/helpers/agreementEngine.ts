import { createHash, randomBytes } from "crypto";
import {
  db, agreementsTable, agreementSignaturesTable, agreementEventsTable, agreementTemplatesTable,
  usersTable, kycRecordsTable, investmentsTable, eaSubscriptionsTable,
  investmentPlansTable, mt5RequestsTable, copyFollowsTable, copyTradersTable,
  algoSubscriptionsTable, algoStrategiesTable, userProfilesTable,
  userPaymentAccountsTable, mt5AccountsTable,
} from "@workspace/db";
import { eq, desc, and } from "@workspace/db/orm";
import { generateAgreementPDF } from "./pdfGenerator";
import { decryptSensitive } from "./encryption";
import { buildUserCollectedPlaceholders } from "./userDataPlaceholders";
import {
  getDefaultTemplate,
  dbTemplateToContent,
  fillTemplatePlaceholders,
  type AgreementTemplateContent,
} from "./agreementTemplates";

async function resolveTemplate(type: string): Promise<{ content: AgreementTemplateContent; templateId: number | null }> {
  const [dbTpl] = await db.select().from(agreementTemplatesTable)
    .where(and(eq(agreementTemplatesTable.type, type as any), eq(agreementTemplatesTable.isActive, true)))
    .orderBy(desc(agreementTemplatesTable.updatedAt))
    .limit(1);
  if (dbTpl) return { content: dbTemplateToContent(dbTpl), templateId: dbTpl.id };
  const content = getDefaultTemplate(type) || getDefaultTemplate("terms_conditions")!;
  return { content, templateId: null };
}

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

export function parseMt5RelayDetails(details: string | null | undefined): {
  platform: string;
  broker: string;
  server: string;
  notes: string;
} {
  if (!details?.trim()) {
    return { platform: "—", broker: "—", server: "—", notes: "—" };
  }
  const platform = details.match(/Platform:\s*([^|]+)/i)?.[1]?.trim() || "—";
  const broker = details.match(/Broker:\s*([^|]+)/i)?.[1]?.trim() || "—";
  const server = details.match(/Server:\s*([^|]+)/i)?.[1]?.trim() || "—";
  let notes = details
    .replace(/Platform:\s*[^|]+\s*\|?\s*/i, "")
    .replace(/Broker:\s*[^|]+\s*\|?\s*/i, "")
    .replace(/Server:\s*[^|]+\s*\|?\s*/i, "")
    .trim();
  if (!notes) notes = "—";
  return { platform, broker, server, notes };
}

function fmtMoney(amount: unknown, currency = "USD"): string {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "—";
  return `${currency === "USD" ? "$" : ""}${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${currency !== "USD" ? ` ${currency}` : ""}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" });
}

export async function buildAgreementFilledData(opts: GenerateAgreementOpts): Promise<Record<string, string>> {
  const { userId, type, triggerEvent, triggerEntityId, ipAddress, userAgent, extraData = {} } = opts;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .orderBy(desc(kycRecordsTable.id))
    .limit(1)
    .catch(() => [undefined] as [undefined]);

  const [profile] = await db.select().from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId))
    .limit(1)
    .catch(() => [undefined] as [undefined]);

  const paymentAccounts = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))
    .catch(() => [] as typeof userPaymentAccountsTable.$inferSelect[]);

  const [linkedMtAccount] = await db.select().from(mt5AccountsTable)
    .where(eq(mt5AccountsTable.userId, userId))
    .orderBy(desc(mt5AccountsTable.updatedAt))
    .limit(1)
    .catch(() => [undefined] as [undefined]);

  let bankingFromEnc: Record<string, string> = {};
  if (profile?.bankingDetailsEnc) {
    try {
      bankingFromEnc = JSON.parse(decryptSensitive(profile.bankingDetailsEnc));
    } catch { /* ignore corrupt enc */ }
  }

  let investment: typeof investmentsTable.$inferSelect | null = null;
  let plan: typeof investmentPlansTable.$inferSelect | null = null;
  let eaSub: typeof eaSubscriptionsTable.$inferSelect | null = null;
  let mt5Req: typeof mt5RequestsTable.$inferSelect | null = null;
  let copyFollow: typeof copyFollowsTable.$inferSelect | null = null;
  let copyTrader: typeof copyTradersTable.$inferSelect | null = null;
  let algoSub: typeof algoSubscriptionsTable.$inferSelect | null = null;
  let algoStrategy: typeof algoStrategiesTable.$inferSelect | null = null;

  if (triggerEntityId) {
    if (["investment", "profit_sharing"].includes(type)) {
      const rows = await db.select().from(investmentsTable).where(eq(investmentsTable.id, triggerEntityId)).limit(1).catch(() => []);
      investment = rows[0] ?? null;
    }
    if (type === "ea_subscription") {
      const rows = await db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.id, triggerEntityId)).limit(1).catch(() => []);
      eaSub = rows[0] ?? null;
    }
    if (type === "copy_trading") {
      const rows = await db.select().from(copyFollowsTable).where(eq(copyFollowsTable.id, triggerEntityId)).limit(1).catch(() => []);
      copyFollow = rows[0] ?? null;
      if (!copyFollow) {
        const mt5Rows = await db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.id, triggerEntityId)).limit(1).catch(() => []);
        mt5Req = mt5Rows[0] ?? null;
      }
    }
    if (type === "account_handling") {
      const rows = await db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.id, triggerEntityId)).limit(1).catch(() => []);
      mt5Req = rows[0] ?? null;
    }
    if (type === "algo_trading") {
      const rows = await db.select().from(algoSubscriptionsTable).where(eq(algoSubscriptionsTable.id, triggerEntityId)).limit(1).catch(() => []);
      algoSub = rows[0] ?? null;
    }
  }

  // Fallback: latest user submission when no entity id
  if (!investment && ["investment", "profit_sharing"].includes(type)) {
    const rows = await db.select().from(investmentsTable)
      .where(eq(investmentsTable.userId, userId))
      .orderBy(desc(investmentsTable.id))
      .limit(1)
      .catch(() => []);
    investment = rows[0] ?? null;
  }
  if (!copyFollow && type === "copy_trading") {
    const rows = await db.select().from(copyFollowsTable)
      .where(and(eq(copyFollowsTable.userId, userId), eq(copyFollowsTable.active, true)))
      .orderBy(desc(copyFollowsTable.id))
      .limit(1)
      .catch(() => []);
    copyFollow = rows[0] ?? null;
  }
  if (!mt5Req && (type === "copy_trading" || type === "account_handling")) {
    const reqType = type === "account_handling" ? "account_handling" : "copy_trading";
    const rows = await db.select().from(mt5RequestsTable)
      .where(and(eq(mt5RequestsTable.userId, userId), eq(mt5RequestsTable.type, reqType)))
      .orderBy(desc(mt5RequestsTable.id))
      .limit(1)
      .catch(() => []);
    mt5Req = rows[0] ?? null;
  }
  if (!algoSub && type === "algo_trading") {
    const rows = await db.select().from(algoSubscriptionsTable)
      .where(and(eq(algoSubscriptionsTable.userId, userId), eq(algoSubscriptionsTable.active, true)))
      .orderBy(desc(algoSubscriptionsTable.id))
      .limit(1)
      .catch(() => []);
    algoSub = rows[0] ?? null;
  }

  if (investment?.planName) {
    const rows = await db.select().from(investmentPlansTable)
      .where(eq(investmentPlansTable.name, investment.planName))
      .limit(1)
      .catch(() => []);
    plan = rows[0] ?? null;
  }

  if (copyFollow) {
    const rows = await db.select().from(copyTradersTable)
      .where(eq(copyTradersTable.id, copyFollow.traderId))
      .limit(1)
      .catch(() => []);
    copyTrader = rows[0] ?? null;
  }

  if (algoSub) {
    const rows = await db.select().from(algoStrategiesTable)
      .where(eq(algoStrategiesTable.id, algoSub.strategyId))
      .limit(1)
      .catch(() => []);
    algoStrategy = rows[0] ?? null;
  }

  const mt5Parsed = parseMt5RelayDetails(mt5Req?.details);
  const mt5Account = mt5Req?.mt5AccountId ? String(mt5Req.mt5AccountId) : "—";
  const profitShare = mt5Req?.profitSharingPercent ?? copyFollow?.profitSharingPercent ?? 30;
  const investorShare = 100 - profitShare;

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

  const eaExpiryDate = eaSub?.expiresAt
    ? fmtDate(eaSub.expiresAt)
    : extraData["EXPIRY_DATE"] || "—";
  const eaDaysRemaining = eaSub?.expiresAt
    ? String(Math.max(0, Math.ceil((new Date(eaSub.expiresAt).getTime() - now.getTime()) / 86400000)))
    : extraData["SUBSCRIPTION_DAYS"] || "30";

  const invCurrency = investment?.currency || plan?.currency || extraData["CURRENCY"] || "USD";
  const roiRate = plan?.roiPercent
    ? String(Number(plan.roiPercent))
    : investment?.profitPercent
      ? String(Number(investment.profitPercent))
      : extraData["ROI_RATE"] || "—";
  const durationDays = plan?.durationDays
    ? String(plan.durationDays)
    : investment?.maturityDate && investment?.createdAt
      ? String(Math.max(1, Math.ceil((new Date(investment.maturityDate).getTime() - new Date(investment.createdAt).getTime()) / 86400000)))
      : extraData["DURATION"] || "—";

  const userData = buildUserCollectedPlaceholders({
    user,
    profile,
    kyc,
    paymentAccounts,
    mt5Account: linkedMtAccount,
    bankingFromEnc,
  });

  const defaultCryptoWallet = paymentAccounts.find(a => a.accountType === "crypto" && a.walletAddress)?.walletAddress || "—";

  const filledData: Record<string, string> = {
    ...userData,
    FATHER_NAME: extraData["FATHER_NAME"] || userData.FATHER_NAME,
    AGREEMENT_DATE: agreementDate,
    AGREEMENT_UID: agreementUid,
    AGREEMENT_STATUS: "PENDING SIGNATURE",
    IP_ADDRESS: ipAddress || "—",
    DEVICE_INFO: deviceInfo,
    PDF_HASH: "Computed upon generation",
    PLAN_NAME: plan?.name || investment?.planName || extraData["PLAN_NAME"] || "—",
    PLAN_CATEGORY: plan?.category?.toUpperCase() || extraData["PLAN_CATEGORY"] || "—",
    PLAN_TYPE: plan?.planType?.replace(/_/g, " ").toUpperCase() || extraData["PLAN_TYPE"] || "—",
    INVESTMENT_TYPE: investment?.type?.toUpperCase() || extraData["INVESTMENT_TYPE"] || "—",
    INVESTMENT_AMOUNT: investment ? fmtMoney(investment.amount, invCurrency) : extraData["INVESTMENT_AMOUNT"] || "—",
    CURRENCY: invCurrency,
    ROI_RATE: roiRate,
    DURATION: durationDays,
    START_DATE: investment?.createdAt ? fmtDate(investment.createdAt) : extraData["START_DATE"] || agreementDate,
    MATURITY_DATE: investment?.maturityDate ? fmtDate(investment.maturityDate) : extraData["MATURITY_DATE"] || "—",
    TRANSACTION_ID: extraData["TRANSACTION_ID"] || (investment ? `INV-${investment.id}` : "—"),
    WALLET_ADDRESS: extraData["WALLET_ADDRESS"] || defaultCryptoWallet,
    PROFIT_SHARING: String(profitShare),
    INVESTOR_SHARE: String(investorShare),
    EA_NAME: eaSub?.strategyId ? `Strategy #${eaSub.strategyId}` : extraData["EA_NAME"] || "—",
    EA_PLAN: eaSub?.plan || extraData["EA_PLAN"] || "—",
    LICENSE_KEY: eaSub?.licenseKey || extraData["LICENSE_KEY"] || "—",
    MT_ACCOUNT: mt5Account !== "—" ? mt5Account : (linkedMtAccount?.accountNumber || eaSub?.mtAccountNumber || extraData["MT_ACCOUNT"] || "—"),
    MT_PLATFORM: mt5Parsed.platform !== "—"
      ? mt5Parsed.platform.toUpperCase()
      : (linkedMtAccount?.platform?.toUpperCase() || eaSub?.mtPlatform?.toUpperCase() || extraData["MT_PLATFORM"] || "MT5"),
    BROKER_SERVER: mt5Parsed.server !== "—"
      ? `${mt5Parsed.broker !== "—" ? mt5Parsed.broker + " / " : ""}${mt5Parsed.server}`
      : (linkedMtAccount?.broker && linkedMtAccount?.serverName
        ? `${linkedMtAccount.broker} / ${linkedMtAccount.serverName}`
        : linkedMtAccount?.broker || (mt5Parsed.broker !== "—" ? mt5Parsed.broker : extraData["BROKER_SERVER"] || "—")),
    MT_BROKER: linkedMtAccount?.broker || (mt5Parsed.broker !== "—" ? mt5Parsed.broker : userData.MT_BROKER),
    MT_SERVER: linkedMtAccount?.serverName || (mt5Parsed.server !== "—" ? mt5Parsed.server : userData.MT_SERVER),
    SUBSCRIPTION_DAYS: eaDaysRemaining,
    EXPIRY_DATE: eaExpiryDate,
    SUBSCRIPTION_FEE: extraData["SUBSCRIPTION_FEE"] || "—",
    TRADER_NAME: copyTrader?.name || extraData["TRADER_NAME"] || "—",
    TRADER_ROI: copyTrader ? `${Number(copyTrader.roi).toFixed(2)}%` : extraData["TRADER_ROI"] || "—",
    TRADER_RISK: copyTrader?.riskLevel?.toUpperCase() || extraData["TRADER_RISK"] || "—",
    COPY_RATIO: extraData["COPY_RATIO"] || "1:1",
    COPY_AMOUNT: copyFollow ? fmtMoney(copyFollow.amount, copyFollow.currency) : extraData["COPY_AMOUNT"] || "—",
    REQUEST_DETAILS: mt5Parsed.notes,
    REQUEST_STATUS: mt5Req?.status?.toUpperCase() || extraData["REQUEST_STATUS"] || "—",
    ALGO_STRATEGY: algoStrategy?.name || extraData["ALGO_STRATEGY"] || "—",
    ALGO_DESCRIPTION: algoStrategy?.description || extraData["ALGO_DESCRIPTION"] || "—",
    ALGO_RISK: algoStrategy?.riskLevel?.toUpperCase() || extraData["ALGO_RISK"] || "—",
    ALGO_ROI: algoStrategy ? `${Number(algoStrategy.roi).toFixed(2)}%` : extraData["ALGO_ROI"] || "—",
    ALGO_AMOUNT: algoSub ? fmtMoney(algoSub.amount, algoSub.currency) : extraData["ALGO_AMOUNT"] || "—",
    ALGO_SUBSCRIPTION_DATE: algoSub?.createdAt ? fmtDate(algoSub.createdAt) : extraData["ALGO_SUBSCRIPTION_DATE"] || agreementDate,
    ...extraData,
  };

  return filledData;
}

export async function previewTemplateContent(opts: {
  userId: number;
  type: string;
  title: string;
  content: string;
  triggerEntityId?: number;
  ipAddress?: string;
  userAgent?: string;
  extraData?: Record<string, string>;
}) {
  const filledData = await buildAgreementFilledData({
    userId: opts.userId,
    type: opts.type,
    triggerEvent: "preview",
    triggerEntityId: opts.triggerEntityId,
    ipAddress: opts.ipAddress,
    userAgent: opts.userAgent,
    extraData: opts.extraData,
  });
  return {
    filledData,
    filledTitle: fillTemplatePlaceholders(opts.title, filledData),
    filledContent: fillTemplatePlaceholders(opts.content, filledData),
  };
}

export async function generateAgreement(opts: GenerateAgreementOpts): Promise<{ id: number; agreementUid: string }> {
  const { userId, type, triggerEvent, triggerEntityId, ipAddress, userAgent } = opts;
  const filledData = await buildAgreementFilledData(opts);
  const agreementUid = filledData.AGREEMENT_UID;
  const { templateId } = await resolveTemplate(type);
  const contentHash = createHash("sha256")
    .update(JSON.stringify(filledData) + agreementUid)
    .digest("hex");
  filledData["PDF_HASH"] = contentHash.slice(0, 40) + "...";

  const [agreement] = await db.insert(agreementsTable).values({
    agreementUid,
    userId,
    templateId,
    type: type as any,
    status: "pending_signature",
    filledData,
    pdfHash: contentHash,
    ipAddress: ipAddress || null,
    userAgent: userAgent || null,
    deviceInfo: filledData.DEVICE_INFO,
    agreementDate: filledData.AGREEMENT_DATE,
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

  const { content: template } = await resolveTemplate(agreement.type);
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
  const { content: template } = await resolveTemplate(agreement.type);
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
