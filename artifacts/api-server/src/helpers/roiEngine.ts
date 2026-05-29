import { db, investmentsTable, roiPayoutsTable, investmentPlansTable, usersTable } from "@workspace/db";
import { eq, and, lte, gt, isNotNull, desc } from "@workspace/db/orm";
import { logger } from "../lib/logger";
import { creditWallet } from "./walletService";
import { notifyUser } from "./notificationService";
import { accrueReferralCommission } from "./referralCommissionService";
import { convertToUsd } from "./exchangeRateService";

type ProfitFrequency = "daily" | "weekly" | "monthly" | "at_maturity";

async function resolvePlan(planName: string | null) {
  if (!planName) return null;
  const [plan] = await db.select().from(investmentPlansTable)
    .where(eq(investmentPlansTable.name, planName))
    .limit(1);
  return plan ?? null;
}

async function resolvePlanRoiPercent(planName: string | null, storedPercent?: string | null): Promise<number> {
  if (storedPercent && Number(storedPercent) > 0) return Number(storedPercent);
  const plan = await resolvePlan(planName);
  if (plan) return Number(plan.roiPercent);
  return 5;
}

function frequencyIntervalMs(frequency: ProfitFrequency): number {
  switch (frequency) {
    case "daily": return 24 * 60 * 60 * 1000;
    case "weekly": return 7 * 24 * 60 * 60 * 1000;
    case "monthly": return 30 * 24 * 60 * 60 * 1000;
    default: return 0;
  }
}

function periodCount(frequency: ProfitFrequency, durationDays: number): number {
  switch (frequency) {
    case "daily": return Math.max(1, durationDays);
    case "weekly": return Math.max(1, Math.ceil(durationDays / 7));
    case "monthly": return Math.max(1, Math.ceil(durationDays / 30));
    default: return 1;
  }
}

async function getLastPayoutDate(investmentId: number): Promise<Date | null> {
  const [last] = await db.select().from(roiPayoutsTable)
    .where(and(
      eq(roiPayoutsTable.investmentId, investmentId),
      eq(roiPayoutsTable.status, "processed"),
    ))
    .orderBy(desc(roiPayoutsTable.processedAt))
    .limit(1);
  return last?.processedAt ?? null;
}

async function isMaturitySettled(investmentId: number): Promise<boolean> {
  const [inv] = await db.select({ status: investmentsTable.status })
    .from(investmentsTable).where(eq(investmentsTable.id, investmentId)).limit(1);
  return inv?.status === "completed";
}

async function creditRoiProfit(opts: {
  inv: typeof investmentsTable.$inferSelect;
  profit: number;
  roiPercent: number;
  note: string;
  isFinal?: boolean;
}) {
  const { inv, profit, roiPercent, note } = opts;
  const currency = inv.currency || "USD";

  if (profit <= 0) return;

  await creditWallet({
    userId: inv.userId,
    amount: profit,
    currency,
    type: "profit",
    referenceType: "investment",
    referenceId: inv.id,
    description: `ROI payout — ${inv.planName || "Investment"} (${roiPercent}%)`,
  });

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
  if (user) {
    await db.update(usersTable).set({
      totalProfit: String(Number(user.totalProfit) + profit),
    }).where(eq(usersTable.id, inv.userId));
  }

  await db.update(investmentsTable).set({
    profit: String(Number(inv.profit || 0) + profit),
    profitPercent: String(roiPercent),
  }).where(eq(investmentsTable.id, inv.id));

  await db.insert(roiPayoutsTable).values({
    investmentId: inv.id,
    userId: inv.userId,
    amount: String(profit),
    roiPercent: String(roiPercent),
    status: "processed",
    planName: inv.planName || "Unknown",
    note,
    processedAt: new Date(),
  });

  const profitUsd = currency === "USD" ? profit : await convertToUsd(profit, currency);
  await accrueReferralCommission({
    referredUserId: inv.userId,
    event: "roi_payout",
    baseAmountUsd: profitUsd,
    referenceId: inv.id,
  }).catch(() => {});

  await notifyUser({
    userId: inv.userId,
    title: opts.isFinal ? "Investment Matured" : "ROI Payout Received",
    message: `Your ${inv.planName || "investment"} paid ${profit} ${currency} profit.`,
    type: "success",
    category: "investment",
    actionUrl: `/investments/${inv.id}`,
  });
}

export async function maybeAutoRenew(inv: typeof investmentsTable.$inferSelect, plan: typeof investmentPlansTable.$inferSelect | null) {
  if (!plan?.autoRenewal) return;

  const amount = Number(inv.amount);
  const maturityDate = new Date();
  maturityDate.setDate(maturityDate.getDate() + plan.durationDays);

  await db.insert(investmentsTable).values({
    userId: inv.userId,
    type: inv.type,
    amount: String(amount),
    currency: inv.currency,
    planName: inv.planName,
    profit: "0",
    profitPercent: plan.roiPercent,
    status: "active",
    maturityDate,
  });

  await notifyUser({
    userId: inv.userId,
    title: "Investment Auto-Renewed",
    message: `Your ${inv.planName || "investment"} was automatically renewed for ${plan.durationDays} days.`,
    type: "info",
    category: "investment",
    actionUrl: "/investments",
  });
}

async function settleInvestmentMaturity(inv: typeof investmentsTable.$inferSelect, note: string) {
  if (inv.status !== "active") return false;
  if (await isMaturitySettled(inv.id)) {
    logger.warn({ investmentId: inv.id }, "ROI payout skipped — already settled at maturity");
    return false;
  }

  const amount = Number(inv.amount);
  const roiPercent = await resolvePlanRoiPercent(inv.planName, inv.profitPercent);
  const plan = await resolvePlan(inv.planName);
  const totalProfit = parseFloat((amount * roiPercent / 100).toFixed(2));
  const alreadyPaid = Number(inv.profit || 0);
  const remainingProfit = parseFloat(Math.max(0, totalProfit - alreadyPaid).toFixed(2));
  const currency = inv.currency || "USD";

  if (remainingProfit > 0) {
    await creditRoiProfit({
      inv,
      profit: remainingProfit,
      roiPercent,
      note,
      isFinal: true,
    });
  }

  const returnCapital = !plan || plan.capitalReturn !== "no";
  if (returnCapital) {
    await creditWallet({
      userId: inv.userId,
      amount,
      currency,
      type: "investment",
      referenceType: "investment",
      referenceId: inv.id,
      description: `Capital returned — ${inv.planName || "Investment"} #${inv.id}`,
    });
  }

  await db.update(investmentsTable).set({
    status: "completed",
    profit: String(totalProfit),
    profitPercent: String(roiPercent),
  }).where(eq(investmentsTable.id, inv.id));

  await maybeAutoRenew(inv, plan);
  return true;
}

export async function processPeriodicRoiPayouts(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;
  const now = new Date();

  try {
    const active = await db.select().from(investmentsTable)
      .where(and(
        eq(investmentsTable.status, "active"),
        isNotNull(investmentsTable.maturityDate),
        gt(investmentsTable.maturityDate, now),
      ));

    for (const inv of active) {
      try {
        const plan = await resolvePlan(inv.planName);
        const frequency = (plan?.profitFrequency || "at_maturity") as ProfitFrequency;
        if (frequency === "at_maturity") continue;

        const durationDays = plan?.durationDays || 30;
        const roiPercent = await resolvePlanRoiPercent(inv.planName, inv.profitPercent);
        const amount = Number(inv.amount);
        const totalProfit = amount * roiPercent / 100;
        const periods = periodCount(frequency, durationDays);
        const periodProfit = parseFloat((totalProfit / periods).toFixed(2));
        if (periodProfit <= 0) continue;

        const intervalMs = frequencyIntervalMs(frequency);
        const lastPayout = await getLastPayoutDate(inv.id);
        const anchor = lastPayout ?? inv.createdAt;
        if (now.getTime() - anchor.getTime() < intervalMs) continue;

        const alreadyPaid = Number(inv.profit || 0);
        if (alreadyPaid + periodProfit > totalProfit + 0.01) continue;

        await creditRoiProfit({
          inv,
          profit: periodProfit,
          roiPercent,
          note: `Periodic ${frequency} ROI — ${now.toISOString()}`,
        });
        processed++;
      } catch (e) {
        errors++;
        logger.error({ investmentId: inv.id, err: e }, "Periodic ROI payout failed");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "Periodic ROI engine error");
  }

  return { processed, errors };
}

export async function processMaturedInvestments(): Promise<{ processed: number; errors: number; skipped: number }> {
  let processed = 0;
  let errors = 0;
  let skipped = 0;

  try {
    const now = new Date();
    const matured = await db.select().from(investmentsTable)
      .where(
        and(
          eq(investmentsTable.status, "active"),
          isNotNull(investmentsTable.maturityDate),
          lte(investmentsTable.maturityDate, now),
        ),
      );

    for (const inv of matured) {
      try {
        if (!inv.maturityPayoutAcknowledgedAt) {
          skipped++;
          logger.info({ investmentId: inv.id }, "Maturity deferred — awaiting investor payout choice");
          continue;
        }

        if (inv.maturityPayoutDestination === "personal") {
          const { settleMaturityToPersonalAccount } = await import("./maturityPayoutService");
          await settleMaturityToPersonalAccount(inv);
          processed++;
          continue;
        }

        const ok = await settleInvestmentMaturity(inv, `Auto-processed on maturity: ${now.toISOString()}`);
        if (ok) processed++;
        else skipped++;
      } catch (e) {
        errors++;
        logger.error({ investmentId: inv.id, err: e }, "ROI payout failed for investment");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "ROI automation engine error");
  }

  if (processed > 0 || errors > 0 || skipped > 0) {
    logger.info({ processed, errors, skipped }, "ROI maturity cycle complete");
  }

  return { processed, errors, skipped };
}

export async function processManualPayout(investmentId: number, adminNote?: string): Promise<{ ok: boolean; message: string }> {
  const [inv] = await db.select().from(investmentsTable).where(eq(investmentsTable.id, investmentId)).limit(1);
  if (!inv) return { ok: false, message: "Investment not found" };
  if (inv.status !== "active") return { ok: false, message: "Investment is not active" };
  if (await isMaturitySettled(investmentId)) {
    return { ok: false, message: "ROI already processed for this investment" };
  }

  try {
    await settleInvestmentMaturity(inv, adminNote || "Manual admin payout");
    const profit = Number(inv.amount) * (await resolvePlanRoiPercent(inv.planName, inv.profitPercent)) / 100;
    return { ok: true, message: `Paid out $${profit.toFixed(2)} ROI to user #${inv.userId}` };
  } catch (e) {
    logger.error({ investmentId, err: e }, "Manual ROI payout failed");
    return { ok: false, message: e instanceof Error ? e.message : "Payout failed" };
  }
}

export async function runRoiEngineCycle(): Promise<{ processed: number; errors: number; skipped: number }> {
  const periodic = await processPeriodicRoiPayouts();
  const maturity = await processMaturedInvestments();
  return {
    processed: periodic.processed + maturity.processed,
    errors: periodic.errors + maturity.errors,
    skipped: maturity.skipped,
  };
}
