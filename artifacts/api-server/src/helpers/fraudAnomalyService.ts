import fs from "fs";
import path from "path";
import { db, loginHistoryTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, gte, desc, inArray } from "@workspace/db/orm";
import { clientIp } from "./trustedDeviceService";
import { emitSiemEvent } from "./siemExportService";

export type AnomalyResult = {
  score: number;
  flags: string[];
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Score login behavior anomalies from recent history. */
export async function scoreLoginAnomaly(userId: number, req: any): Promise<AnomalyResult> {
  const flags: string[] = [];
  let score = 0;

  const ip = clientIp(req);
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const since1h = new Date(Date.now() - 3600 * 1000);

  const recent = await db.select().from(loginHistoryTable)
    .where(and(eq(loginHistoryTable.userId, userId), gte(loginHistoryTable.createdAt, since24h)))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(50);

  const successIps = new Set(recent.filter(r => r.success).map(r => r.ipAddress).filter(Boolean));
  if (ip && successIps.size > 0 && !successIps.has(ip)) {
    flags.push("login_new_ip");
    score += 25;
  }

  const failedLastHour = recent.filter(r => !r.success && r.createdAt >= since1h).length;
  if (failedLastHour >= 3) {
    flags.push("login_failed_burst");
    score += 20;
  }

  const distinctIps1h = new Set(
    recent.filter(r => r.createdAt >= since1h).map(r => r.ipAddress).filter(Boolean),
  );
  if (distinctIps1h.size >= 4) {
    flags.push("login_ip_hopping");
    score += 30;
  }

  const hour = new Date().getUTCHours();
  const successHours = recent
    .filter(r => r.success)
    .map(r => new Date(r.createdAt).getUTCHours());
  if (successHours.length >= 5) {
    const typical = new Set(successHours);
    if (!typical.has(hour) && typical.size <= 4) {
      flags.push("login_unusual_hour");
      score += 10;
    }
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user?.passwordChangedAt) {
    const sincePwd = Date.now() - new Date(user.passwordChangedAt).getTime();
    if (sincePwd < 3600 * 1000) {
      flags.push("recent_password_change");
      score += 15;
    }
  }

  const result = { score: clampScore(score), flags };
  if (result.score >= 40) {
    emitSiemEvent({
      category: "security",
      action: "anomaly.login",
      severity: result.score >= 70 ? "high" : "warning",
      userId,
      ipAddress: ip,
      riskScore: result.score,
      flags: result.flags,
    });
  }

  return result;
}

/** Score withdrawal request anomalies beyond velocity/fraud rules. */
export async function scoreWithdrawalAnomaly(opts: {
  userId: number;
  amount: number;
  currency: string;
}): Promise<AnomalyResult> {
  const flags: string[] = [];
  let score = 0;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, opts.userId)).limit(1);
  if (!user) return { score: 100, flags: ["user_not_found"] };

  const priorWithdrawals = await db.select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, opts.userId),
      eq(transactionsTable.type, "withdrawal"),
      inArray(transactionsTable.status, ["pending", "approved"]),
    ))
    .limit(1);

  if (priorWithdrawals.length === 0) {
    flags.push("first_withdrawal");
    score += 15;
  }

  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const recentDeposits = await db.select().from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, opts.userId),
      eq(transactionsTable.type, "deposit"),
      gte(transactionsTable.createdAt, since24h),
      inArray(transactionsTable.status, ["approved"]),
    ))
    .limit(5);

  if (recentDeposits.length > 0) {
    flags.push("withdrawal_after_recent_deposit");
    score += 20;
  }

  const balance = Number(user.balanceFiat || 0) + Number(user.balanceCrypto || 0);
  if (balance > 0 && opts.amount / balance >= 0.8) {
    flags.push("withdrawal_near_full_balance");
    score += 25;
  }

  const loginAnomaly = await db.select().from(loginHistoryTable)
    .where(and(
      eq(loginHistoryTable.userId, opts.userId),
      gte(loginHistoryTable.createdAt, new Date(Date.now() - 3600 * 1000)),
    ))
    .orderBy(desc(loginHistoryTable.createdAt))
    .limit(10);

  const recentFailures = loginAnomaly.filter(r => !r.success).length;
  if (recentFailures >= 2) {
    flags.push("withdrawal_after_login_failures");
    score += 20;
  }

  return { score: clampScore(score), flags };
}
