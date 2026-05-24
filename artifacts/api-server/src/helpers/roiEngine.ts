import { db, investmentsTable, roiPayoutsTable, usersTable, investmentPlansTable } from "@workspace/db";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logger } from "../lib/logger";

const ROI_PLAN_RATES: Record<string, number> = {
  "Starter":  5,
  "Growth":   12,
  "Premium":  22,
  "Elite":    36,
};

export async function processMaturedInvestments(): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  try {
    const now = new Date();
    const matured = await db.select().from(investmentsTable)
      .where(
        and(
          eq(investmentsTable.status, "active"),
          isNotNull(investmentsTable.maturityDate),
          lte(investmentsTable.maturityDate, now),
        )
      );

    for (const inv of matured) {
      try {
        const amount = Number(inv.amount);
        const roiPercent = ROI_PLAN_RATES[inv.planName || ""] ?? 5;
        const profit = parseFloat((amount * roiPercent / 100).toFixed(2));
        const total = amount + profit;

        // Credit balance
        await db.update(usersTable)
          .set({
            balanceFiat: db.$with("u").as(
              db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1)
            ) as any,
          })
          .where(eq(usersTable.id, inv.userId));

        // Use raw update to increment
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
        if (user) {
          const newBalance = Number(user.balanceFiat) + total;
          const newProfit = Number(user.totalProfit) + profit;
          await db.update(usersTable)
            .set({ balanceFiat: String(newBalance), totalProfit: String(newProfit) })
            .where(eq(usersTable.id, inv.userId));
        }

        // Mark investment completed and record profit
        await db.update(investmentsTable)
          .set({ status: "completed", profit: String(profit), profitPercent: String(roiPercent) })
          .where(eq(investmentsTable.id, inv.id));

        // Create payout record
        await db.insert(roiPayoutsTable).values({
          investmentId: inv.id,
          userId: inv.userId,
          amount: String(profit),
          roiPercent: String(roiPercent),
          status: "processed",
          planName: inv.planName || "Unknown",
          note: `Auto-processed on maturity: ${now.toISOString()}`,
          processedAt: now,
        });

        processed++;
      } catch (e) {
        errors++;
        logger.error({ investmentId: inv.id, err: e }, "ROI payout failed for investment");
      }
    }
  } catch (e) {
    logger.error({ err: e }, "ROI automation engine error");
  }

  if (processed > 0 || errors > 0) {
    logger.info({ processed, errors }, "ROI automation cycle complete");
  }

  return { processed, errors };
}

export async function processManualPayout(investmentId: number, adminNote?: string): Promise<{ ok: boolean; message: string }> {
  const [inv] = await db.select().from(investmentsTable).where(eq(investmentsTable.id, investmentId)).limit(1);
  if (!inv) return { ok: false, message: "Investment not found" };
  if (inv.status !== "active") return { ok: false, message: "Investment is not active" };

  const amount = Number(inv.amount);
  const roiPercent = ROI_PLAN_RATES[inv.planName || ""] ?? 5;
  const profit = parseFloat((amount * roiPercent / 100).toFixed(2));
  const total = amount + profit;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, inv.userId)).limit(1);
  if (!user) return { ok: false, message: "User not found" };

  const newBalance = Number(user.balanceFiat) + total;
  const newProfit = Number(user.totalProfit) + profit;

  await db.update(usersTable)
    .set({ balanceFiat: String(newBalance), totalProfit: String(newProfit) })
    .where(eq(usersTable.id, inv.userId));

  await db.update(investmentsTable)
    .set({ status: "completed", profit: String(profit), profitPercent: String(roiPercent) })
    .where(eq(investmentsTable.id, investmentId));

  await db.insert(roiPayoutsTable).values({
    investmentId,
    userId: inv.userId,
    amount: String(profit),
    roiPercent: String(roiPercent),
    status: "processed",
    planName: inv.planName || "Unknown",
    note: adminNote || "Manual admin payout",
    processedAt: new Date(),
  });

  return { ok: true, message: `Paid out $${profit} ROI to user #${inv.userId}` };
}
