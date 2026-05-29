import { db, kycRecordsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq, and, lt, isNotNull } from "@workspace/db/orm";
import { notifyUser } from "./notificationService";
import { logger } from "../lib/logger";

async function getReverifyMonths(): Promise<number> {
  const [row] = await db.select().from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "kyc_reverify_months")).limit(1);
  const n = Number(row?.value ?? "12");
  return Number.isFinite(n) && n > 0 ? n : 12;
}

export async function checkKycReverification(userId: number): Promise<boolean> {
  const months = await getReverifyMonths();
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);

  const [kyc] = await db.select().from(kycRecordsTable)
    .where(and(
      eq(kycRecordsTable.userId, userId),
      eq(kycRecordsTable.status, "verified"),
      isNotNull(kycRecordsTable.verifiedAt),
      lt(kycRecordsTable.verifiedAt, cutoff),
    ))
    .limit(1);

  if (!kyc) return false;

  await db.update(kycRecordsTable)
    .set({ status: "submitted", verifiedAt: null })
    .where(eq(kycRecordsTable.id, kyc.id));
  await db.update(usersTable)
    .set({ kycStatus: "submitted" })
    .where(eq(usersTable.id, userId));

  await notifyUser({
    userId,
    title: "KYC re-verification required",
    message: `Your identity verification is over ${months} months old. Please update your KYC documents to continue withdrawals.`,
    type: "warning",
    category: "kyc",
    actionUrl: "/kyc",
  }).catch(() => {});

  logger.info({ userId, kycId: kyc.id, months }, "KYC re-verification triggered");
  return true;
}

export async function runKycReverificationSweep(): Promise<number> {
  const months = await getReverifyMonths();
  const cutoff = new Date();
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months);

  const expired = await db.select({ userId: kycRecordsTable.userId })
    .from(kycRecordsTable)
    .where(and(
      eq(kycRecordsTable.status, "verified"),
      isNotNull(kycRecordsTable.verifiedAt),
      lt(kycRecordsTable.verifiedAt, cutoff),
    ))
    .limit(200);

  let count = 0;
  for (const row of expired) {
    const triggered = await checkKycReverification(row.userId);
    if (triggered) count += 1;
  }
  return count;
}
