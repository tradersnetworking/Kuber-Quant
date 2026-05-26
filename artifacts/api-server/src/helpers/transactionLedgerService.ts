import {
  db,
  transactionsTable,
  usersTable,
  walletLedgerTable,
  siteSettingsTable,
  type Transaction,
} from "@workspace/db";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { creditWallet, debitWallet, mapLedgerEntry, WalletError } from "./walletService";
import { sendTransactionalEmail, buildTransactionEmail } from "./mailer";
import { notifyUser } from "./notificationService";

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

export async function getLedgerEntriesForTransaction(transactionId: number) {
  return db.select().from(walletLedgerTable).where(and(
    eq(walletLedgerTable.referenceType, "transaction"),
    eq(walletLedgerTable.referenceId, transactionId),
  ));
}

export async function hasLedgerHoldForTransaction(transactionId: number) {
  const rows = await getLedgerEntriesForTransaction(transactionId);
  return rows.some(r => r.type === "withdrawal" && Number(r.amount) < 0);
}

export async function approveTransaction(opts: {
  transactionId: number;
  reviewerUserId: number;
  adminNotes?: string;
}): Promise<Transaction> {
  const [existing] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.id, opts.transactionId)).limit(1);
  if (!existing) throw new WalletError("Transaction not found", "NOT_FOUND");
  if (existing.status !== "pending") {
    throw new WalletError("Transaction is not pending", "INVALID_STATUS");
  }

  if (existing.type === "deposit") {
    await creditWallet({
      userId: existing.userId,
      amount: Number(existing.amount),
      currency: existing.currency,
      type: "deposit",
      referenceType: "transaction",
      referenceId: existing.id,
      description: `Deposit approved — ${existing.paymentMethod || "manual"}`,
    });
  } else if (existing.type === "withdrawal") {
    const held = await hasLedgerHoldForTransaction(existing.id);
    if (!held) {
      const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
      const fee = Number(existing.amount) * (feePercent / 100);
      await debitWallet({
        userId: existing.userId,
        amount: Number(existing.amount) + fee,
        currency: existing.currency,
        type: "withdrawal",
        referenceType: "transaction",
        referenceId: existing.id,
        description: `Withdrawal approved #${existing.id} (fee: ${fee.toFixed(2)})`,
      });
    }
  }

  const now = new Date();
  const [txn] = await db.update(transactionsTable).set({
    status: "approved",
    adminNotes: opts.adminNotes || null,
    reviewedByUserId: opts.reviewerUserId,
    reviewedAt: now,
    updatedAt: now,
  }).where(eq(transactionsTable.id, opts.transactionId)).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, txn.userId)).limit(1);
  if (user) {
    const purpose = txn.type === "deposit" ? "deposit_approved" : "withdrawal_approved";
    await sendTransactionalEmail({
      to: user.email,
      purpose,
      subject: `Kuber Quant — ${txn.type} approved`,
      html: buildTransactionEmail({
        name: user.fullName,
        type: txn.type,
        amount: txn.amount,
        currency: txn.currency,
        status: "approved",
      }),
    });
    await notifyUser({
      userId: user.id,
      title: txn.type === "deposit" ? "Deposit Approved" : "Withdrawal Approved",
      message: `Your ${txn.type} of ${txn.amount} ${txn.currency} has been approved.`,
      type: "success",
      category: txn.type === "deposit" ? "deposit" : "withdrawal",
      actionUrl: "/transactions",
    });
  }

  return txn;
}

export async function rejectTransaction(opts: {
  transactionId: number;
  reviewerUserId: number;
  adminNotes?: string;
}): Promise<Transaction> {
  const [existing] = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.id, opts.transactionId)).limit(1);
  if (!existing) throw new WalletError("Transaction not found", "NOT_FOUND");
  if (existing.status !== "pending") {
    throw new WalletError("Transaction is not pending", "INVALID_STATUS");
  }

  if (existing.type === "withdrawal") {
    const held = await hasLedgerHoldForTransaction(existing.id);
    if (held) {
      const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
      const fee = Number(existing.amount) * (feePercent / 100);
      await creditWallet({
        userId: existing.userId,
        amount: Number(existing.amount) + fee,
        currency: existing.currency,
        type: "adjustment",
        referenceType: "transaction",
        referenceId: existing.id,
        description: "Withdrawal rejected — funds returned",
      });
    }
  }

  const now = new Date();
  const [txn] = await db.update(transactionsTable).set({
    status: "rejected",
    adminNotes: opts.adminNotes || null,
    reviewedByUserId: opts.reviewerUserId,
    reviewedAt: now,
    updatedAt: now,
  }).where(eq(transactionsTable.id, opts.transactionId)).returning();

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, txn.userId)).limit(1);
  if (user) {
    const purpose = txn.type === "deposit" ? "deposit_rejected" : "withdrawal_rejected";
    await sendTransactionalEmail({
      to: user.email,
      purpose,
      subject: `Kuber Quant — ${txn.type} update`,
      html: buildTransactionEmail({
        name: user.fullName,
        type: txn.type,
        amount: txn.amount,
        currency: txn.currency,
        status: "rejected",
        notes: opts.adminNotes || undefined,
      }),
    });
    await notifyUser({
      userId: user.id,
      title: txn.type === "deposit" ? "Deposit Rejected" : "Withdrawal Rejected",
      message: `Your ${txn.type} of ${txn.amount} ${txn.currency} was not approved.${opts.adminNotes ? ` Reason: ${opts.adminNotes}` : ""}`,
      type: "warning",
      category: txn.type === "deposit" ? "deposit" : "withdrawal",
      actionUrl: "/transactions",
    });
  }

  return txn;
}

export async function getPlatformLedger(opts: {
  userIds?: number[];
  types?: ("deposit" | "withdrawal")[];
  limit?: number;
  offset?: number;
}) {
  const limit = Math.min(opts.limit ?? 100, 500);
  const offset = opts.offset ?? 0;
  const conditions = [];
  if (opts.userIds?.length) {
    conditions.push(inArray(walletLedgerTable.userId, opts.userIds));
  }
  if (opts.types?.length) {
    conditions.push(inArray(walletLedgerTable.type, opts.types));
  } else {
    conditions.push(inArray(walletLedgerTable.type, ["deposit", "withdrawal", "adjustment"]));
  }

  const entries = await db.select().from(walletLedgerTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(walletLedgerTable.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = [...new Set(entries.map(e => e.userId))];
  const users = userIds.length
    ? await db.select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
    }).from(usersTable).where(inArray(usersTable.id, userIds))
    : [];
  const userMap = new Map(users.map(u => [u.id, u]));

  const txnIds = entries
    .filter(e => e.referenceType === "transaction" && e.referenceId)
    .map(e => e.referenceId!);
  const txns = txnIds.length
    ? await db.select().from(transactionsTable).where(inArray(transactionsTable.id, txnIds))
    : [];
  const txnMap = new Map(txns.map(t => [t.id, t]));

  return entries.map(e => {
    const u = userMap.get(e.userId);
    const txn = e.referenceId ? txnMap.get(e.referenceId) : undefined;
    return {
      ...mapLedgerEntry(e),
      userId: e.userId,
      userEmail: u?.email || null,
      userName: u?.fullName || null,
      transactionStatus: txn?.status || null,
      transactionType: txn?.type || null,
    };
  });
}

export async function countPlatformLedger(userIds?: number[]) {
  const conditions = [inArray(walletLedgerTable.type, ["deposit", "withdrawal", "adjustment"])];
  if (userIds?.length) conditions.push(inArray(walletLedgerTable.userId, userIds));
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(walletLedgerTable)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export async function getLedgerQueueSummary(userIds?: number[]) {
  const conditions = userIds?.length ? [inArray(transactionsTable.userId, userIds)] : [];
  const txns = await db.select().from(transactionsTable)
    .where(conditions.length ? and(...conditions) : undefined);

  const pending = txns.filter(t => t.status === "pending");
  return {
    pendingDeposits: pending.filter(t => t.type === "deposit").length,
    pendingWithdrawals: pending.filter(t => t.type === "withdrawal").length,
    pendingDepositAmount: pending.filter(t => t.type === "deposit").reduce((s, t) => s + Number(t.amount), 0),
    pendingWithdrawalAmount: pending.filter(t => t.type === "withdrawal").reduce((s, t) => s + Number(t.amount), 0),
    totalPending: pending.length,
  };
}
