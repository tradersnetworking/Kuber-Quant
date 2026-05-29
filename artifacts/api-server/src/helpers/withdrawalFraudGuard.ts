import { db, usersTable, loginHistoryTable, siteSettingsTable } from "@workspace/db";
import { eq, desc, and, gte } from "@workspace/db/orm";
import { WalletError } from "./walletService";
import { convertToUsd } from "./exchangeRateService";
import {
  checkWithdrawalVelocity,
  computeWithdrawalRiskScore,
} from "./withdrawalVelocityService";
import { scoreWithdrawalAnomaly } from "./fraudAnomalyService";
import { emitSiemEvent } from "./siemExportService";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

export type WithdrawalFraudCheck = {
  allowed: boolean;
  code?: string;
  message?: string;
  flags: string[];
  riskScore: number;
  tier?: string;
};

export async function checkWithdrawalFraud(opts: {
  userId: number;
  amount: number;
  currency: string;
  clientIp?: string;
}): Promise<WithdrawalFraudCheck> {
  const flags: string[] = [];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, opts.userId)).limit(1);
  if (!user) {
    return { allowed: false, code: "USER_NOT_FOUND", message: "User not found", flags, riskScore: 100 };
  }

  const requires2fa = (await getSetting("withdrawal_requires_2fa", "true")) === "true";
  if (requires2fa && !user.twoFactorEnabled) {
    return {
      allowed: false,
      code: "WITHDRAWAL_2FA_REQUIRED",
      message: "Enable two-factor authentication before requesting withdrawals.",
      flags: ["2fa_not_enabled"],
      riskScore: 80,
      tier: user.kycStatus,
    };
  }

  const cooldownHours = Number(await getSetting("withdrawal_cooldown_hours", "24"));
  if (cooldownHours > 0 && user.passwordChangedAt) {
    const elapsed = Date.now() - new Date(user.passwordChangedAt).getTime();
    if (elapsed < cooldownHours * 3600 * 1000) {
      return {
        allowed: false,
        code: "WITHDRAWAL_COOLDOWN",
        message: `Withdrawals are temporarily disabled for ${cooldownHours}h after a password change.`,
        flags: ["password_change_cooldown"],
        riskScore: 60,
        tier: user.kycStatus,
      };
    }
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const recentLogins = await db.select().from(loginHistoryTable)
    .where(and(
      eq(loginHistoryTable.userId, opts.userId),
      eq(loginHistoryTable.success, true),
      gte(loginHistoryTable.createdAt, since),
    ))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(20);

  const knownIps = new Set(recentLogins.map(l => l.ipAddress).filter(Boolean));
  if (opts.clientIp && knownIps.size > 0 && !knownIps.has(opts.clientIp)) {
    flags.push("new_ip_24h");
  }

  const amountUsd = await convertToUsd(opts.amount, opts.currency);
  const largeThreshold = Number(await getSetting("withdrawal_large_amount_usd", "5000"));
  if (amountUsd >= largeThreshold) {
    flags.push("large_withdrawal");
    if (!user.twoFactorEnabled) {
      return {
        allowed: false,
        code: "LARGE_WITHDRAWAL_2FA",
        message: "Large withdrawals require two-factor authentication.",
        flags,
        riskScore: 90,
        tier: user.kycStatus,
      };
    }
  }

  const blockNewIp = (await getSetting("withdrawal_block_new_ip", "false")) === "true";
  if (blockNewIp && flags.includes("new_ip_24h")) {
    return {
      allowed: false,
      code: "WITHDRAWAL_NEW_DEVICE",
      message: "Withdrawal blocked from unrecognized device. Try again after 24h or contact support.",
      flags,
      riskScore: 85,
      tier: user.kycStatus,
    };
  }

  const velocity = await checkWithdrawalVelocity(opts);
  if (!velocity.allowed) {
    flags.push("velocity_limit");
    return {
      allowed: false,
      code: velocity.code,
      message: velocity.message,
      flags,
      riskScore: 70,
      tier: velocity.usage.tier,
    };
  }

  const riskScore = computeWithdrawalRiskScore(flags, velocity.usage, amountUsd);
  const anomaly = await scoreWithdrawalAnomaly({
    userId: opts.userId,
    amount: opts.amount,
    currency: opts.currency,
  });
  flags.push(...anomaly.flags);
  const combinedRisk = Math.min(100, Math.round((riskScore + anomaly.score) / 2));
  const blockThreshold = Number(await getSetting("withdrawal_risk_block_score", "85"));
  if (combinedRisk >= blockThreshold) {
    emitSiemEvent({
      category: "security",
      action: "withdrawal.blocked_risk_score",
      severity: "high",
      userId: opts.userId,
      role: user.role,
      ipAddress: opts.clientIp,
      riskScore: combinedRisk,
      flags,
      metadata: { amountUsd, tier: velocity.usage.tier, anomalyScore: anomaly.score },
    });
    return {
      allowed: false,
      code: "WITHDRAWAL_HIGH_RISK",
      message: "Withdrawal flagged for security review. Contact support if this is unexpected.",
      flags: [...flags, "high_risk_score"],
      riskScore: combinedRisk,
      tier: velocity.usage.tier,
    };
  }

  if (combinedRisk >= 50) {
    emitSiemEvent({
      category: "security",
      action: "withdrawal.flagged",
      severity: "warning",
      userId: opts.userId,
      role: user.role,
      ipAddress: opts.clientIp,
      riskScore: combinedRisk,
      flags,
      metadata: { amountUsd, tier: velocity.usage.tier, anomalyScore: anomaly.score },
    });
  }

  return { allowed: true, flags, riskScore: combinedRisk, tier: velocity.usage.tier };
}

export async function assertWithdrawalAllowed(opts: {
  userId: number;
  amount: number;
  currency: string;
  clientIp?: string;
}) {
  const result = await checkWithdrawalFraud(opts);
  if (!result.allowed) {
    emitSiemEvent({
      category: "financial",
      action: "withdrawal.blocked",
      severity: "warning",
      userId: opts.userId,
      ipAddress: opts.clientIp,
      riskScore: result.riskScore,
      flags: result.flags,
      metadata: { code: result.code, amount: opts.amount, currency: opts.currency },
    });
    throw new WalletError(result.message || "Withdrawal blocked", result.code || "WITHDRAWAL_BLOCKED");
  }
  return result;
}
