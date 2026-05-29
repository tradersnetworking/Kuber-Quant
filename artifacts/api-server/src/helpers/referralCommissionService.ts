import { db, usersTable, referralEarningsTable, siteSettingsTable } from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import { notifyUser } from "./notificationService";
import { logger } from "../lib/logger";

export type ReferralCommissionEvent = "deposit" | "investment" | "roi_payout";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

function resolveCommissionRatePercent(
  baseRatePct: number,
  commissionType: string | null,
  event: ReferralCommissionEvent,
  level: number,
): number {
  if (level === 2) return baseRatePct * 0.25;

  switch (commissionType) {
    case "cpa":
      return event === "deposit" ? baseRatePct : 0;
    case "hybrid":
      if (event === "deposit") return baseRatePct;
      if (event === "investment") return baseRatePct * 0.5;
      return baseRatePct * 0.25;
    case "multi_level":
    case "revenue_share":
    default:
      return baseRatePct;
  }
}

async function getReferrerChain(userId: number): Promise<Array<{
  referrerId: number;
  level: number;
  isPromoter: boolean;
  commissionType: string | null;
}>> {
  const chain: Array<{
    referrerId: number;
    level: number;
    isPromoter: boolean;
    commissionType: string | null;
  }> = [];
  let currentId = userId;

  for (let level = 1; level <= 2; level++) {
    const [user] = await db.select({ referredBy: usersTable.referredBy })
      .from(usersTable).where(eq(usersTable.id, currentId)).limit(1);
    if (!user?.referredBy) break;

    const [referrer] = await db.select({
      id: usersTable.id,
      isPromoter: usersTable.isPromoter,
      promoterCommissionType: usersTable.promoterCommissionType,
    }).from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1);
    if (!referrer) break;

    chain.push({
      referrerId: referrer.id,
      level,
      isPromoter: referrer.isPromoter ?? false,
      commissionType: referrer.promoterCommissionType,
    });
    currentId = referrer.id;
  }

  return chain;
}

/**
 * Accrue referral commission for a referred user's financial event.
 */
export async function accrueReferralCommission(opts: {
  referredUserId: number;
  event: ReferralCommissionEvent;
  baseAmountUsd: number;
  referenceId?: number;
}): Promise<void> {
  if (opts.baseAmountUsd <= 0) return;

  const baseRatePct = Number(await getSetting("referral_commission_rate", "5"));
  if (baseRatePct <= 0) return;

  const referrers = await getReferrerChain(opts.referredUserId);
  if (referrers.length === 0) return;

  for (const ref of referrers) {
    const commissionType = ref.isPromoter ? ref.commissionType : null;
    const ratePct = resolveCommissionRatePercent(baseRatePct, commissionType, opts.event, ref.level);
    if (ratePct <= 0) continue;

    const commission = parseFloat((opts.baseAmountUsd * (ratePct / 100)).toFixed(2));
    if (commission <= 0) continue;

    await db.insert(referralEarningsTable).values({
      referrerId: ref.referrerId,
      referredUserId: opts.referredUserId,
      amount: String(commission),
      currency: "USD",
      status: "pending",
    });

    const [referrerUser] = await db.select().from(usersTable).where(eq(usersTable.id, ref.referrerId)).limit(1);
    if (referrerUser) {
      const newTotal = Number(referrerUser.referralEarnings || 0) + commission;
      await db.update(usersTable)
        .set({ referralEarnings: String(newTotal) })
        .where(eq(usersTable.id, ref.referrerId));
    }

    await notifyUser({
      userId: ref.referrerId,
      title: "Referral Commission Earned",
      message: `You earned $${commission.toFixed(2)} from a referral ${opts.event.replace("_", " ")}.`,
      type: "success",
      category: "promo",
      actionUrl: "/referral",
    }).catch(() => {});

    logger.info({
      referrerId: ref.referrerId,
      referredUserId: opts.referredUserId,
      event: opts.event,
      commission,
      level: ref.level,
      referenceId: opts.referenceId,
    }, "Referral commission accrued");
  }
}

/** Mark referral earnings as paid when promoter withdraws commission. */
export async function markReferralEarningsPaid(referrerId: number, amountUsd: number): Promise<void> {
  const pending = await db.select().from(referralEarningsTable)
    .where(and(
      eq(referralEarningsTable.referrerId, referrerId),
      eq(referralEarningsTable.status, "pending"),
    ));

  let remaining = amountUsd;
  for (const row of pending) {
    if (remaining <= 0) break;
    const rowAmount = Number(row.amount);
    if (rowAmount <= remaining) {
      await db.update(referralEarningsTable)
        .set({ status: "paid" })
        .where(eq(referralEarningsTable.id, row.id));
      remaining -= rowAmount;
    }
  }
}
