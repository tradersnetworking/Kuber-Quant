import {
  db,
  stakingPlansTable,
  userStakesTable,
  stakingRewardLogsTable,
  stakingSettingsTable,
  usersTable,
} from "@workspace/db";
import { eq, and, inArray, lte, sql } from "@workspace/db/orm";
import { logger } from "../lib/logger";
import { isMissingRelationError } from "./pgErrors";
import { creditWallet, debitWallet } from "./walletService";
import { notifyUser } from "./notificationService";

export type StakingGlobalSettings = {
  stakingEnabled: boolean;
  rewardsPaused: boolean;
  autoPayoutEnabled: boolean;
  manualApprovalRequired: boolean;
  defaultCurrency: string;
};

const DEFAULT_SETTINGS: StakingGlobalSettings = {
  stakingEnabled: true,
  rewardsPaused: false,
  autoPayoutEnabled: true,
  manualApprovalRequired: false,
  defaultCurrency: "USDT",
};

export async function getStakingSettings(): Promise<StakingGlobalSettings> {
  try {
    const [row] = await db
      .select()
      .from(stakingSettingsTable)
      .where(eq(stakingSettingsTable.key, "global"))
      .limit(1);
    if (!row?.value) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(row.value as StakingGlobalSettings) };
  } catch (err) {
    if (isMissingRelationError(err)) {
      logger.warn("staking_settings table missing — using defaults until db:push runs");
      return DEFAULT_SETTINGS;
    }
    logger.warn({ err }, "Failed to load staking settings — using defaults");
    return DEFAULT_SETTINGS;
  }
}

export async function updateStakingSettings(
  patch: Partial<StakingGlobalSettings>,
  adminId: number,
): Promise<StakingGlobalSettings> {
  const current = await getStakingSettings();
  const next = { ...current, ...patch };
  await db
    .insert(stakingSettingsTable)
    .values({ key: "global", value: next, updatedBy: adminId })
    .onConflictDoUpdate({
      target: stakingSettingsTable.key,
      set: { value: next, updatedBy: adminId, updatedAt: new Date() },
    });
  return next;
}

/** APR → APY with n compounding periods per year */
export function aprToApy(aprPercent: number, compoundsPerYear = 365): number {
  const r = aprPercent / 100;
  return (Math.pow(1 + r / compoundsPerYear, compoundsPerYear) - 1) * 100;
}

/** Simple interest reward for elapsed time */
export function calcSimpleReward(principal: number, aprPercent: number, elapsedMs: number): number {
  const years = elapsedMs / (365 * 24 * 60 * 60 * 1000);
  return principal * (aprPercent / 100) * years;
}

/** Compound amount A = P(1 + r/n)^(nt) */
export function calcCompoundAmount(
  principal: number,
  aprPercent: number,
  elapsedMs: number,
  compoundsPerYear = 365,
): number {
  const r = aprPercent / 100;
  const t = elapsedMs / (365 * 24 * 60 * 60 * 1000);
  const n = compoundsPerYear;
  return principal * Math.pow(1 + r / n, n * t);
}

function rewardIntervalMs(frequency: string): number {
  switch (frequency) {
    case "hourly":
      return 60 * 60 * 1000;
    case "daily":
      return 24 * 60 * 60 * 1000;
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000;
    case "monthly":
      return 30 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function compoundsPerYear(frequency: string): number {
  switch (frequency) {
    case "hourly":
      return 8760;
    case "daily":
      return 365;
    case "weekly":
      return 52;
    case "monthly":
      return 12;
    default:
      return 365;
  }
}

export function projectEarnings(opts: {
  principal: number;
  aprPercent: number;
  apyPercent: number;
  durationDays: number;
  compoundEnabled: boolean;
  rewardFrequency: string;
}) {
  const { principal, aprPercent, apyPercent, durationDays, compoundEnabled, rewardFrequency } = opts;
  const elapsedMs = durationDays * 24 * 60 * 60 * 1000;
  const simple = calcSimpleReward(principal, aprPercent, elapsedMs);
  const compoundTotal = calcCompoundAmount(
    principal,
    aprPercent,
    elapsedMs,
    compoundsPerYear(rewardFrequency),
  );
  const compoundProfit = compoundTotal - principal;
  const estimated = compoundEnabled ? compoundProfit : simple;
  return {
    principal,
    aprPercent,
    apyPercent,
    durationDays,
    estimatedReward: Math.round(estimated * 1e8) / 1e8,
    estimatedTotal: Math.round((principal + estimated) * 1e8) / 1e8,
    simpleInterest: Math.round(simple * 1e8) / 1e8,
    compoundInterest: Math.round(compoundProfit * 1e8) / 1e8,
    series: projectEarningsSeries(opts),
  };
}

export function projectEarningsSeries(opts: {
  principal: number;
  aprPercent: number;
  durationDays: number;
  compoundEnabled: boolean;
  rewardFrequency: string;
}) {
  const { principal, aprPercent, durationDays, compoundEnabled, rewardFrequency } = opts;
  const days = Math.max(1, Math.min(durationDays, 365));
  const pointCount = Math.min(36, Math.max(8, Math.ceil(days / 7)));
  const step = Math.max(1, Math.floor(days / pointCount));
  const cpy = compoundsPerYear(rewardFrequency);
  const points: Array<{ day: number; label: string; rewards: number; total: number }> = [];

  for (let day = 0; day <= days; day += step) {
    const elapsedMs = day * 86400000;
    const reward = compoundEnabled
      ? calcCompoundAmount(principal, aprPercent, elapsedMs, cpy) - principal
      : calcSimpleReward(principal, aprPercent, elapsedMs);
    points.push({
      day,
      label: day === 0 ? "Start" : `Day ${day}`,
      rewards: Math.round(reward * 1e6) / 1e6,
      total: Math.round((principal + reward) * 1e6) / 1e6,
    });
  }

  if (points[points.length - 1]?.day !== days) {
    const elapsedMs = days * 86400000;
    const reward = compoundEnabled
      ? calcCompoundAmount(principal, aprPercent, elapsedMs, cpy) - principal
      : calcSimpleReward(principal, aprPercent, elapsedMs);
    points.push({
      day: days,
      label: `Day ${days}`,
      rewards: Math.round(reward * 1e6) / 1e6,
      total: Math.round((principal + reward) * 1e6) / 1e6,
    });
  }

  return points;
}

async function creditStakeReward(opts: {
  stake: typeof userStakesTable.$inferSelect;
  reward: number;
  note: string;
  autoCreditWallet: boolean;
}) {
  const { stake, reward, note, autoCreditWallet } = opts;
  if (reward <= 0) return;

  const newAccrued = Number(stake.accruedRewards) + reward;
  const newPending = Number(stake.pendingRewards) + reward;

  await db
    .update(userStakesTable)
    .set({
      accruedRewards: String(newAccrued),
      pendingRewards: String(newPending),
      lastRewardAt: new Date(),
    })
    .where(eq(userStakesTable.id, stake.id));

  await db.insert(stakingRewardLogsTable).values({
    stakeId: stake.id,
    userId: stake.userId,
    planId: stake.planId,
    amount: String(reward),
    currency: stake.currency,
    rewardType: "periodic",
    aprApplied: stake.aprPercent,
    note,
  });

  if (autoCreditWallet) {
    await creditWallet({
      userId: stake.userId,
      amount: reward,
      currency: stake.currency,
      type: "profit",
      referenceType: "staking",
      referenceId: stake.id,
      description: `Staking reward — ${stake.planName}`,
    });
    await db
      .update(userStakesTable)
      .set({
        claimedRewards: String(Number(stake.claimedRewards) + reward),
        pendingRewards: String(Math.max(0, Number(stake.pendingRewards))),
      })
      .where(eq(userStakesTable.id, stake.id));

    await notifyUser({
      userId: stake.userId,
      title: "Staking Reward Credited",
      message: `${reward} ${stake.currency} reward from ${stake.planName}.`,
      type: "success",
      category: "investment",
      actionUrl: `/earn/staking/${stake.id}`,
    });
  }
}

export async function processStakingRewardsCycle(): Promise<{ processed: number; matured: number }> {
  const settings = await getStakingSettings();
  if (!settings.stakingEnabled || settings.rewardsPaused) {
    logger.info("Staking rewards skipped (disabled or paused)");
    return { processed: 0, matured: 0 };
  }

  const activeStakes = await db
    .select()
    .from(userStakesTable)
    .where(eq(userStakesTable.status, "active"));

  let processed = 0;
  let matured = 0;
  const now = Date.now();

  for (const stake of activeStakes) {
    const [plan] = await db
      .select()
      .from(stakingPlansTable)
      .where(eq(stakingPlansTable.id, stake.planId))
      .limit(1);
    if (!plan?.isActive) continue;

    const interval = rewardIntervalMs(plan.rewardFrequency);
    const lastAt = stake.lastRewardAt?.getTime() ?? stake.startedAt?.getTime() ?? stake.createdAt.getTime();
    if (now - lastAt < interval) continue;

    const principal = stake.compoundEnabled
      ? Number(stake.principal) + Number(stake.accruedRewards)
      : Number(stake.principal);
    const elapsed = now - lastAt;
    let reward = calcSimpleReward(principal, Number(stake.aprPercent), elapsed);
    if (plan.promotionalBonusPercent && Number(plan.promotionalBonusPercent) > 0) {
      reward *= 1 + Number(plan.promotionalBonusPercent) / 100;
    }
    reward = Math.round(reward * 1e8) / 1e8;

    if (reward > 0) {
      await creditStakeReward({
        stake,
        reward,
        note: `Periodic ${plan.rewardFrequency} reward`,
        autoCreditWallet: settings.autoPayoutEnabled && !settings.manualApprovalRequired,
      });
      processed += 1;
    }

    if (stake.maturesAt && stake.maturesAt.getTime() <= now && !plan.isFlexible) {
      await settleMaturedStake(stake.id);
      matured += 1;
    }
  }

  logger.info({ processed, matured }, "Staking rewards cycle complete");
  return { processed, matured };
}

export async function settleMaturedStake(stakeId: number): Promise<void> {
  const [stake] = await db.select().from(userStakesTable).where(eq(userStakesTable.id, stakeId)).limit(1);
  if (!stake || stake.status !== "active") return;

  const pending = Number(stake.pendingRewards);
  const principal = Number(stake.principal);

  if (pending > 0) {
    await creditWallet({
      userId: stake.userId,
      amount: pending,
      currency: stake.currency,
      type: "profit",
      referenceType: "staking",
      referenceId: stake.id,
      description: `Staking maturity rewards — ${stake.planName}`,
    });
  }

  await creditWallet({
    userId: stake.userId,
    amount: principal,
    currency: stake.currency,
    type: "investment",
    referenceType: "staking",
    referenceId: stake.id,
    description: `Staking principal returned — ${stake.planName}`,
  });

  await db
    .update(userStakesTable)
    .set({
      status: "matured",
      claimedRewards: String(Number(stake.claimedRewards) + pending),
      pendingRewards: "0",
    })
    .where(eq(userStakesTable.id, stakeId));

  await db
    .update(stakingPlansTable)
    .set({
      totalStaked: sql`${stakingPlansTable.totalStaked} - ${principal}`,
      activeStakers: sql`GREATEST(0, ${stakingPlansTable.activeStakers} - 1)`,
    })
    .where(eq(stakingPlansTable.id, stake.planId));

  const [plan] = await db
    .select()
    .from(stakingPlansTable)
    .where(eq(stakingPlansTable.id, stake.planId))
    .limit(1);
  if (plan?.autoRenew) {
    await createAutoRenewStake(stake, plan);
  }

  await notifyUser({
    userId: stake.userId,
    title: "Stake Matured",
    message: `Your ${stake.planName} stake has matured. Principal and rewards returned to wallet.`,
    type: "success",
    category: "investment",
    actionUrl: "/earn/staking",
  });
}

async function createAutoRenewStake(
  prev: typeof userStakesTable.$inferSelect,
  plan: typeof stakingPlansTable.$inferSelect,
) {
  const maturesAt = new Date();
  maturesAt.setDate(maturesAt.getDate() + plan.lockDurationDays);
  await db.insert(userStakesTable).values({
    userId: prev.userId,
    planId: plan.id,
    planName: plan.name,
    principal: prev.principal,
    currency: prev.currency,
    aprPercent: plan.aprPercent,
    apyPercent: plan.apyPercent,
    roiPercent: plan.roiPercent,
    autoReinvest: prev.autoReinvest,
    compoundEnabled: plan.compoundEnabled,
    status: "active",
    startedAt: new Date(),
    maturesAt: plan.isFlexible ? null : maturesAt,
    agreementAcceptedAt: prev.agreementAcceptedAt,
  });
}

export async function runStakingEngineCycle(): Promise<void> {
  await processStakingRewardsCycle();
}

export async function manualCreditStakeReward(opts: {
  stakeId: number;
  amount: number;
  adminId: number;
  remarks?: string;
}): Promise<void> {
  const [stake] = await db.select().from(userStakesTable).where(eq(userStakesTable.id, opts.stakeId)).limit(1);
  if (!stake) throw new Error("Stake not found");

  await creditWallet({
    userId: stake.userId,
    amount: opts.amount,
    currency: stake.currency,
    type: "bonus",
    referenceType: "staking",
    referenceId: stake.id,
    description: opts.remarks || "Admin manual staking reward",
  });

  await db.insert(stakingRewardLogsTable).values({
    stakeId: stake.id,
    userId: stake.userId,
    planId: stake.planId,
    amount: String(opts.amount),
    currency: stake.currency,
    rewardType: "manual",
    note: opts.remarks || `Manual credit by admin #${opts.adminId}`,
  });
}

export async function getStakingDashboardStats(userId: number) {
  const stakes = await db.select().from(userStakesTable).where(eq(userStakesTable.userId, userId));
  const active = stakes.filter((s) => s.status === "active");
  const matured = stakes.filter((s) => s.status === "matured" || s.status === "claimed");
  const totalStaked = active.reduce((sum, s) => sum + Number(s.principal), 0);
  const totalRewards = stakes.reduce((sum, s) => sum + Number(s.accruedRewards), 0);
  const pendingRewards = active.reduce((sum, s) => sum + Number(s.pendingRewards), 0);
  const claimedRewards = stakes.reduce((sum, s) => sum + Number(s.claimedRewards), 0);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  return {
    totalStaked,
    totalRewardsEarned: totalRewards,
    pendingRewards,
    claimedRewards,
    activeStakes: active.length,
    maturedStakes: matured.length,
    walletFiat: Number(user?.balanceFiat ?? 0),
    walletCrypto: Number(user?.balanceCrypto ?? 0),
    portfolio: active.map((s) => ({
      planName: s.planName,
      principal: Number(s.principal),
      currency: s.currency,
      status: s.status,
    })),
  };
}

export async function getPlatformStakingStats() {
  const [totals] = await db
    .select({
      totalStaked: sql<string>`COALESCE(SUM(CASE WHEN ${userStakesTable.status} = 'active' THEN ${userStakesTable.principal}::numeric ELSE 0 END), 0)`,
      totalRewards: sql<string>`COALESCE(SUM(${userStakesTable.accruedRewards}::numeric), 0)`,
      activeStakes: sql<string>`COUNT(*) FILTER (WHERE ${userStakesTable.status} = 'active')`,
      activeUsers: sql<string>`COUNT(DISTINCT ${userStakesTable.userId}) FILTER (WHERE ${userStakesTable.status} = 'active')`,
    })
    .from(userStakesTable);

  const plans = await db.select().from(stakingPlansTable);
  return {
    totalStaked: Number(totals?.totalStaked ?? 0),
    totalRewardsPaid: Number(totals?.totalRewards ?? 0),
    activeStakes: Number(totals?.activeStakes ?? 0),
    activeUsers: Number(totals?.activeUsers ?? 0),
    planCount: plans.length,
    activePlans: plans.filter((p) => p.isActive).length,
  };
}
