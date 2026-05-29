import { db, usersTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

/** Resolve a referral code to the referrer user id (case-insensitive). */
export async function resolveReferrerId(referralCode?: string | null): Promise<number | null> {
  const code = referralCode?.trim().toUpperCase();
  if (!code) return null;
  const [referrer] = await db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.referralCode, code))
    .limit(1);
  return referrer?.id ?? null;
}

/**
 * Attach a new user to their referrer and increment referral count.
 * Returns referrer id when applied, null otherwise.
 */
export async function applyReferralAttribution(
  referralCode: string | null | undefined,
  newUserId: number,
): Promise<number | null> {
  const referrerId = await resolveReferrerId(referralCode);
  if (!referrerId || referrerId === newUserId) return null;

  const [referrer] = await db.select()
    .from(usersTable)
    .where(eq(usersTable.id, referrerId))
    .limit(1);
  if (!referrer) return null;

  await db.update(usersTable)
    .set({ referredBy: referrerId })
    .where(eq(usersTable.id, newUserId));

  await db.update(usersTable)
    .set({ referralCount: (referrer.referralCount || 0) + 1 })
    .where(eq(usersTable.id, referrerId));

  return referrerId;
}
