import { db, siteSettingsTable, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { WalletError } from "./walletService";
import { checkKycReverification } from "./kycReverificationService";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

/** Enforce KYC including periodic re-verification before financial actions. */
export async function assertKycVerified(userId: number): Promise<void> {
  const kycRequired = await getSetting("kyc_required", "true");
  if (kycRequired !== "true") return;

  await checkKycReverification(userId);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user && user.kycStatus !== "verified") {
    throw new WalletError("KYC verification required", "KYC_REQUIRED");
  }
}
