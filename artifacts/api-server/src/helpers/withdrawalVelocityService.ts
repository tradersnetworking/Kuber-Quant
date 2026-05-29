import { db, usersTable, transactionsTable, siteSettingsTable } from "@workspace/db";
import { eq, and, gte, inArray } from "@workspace/db/orm";
import { convertToUsd } from "./exchangeRateService";

export type WithdrawalTier = "basic" | "verified" | "promoter";

export type WithdrawalVelocityLimits = {
  dailyCount: number;
  dailyUsd: number;
  weeklyUsd: number;
};

const DEFAULT_LIMITS: Record<WithdrawalTier, WithdrawalVelocityLimits> = {
  basic: { dailyCount: 1, dailyUsd: 500, weeklyUsd: 1500 },
  verified: { dailyCount: 3, dailyUsd: 5000, weeklyUsd: 15000 },
  promoter: { dailyCount: 5, dailyUsd: 10000, weeklyUsd: 50000 },
};

export function resolveWithdrawalTier(user: typeof usersTable.$inferSelect): WithdrawalTier {
  if (user.isPromoter) return "promoter";
  if (user.kycStatus === "verified") return "verified";
  return "basic";
}

async function getCustomLimits(): Promise<Partial<Record<WithdrawalTier, Partial<WithdrawalVelocityLimits>>>> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "withdrawal_velocity_limits")).limit(1);
  if (!row?.value) return {};
  try {
    return JSON.parse(row.value) as Partial<Record<WithdrawalTier, Partial<WithdrawalVelocityLimits>>>;
  } catch {
    return {};
  }
}

export async function getWithdrawalVelocityLimits(user: typeof usersTable.$inferSelect): Promise<WithdrawalVelocityLimits> {
  const tier = resolveWithdrawalTier(user);
  const custom = await getCustomLimits();
  return { ...DEFAULT_LIMITS[tier], ...(custom[tier] || {}) };
}

export type VelocityUsage = {
  tier: WithdrawalTier;
  limits: WithdrawalVelocityLimits;
  dailyCount: number;
  dailyUsd: number;
  weeklyUsd: number;
};

export async function getWithdrawalVelocityUsage(userId: number): Promise<VelocityUsage> {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    return {
      tier: "basic",
      limits: DEFAULT_LIMITS.basic,
      dailyCount: 0,
      dailyUsd: 0,
      weeklyUsd: 0,
    };
  }

  const limits = await getWithdrawalVelocityLimits(user);
  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const recent = await db.select().from(transactionsTable).where(and(
    eq(transactionsTable.userId, userId),
    eq(transactionsTable.type, "withdrawal"),
    inArray(transactionsTable.status, ["pending", "approved"]),
    gte(transactionsTable.createdAt, weekAgo),
  ));

  const daily = recent.filter(t => t.createdAt >= dayAgo);
  let dailyUsd = 0;
  let weeklyUsd = 0;
  for (const txn of recent) {
    const usd = await convertToUsd(Number(txn.amount), txn.currency);
    weeklyUsd += usd;
    if (txn.createdAt >= dayAgo) dailyUsd += usd;
  }

  return {
    tier: resolveWithdrawalTier(user),
    limits,
    dailyCount: daily.length,
    dailyUsd,
    weeklyUsd,
  };
}

export type VelocityCheck = {
  allowed: boolean;
  code?: string;
  message?: string;
  usage: VelocityUsage;
};

export async function checkWithdrawalVelocity(opts: {
  userId: number;
  amount: number;
  currency: string;
}): Promise<VelocityCheck> {
  const usage = await getWithdrawalVelocityUsage(opts.userId);
  const amountUsd = await convertToUsd(opts.amount, opts.currency);
  const { limits } = usage;

  if (usage.dailyCount >= limits.dailyCount) {
    return {
      allowed: false,
      code: "WITHDRAWAL_DAILY_COUNT",
      message: `Daily withdrawal limit reached (${limits.dailyCount} per day for ${usage.tier} accounts).`,
      usage,
    };
  }

  if (usage.dailyUsd + amountUsd > limits.dailyUsd) {
    return {
      allowed: false,
      code: "WITHDRAWAL_DAILY_AMOUNT",
      message: `Daily withdrawal amount limit exceeded ($${limits.dailyUsd.toLocaleString()} for ${usage.tier} accounts).`,
      usage,
    };
  }

  if (usage.weeklyUsd + amountUsd > limits.weeklyUsd) {
    return {
      allowed: false,
      code: "WITHDRAWAL_WEEKLY_AMOUNT",
      message: `Weekly withdrawal amount limit exceeded ($${limits.weeklyUsd.toLocaleString()} for ${usage.tier} accounts).`,
      usage,
    };
  }

  return { allowed: true, usage };
}

export function computeWithdrawalRiskScore(flags: string[], usage: VelocityUsage, amountUsd: number): number {
  let score = 0;
  if (flags.includes("new_ip_24h")) score += 25;
  if (flags.includes("large_withdrawal")) score += 30;
  if (flags.includes("2fa_not_enabled")) score += 20;
  if (usage.tier === "basic") score += 15;

  const dailyPct = usage.limits.dailyUsd > 0 ? (usage.dailyUsd / usage.limits.dailyUsd) * 100 : 0;
  const weeklyPct = usage.limits.weeklyUsd > 0 ? (usage.weeklyUsd / usage.limits.weeklyUsd) * 100 : 0;
  if (dailyPct >= 80) score += 15;
  if (weeklyPct >= 80) score += 10;
  if (amountUsd >= 2500) score += 10;

  return Math.min(100, score);
}
