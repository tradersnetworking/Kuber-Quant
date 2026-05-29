import {
  db, investmentsTable, investmentPlansTable, transactionsTable,
  userPaymentAccountsTable, usersTable,
} from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import { creditWallet, debitWallet } from "./walletService";
import { notifyUser } from "./notificationService";
import { convertToUsd } from "./exchangeRateService";

const MS_DAY = 86_400_000;

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

export type MaturityPayoutBreakdown = {
  investmentId: number;
  planName: string;
  investedAmount: number;
  currency: string;
  profitEarned: number;
  remainingProfit: number;
  capitalReturn: number;
  totalPayout: number;
  totalPayoutUsd: number;
  roiPercent: number;
  investedAt: string;
  maturityDate: string;
  daysUntil: number;
  durationDays: number | null;
  profitFrequency: string | null;
  capitalReturnPolicy: string | null;
};

export async function computeMaturityPayoutBreakdown(
  inv: typeof investmentsTable.$inferSelect,
): Promise<MaturityPayoutBreakdown> {
  const amount = Number(inv.amount);
  const roiPercent = await resolvePlanRoiPercent(inv.planName, inv.profitPercent);
  const plan = await resolvePlan(inv.planName);
  const totalProfit = parseFloat((amount * roiPercent / 100).toFixed(8));
  const alreadyPaid = Number(inv.profit || 0);
  const remainingProfit = parseFloat(Math.max(0, totalProfit - alreadyPaid).toFixed(8));
  const returnCapital = !plan || plan.capitalReturn !== "no";
  const capitalReturn = returnCapital ? amount : 0;
  const totalPayout = parseFloat((remainingProfit + capitalReturn).toFixed(8));
  const currency = inv.currency || "USD";
  const maturity = inv.maturityDate ? new Date(inv.maturityDate) : new Date();
  const now = new Date();
  const daysUntil = Math.max(0, Math.ceil((maturity.getTime() - now.getTime()) / MS_DAY));

  return {
    investmentId: inv.id,
    planName: inv.planName || "Investment Plan",
    investedAmount: amount,
    currency,
    profitEarned: alreadyPaid,
    remainingProfit,
    capitalReturn,
    totalPayout,
    totalPayoutUsd: await convertToUsd(totalPayout, currency),
    roiPercent,
    investedAt: inv.createdAt.toISOString(),
    maturityDate: maturity.toISOString(),
    daysUntil,
    durationDays: plan?.durationDays ?? null,
    profitFrequency: plan?.profitFrequency ?? null,
    capitalReturnPolicy: plan?.capitalReturn ?? "yes",
  };
}

function isWithinMaturityChoiceWindow(maturityDate: Date | null): boolean {
  if (!maturityDate) return false;
  const daysUntil = Math.ceil((maturityDate.getTime() - Date.now()) / MS_DAY);
  return daysUntil <= 1;
}

export async function listPendingMaturityChoices(userId: number) {
  const active = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.userId, userId), eq(investmentsTable.status, "active")));

  const pending = active.filter(inv =>
    inv.maturityDate &&
    !inv.maturityPayoutAcknowledgedAt &&
    isWithinMaturityChoiceWindow(inv.maturityDate),
  );

  return Promise.all(pending.map(async inv => ({
    ...(await computeMaturityPayoutBreakdown(inv)),
    type: inv.type,
    status: inv.status,
  })));
}

export async function submitMaturityPayoutChoice(
  userId: number,
  investmentId: number,
  opts: {
    destination: "wallet" | "personal";
    paymentAccountId?: number;
    paymentMethod?: string;
    consent: boolean;
  },
) {
  if (!opts.consent) {
    throw new Error("You must authorize the payout destination to continue.");
  }

  const [inv] = await db.select().from(investmentsTable)
    .where(and(eq(investmentsTable.id, investmentId), eq(investmentsTable.userId, userId)))
    .limit(1);

  if (!inv) throw new Error("Investment not found");
  if (inv.status !== "active") throw new Error("Investment is not active");
  if (inv.maturityPayoutAcknowledgedAt) throw new Error("Payout preference already submitted");
  if (!inv.maturityDate || !isWithinMaturityChoiceWindow(inv.maturityDate)) {
    throw new Error("Maturity payout choice is only available from one day before maturity.");
  }

  const now = new Date();
  const updates: Partial<typeof investmentsTable.$inferInsert> = {
    maturityPayoutDestination: opts.destination,
    maturityPayoutConsentAt: now,
    maturityPayoutAcknowledgedAt: now,
    maturityPayoutAccountId: null,
    maturityPayoutMethod: null,
  };

  if (opts.destination === "personal") {
    if (!opts.paymentAccountId) throw new Error("Select a payout account for personal withdrawal.");
    const [account] = await db.select().from(userPaymentAccountsTable)
      .where(and(
        eq(userPaymentAccountsTable.id, opts.paymentAccountId),
        eq(userPaymentAccountsTable.userId, userId),
        eq(userPaymentAccountsTable.isActive, true),
      ))
      .limit(1);
    if (!account) throw new Error("Payout account not found");

    const method = opts.paymentMethod || account.accountType;
    if (!["upi", "bank", "crypto"].includes(method)) {
      throw new Error("Invalid payout method");
    }
    if (account.accountType !== method) {
      throw new Error("Selected account does not match the payout method.");
    }

    updates.maturityPayoutAccountId = account.id;
    updates.maturityPayoutMethod = method;
  }

  const [updated] = await db.update(investmentsTable).set(updates)
    .where(eq(investmentsTable.id, investmentId))
    .returning();

  await notifyUser({
    userId,
    title: "Maturity payout preference saved",
    message: opts.destination === "wallet"
      ? `Your ${inv.planName || "investment"} maturity proceeds will be credited to your platform wallet.`
      : `Your ${inv.planName || "investment"} maturity proceeds will be sent to your selected ${opts.paymentMethod} account after admin approval.`,
    type: "success",
    category: "investment",
    actionUrl: "/investments",
  });

  return {
    investment: updated,
    breakdown: await computeMaturityPayoutBreakdown(updated),
  };
}

/** Settle maturity to platform wallet (existing behaviour). */
export async function settleMaturityToWallet(
  inv: typeof investmentsTable.$inferSelect,
  settleFn: (inv: typeof investmentsTable.$inferSelect, note: string) => Promise<boolean>,
  note: string,
) {
  return settleFn(inv, note);
}

/** Credit maturity internally then queue personal-account withdrawal for admin approval. */
export async function settleMaturityToPersonalAccount(inv: typeof investmentsTable.$inferSelect) {
  if (inv.status !== "active") return false;
  if (!inv.maturityPayoutAccountId || inv.maturityPayoutDestination !== "personal") {
    throw new Error("Personal payout not configured for this investment");
  }

  const breakdown = await computeMaturityPayoutBreakdown(inv);
  const currency = breakdown.currency as any;
  const userId = inv.userId;

  if (breakdown.remainingProfit > 0) {
    await creditWallet({
      userId,
      amount: breakdown.remainingProfit,
      currency,
      type: "profit",
      referenceType: "investment",
      referenceId: inv.id,
      description: `Maturity profit — ${breakdown.planName} #${inv.id}`,
    });
  }

  if (breakdown.capitalReturn > 0) {
    await creditWallet({
      userId,
      amount: breakdown.capitalReturn,
      currency,
      type: "investment",
      referenceType: "investment",
      referenceId: inv.id,
      description: `Maturity capital return — ${breakdown.planName} #${inv.id}`,
    });
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user && breakdown.remainingProfit > 0) {
    await db.update(usersTable).set({
      totalProfit: String(Number(user.totalProfit) + breakdown.remainingProfit),
    }).where(eq(usersTable.id, userId));
  }

  const paymentMethod = inv.maturityPayoutMethod || "bank";
  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(breakdown.totalPayout),
    currency,
    paymentMethod,
    paymentAccountId: inv.maturityPayoutAccountId,
    gatewayProvider: "maturity_payout",
    notes: `Investment maturity payout — ${breakdown.planName} #${inv.id} | ROI ${breakdown.roiPercent}%`,
    status: "pending",
  }).returning();

  await debitWallet({
    userId,
    amount: breakdown.totalPayout,
    currency: ["BTC", "ETH", "USDT"].includes(currency) ? currency : "USD",
    type: "withdrawal",
    referenceType: "transaction",
    referenceId: txn.id,
    description: `Maturity withdrawal #${txn.id} — ${breakdown.planName}`,
  });

  await db.update(investmentsTable).set({
    status: "completed",
    profit: String(breakdown.profitEarned + breakdown.remainingProfit),
    profitPercent: String(breakdown.roiPercent),
  }).where(eq(investmentsTable.id, inv.id));

  const plan = await resolvePlan(inv.planName);
  const { maybeAutoRenew } = await import("./roiEngine");
  await maybeAutoRenew(inv, plan);

  await notifyUser({
    userId,
    title: "Maturity payout queued",
    message: `Your ${breakdown.planName} maturity payout of ${breakdown.totalPayout} ${currency} is pending admin transfer to your personal account.`,
    type: "info",
    category: "withdrawal",
    actionUrl: "/transactions",
  });

  return { ok: true, transactionId: txn.id };
}

export function mapPaymentAccount(a: typeof userPaymentAccountsTable.$inferSelect) {
  return {
    id: a.id,
    label: a.label,
    accountType: a.accountType,
    accountHolderName: a.accountHolderName || null,
    bankName: a.bankName || null,
    accountNumber: a.accountNumber || null,
    ifscCode: a.ifscCode || null,
    branchName: a.branchName || null,
    upiId: a.upiId || null,
    upiQrUrl: a.upiQrUrl || null,
    cryptoSymbol: a.cryptoSymbol || null,
    cryptoNetwork: a.cryptoNetwork || null,
    walletAddress: a.walletAddress || null,
    walletQrUrl: a.walletQrUrl || null,
    isDefault: a.isDefault,
  };
}

export async function getTransactionPayoutAccount(transactionId: number) {
  const [txn] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.id, transactionId))
    .limit(1);
  if (!txn?.paymentAccountId) return null;

  const [account] = await db.select().from(userPaymentAccountsTable)
    .where(eq(userPaymentAccountsTable.id, txn.paymentAccountId))
    .limit(1);
  if (!account) return null;

  return {
    transaction: {
      id: txn.id,
      userId: txn.userId,
      type: txn.type,
      amount: Number(txn.amount),
      currency: txn.currency,
      status: txn.status,
      paymentMethod: txn.paymentMethod,
      notes: txn.notes,
      gatewayProvider: txn.gatewayProvider,
      paymentAccountId: txn.paymentAccountId,
      createdAt: txn.createdAt.toISOString(),
    },
    account: mapPaymentAccount(account),
    isMaturityPayout: txn.gatewayProvider === "maturity_payout",
  };
}
