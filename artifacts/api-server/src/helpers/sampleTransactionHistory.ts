import bcrypt from "bcryptjs";
import {
  db,
  transactionsTable,
  usersTable,
  walletLedgerTable,
} from "@workspace/db";
import { eq, and, like, inArray, or } from "@workspace/db/orm";
import { creditWallet, debitWallet, getBalancesFromLedger } from "./walletService";
import { approveTransaction } from "./transactionLedgerService";
import { logger } from "../lib/logger";

export const SAMPLE_TXN_SEED_TAG = "sample_seed_v1";

/** Demo investor emails — sample txns are scoped to these accounts only. */
export const DEMO_INVESTOR_EMAILS = [
  "user@kuberquant.com",
  "client2@kuberquant.com",
  "client3@kuberquant.com",
] as const;

export type SampleTxnSpec = {
  daysAgo: number;
  type: "deposit" | "withdrawal";
  amount: number;
  currency: string;
  status: "approved" | "pending" | "rejected";
  paymentMethod: string;
  notes?: string;
  utrReference?: string;
  /** Pending withdrawal — reserve funds in wallet (ledger hold). */
  withHold?: boolean;
};

export const DEMO_CLIENT_ACCOUNTS = [
  {
    email: "client2@kuberquant.com",
    password: "client123",
    fullName: "Priya Mehta",
    referralCode: "KCCLI02",
  },
  {
    email: "client3@kuberquant.com",
    password: "client123",
    fullName: "Arjun Patel",
    referralCode: "KCCLI03",
  },
] as const;

/** Minimum set: approved history + pending queue + one rejection (primary investor). */
const PRIMARY_INVESTOR_SPECS: SampleTxnSpec[] = [
  { daysAgo: 10, type: "deposit", amount: 8000, currency: "USD", status: "approved", paymentMethod: "bank_transfer", notes: "Initial demo funding", utrReference: "NEFT-DEMO-001" },
  { daysAgo: 7, type: "withdrawal", amount: 500, currency: "USD", status: "approved", paymentMethod: "upi", notes: "Completed demo withdrawal" },
  { daysAgo: 3, type: "deposit", amount: 1000, currency: "USD", status: "pending", paymentMethod: "bank_transfer", notes: "Pending deposit — admin review", utrReference: "NEFT-DEMO-P01" },
  { daysAgo: 2, type: "withdrawal", amount: 250, currency: "USD", status: "pending", paymentMethod: "bank_transfer", notes: "Pending withdrawal — admin review", withHold: true },
  { daysAgo: 1, type: "deposit", amount: 300, currency: "USD", status: "rejected", paymentMethod: "bank_transfer", notes: "Rejected — proof mismatch demo" },
];

const CLIENT2_SPECS: SampleTxnSpec[] = [
  { daysAgo: 8, type: "deposit", amount: 3000, currency: "USD", status: "approved", paymentMethod: "upi", notes: "Client 2 funding" },
  { daysAgo: 4, type: "deposit", amount: 600, currency: "USD", status: "pending", paymentMethod: "razorpay", notes: "Client 2 pending deposit" },
  { daysAgo: 2, type: "withdrawal", amount: 150, currency: "USD", status: "pending", paymentMethod: "upi", notes: "Client 2 pending withdrawal", withHold: true },
];

const CLIENT3_SPECS: SampleTxnSpec[] = [
  { daysAgo: 6, type: "deposit", amount: 1500, currency: "USD", status: "approved", paymentMethod: "bank_transfer", notes: "Client 3 starter deposit" },
  { daysAgo: 1, type: "deposit", amount: 400, currency: "USD", status: "pending", paymentMethod: "upi", notes: "Client 3 pending deposit" },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), (days * 7) % 60, 0, 0);
  return d;
}

function taggedNotes(spec: SampleTxnSpec): string {
  const base = spec.notes || `Sample ${spec.type}`;
  return `${base} · ${SAMPLE_TXN_SEED_TAG}`;
}

async function syncUserBalancesFromLedger(userId: number): Promise<void> {
  const { fiat, crypto } = await getBalancesFromLedger(userId);
  await db.update(usersTable).set({
    balanceFiat: String(fiat),
    balanceCrypto: String(crypto),
  }).where(eq(usersTable.id, userId));
}

async function removeLegacyOrphanDeposit(userId: number): Promise<void> {
  const legacy = await db.select().from(transactionsTable).where(and(
    eq(transactionsTable.userId, userId),
    eq(transactionsTable.status, "approved"),
    like(transactionsTable.notes, "%Demo seed deposit for trading services%"),
  ));
  for (const row of legacy) {
    const [ledger] = await db.select().from(walletLedgerTable).where(and(
      eq(walletLedgerTable.referenceType, "transaction"),
      eq(walletLedgerTable.referenceId, row.id),
    )).limit(1);
    if (!ledger) {
      await db.delete(transactionsTable).where(eq(transactionsTable.id, row.id));
    }
  }
}

async function backdateTransaction(txnId: number, when: Date, approved: boolean): Promise<void> {
  await db.update(transactionsTable).set({
    createdAt: when,
    updatedAt: when,
    reviewedAt: approved ? when : null,
  }).where(eq(transactionsTable.id, txnId));

  await db.update(walletLedgerTable).set({ createdAt: when }).where(and(
    eq(walletLedgerTable.referenceType, "transaction"),
    eq(walletLedgerTable.referenceId, txnId),
  ));
}

async function seedSpecsForUser(
  userId: number,
  reviewerUserId: number,
  specs: SampleTxnSpec[],
): Promise<number> {
  await removeLegacyOrphanDeposit(userId);

  await db.update(usersTable).set({
    balanceFiat: "0",
    balanceCrypto: "0",
  }).where(eq(usersTable.id, userId));

  const ordered = [...specs].sort((a, b) => b.daysAgo - a.daysAgo);
  let inserted = 0;

  for (const spec of ordered) {
    const eventAt = daysAgo(spec.daysAgo);
    const notes = taggedNotes(spec);

    if (spec.status === "rejected") {
      await db.insert(transactionsTable).values({
        userId,
        type: spec.type,
        amount: String(spec.amount),
        currency: spec.currency as any,
        status: "rejected",
        paymentMethod: spec.paymentMethod,
        notes,
        utrReference: spec.utrReference ?? null,
        reviewedByUserId: reviewerUserId,
        reviewedAt: eventAt,
        adminNotes: "Sample rejected for UI demo",
        createdAt: eventAt,
        updatedAt: eventAt,
      });
      inserted++;
      continue;
    }

    if (spec.status === "pending" && spec.type === "deposit") {
      await db.insert(transactionsTable).values({
        userId,
        type: "deposit",
        amount: String(spec.amount),
        currency: spec.currency as any,
        status: "pending",
        paymentMethod: spec.paymentMethod,
        notes,
        utrReference: spec.utrReference ?? null,
        createdAt: eventAt,
        updatedAt: eventAt,
      });
      inserted++;
      continue;
    }

    if (spec.status === "pending" && spec.type === "withdrawal") {
      const feePercent = 2;
      const isCrypto = spec.currency.toUpperCase() === "USDT";
      const fee = spec.amount * (feePercent / 100);
      const totalDebit = spec.amount + fee;

      const [txn] = await db.insert(transactionsTable).values({
        userId,
        type: "withdrawal",
        amount: String(spec.amount),
        currency: spec.currency as any,
        status: "pending",
        paymentMethod: spec.paymentMethod,
        notes,
        createdAt: eventAt,
        updatedAt: eventAt,
      }).returning();

      if (spec.withHold !== false) {
        try {
          await debitWallet({
            userId,
            amount: totalDebit,
            currency: isCrypto ? "USDT" : "USD",
            type: "withdrawal",
            referenceType: "transaction",
            referenceId: txn.id,
            description: `Withdrawal #${txn.id} — pending (sample seed)`,
          });
          await backdateTransaction(txn.id, eventAt, false);
        } catch (err) {
          logger.warn({ userId, txnId: txn.id, err }, "Sample pending withdrawal hold skipped — insufficient balance");
        }
      }
      inserted++;
      continue;
    }

    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: spec.type,
      amount: String(spec.amount),
      currency: spec.currency as any,
      status: "pending",
      paymentMethod: spec.paymentMethod,
      notes,
      utrReference: spec.utrReference ?? null,
      createdAt: eventAt,
      updatedAt: eventAt,
    }).returning();

    try {
      await approveTransaction({
        transactionId: txn.id,
        reviewerUserId,
        adminNotes: "Sample approved for UI demo",
        skipDualApproval: true,
      });
      await backdateTransaction(txn.id, eventAt, true);
      inserted++;
    } catch (err) {
      logger.warn({ userId, txnId: txn.id, err }, "Sample transaction approval failed");
      await db.delete(transactionsTable).where(eq(transactionsTable.id, txn.id));
    }
  }

  await syncUserBalancesFromLedger(userId);
  return inserted;
}

export async function upsertDemoClientUsers(managerId: number | null): Promise<void> {
  for (const client of DEMO_CLIENT_ACCOUNTS) {
    const hash = await bcrypt.hash(client.password, 10);
    await db.insert(usersTable).values({
      email: client.email,
      passwordHash: hash,
      fullName: client.fullName,
      role: "user",
      kycStatus: "verified",
      balanceFiat: "0",
      balanceCrypto: "0",
      totalProfit: "0",
      referralCode: client.referralCode,
      isActive: true,
      managerId,
      depositsEnabled: true,
      withdrawalsEnabled: true,
    }).onConflictDoUpdate({
      target: usersTable.email,
      set: {
        fullName: client.fullName,
        kycStatus: "verified",
        isActive: true,
        managerId,
        depositsEnabled: true,
        withdrawalsEnabled: true,
      },
    });
  }
}

/** Remove all sample-tagged transactions and their ledger rows for demo investors. */
export async function clearSampleTransactionData(): Promise<{ txnsRemoved: number; usersReset: number }> {
  const demoUsers = await db.select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(inArray(usersTable.email, [...DEMO_INVESTOR_EMAILS]));

  const userIds = demoUsers.map(u => u.id);
  if (userIds.length === 0) {
    return { txnsRemoved: 0, usersReset: 0 };
  }

  const sampleTxns = await db.select().from(transactionsTable).where(and(
    inArray(transactionsTable.userId, userIds),
    or(
      like(transactionsTable.notes, `%${SAMPLE_TXN_SEED_TAG}%`),
      like(transactionsTable.notes, "%Demo seed deposit for trading services%"),
    ),
  ));

  const txnIds = sampleTxns.map(t => t.id);
  if (txnIds.length > 0) {
    await db.delete(walletLedgerTable).where(and(
      eq(walletLedgerTable.referenceType, "transaction"),
      inArray(walletLedgerTable.referenceId, txnIds),
    ));
    await db.delete(transactionsTable).where(inArray(transactionsTable.id, txnIds));
  }

  for (const userId of userIds) {
    await removeLegacyOrphanDeposit(userId);
    await syncUserBalancesFromLedger(userId);
  }

  logger.info({ txnsRemoved: txnIds.length, usersReset: userIds.length }, "Sample transaction data cleared");
  return { txnsRemoved: txnIds.length, usersReset: userIds.length };
}

async function seedAllSampleTransactions(): Promise<{ usersSeeded: number; txnsInserted: number; pendingCount: number }> {
  const [admin] = await db.select().from(usersTable).where(eq(usersTable.email, "admin@kuberquant.com")).limit(1);
  const [manager] = await db.select().from(usersTable).where(eq(usersTable.email, "manager@kuberquant.com")).limit(1);
  const [investor] = await db.select().from(usersTable).where(eq(usersTable.email, "user@kuberquant.com")).limit(1);

  if (!admin || !investor) {
    logger.warn("Sample transaction seed skipped — default users missing");
    return { usersSeeded: 0, txnsInserted: 0, pendingCount: 0 };
  }

  const reviewerId = admin.id;
  const managerId = manager?.id ?? null;

  await upsertDemoClientUsers(managerId);

  if (managerId) {
    await db.update(usersTable).set({ managerId }).where(eq(usersTable.email, "user@kuberquant.com"));
  }

  const client2 = await db.select().from(usersTable).where(eq(usersTable.email, "client2@kuberquant.com")).limit(1).then(r => r[0]);
  const client3 = await db.select().from(usersTable).where(eq(usersTable.email, "client3@kuberquant.com")).limit(1).then(r => r[0]);

  let txnsInserted = 0;
  txnsInserted += await seedSpecsForUser(investor.id, reviewerId, PRIMARY_INVESTOR_SPECS);
  if (client2) txnsInserted += await seedSpecsForUser(client2.id, reviewerId, CLIENT2_SPECS);
  if (client3) txnsInserted += await seedSpecsForUser(client3.id, reviewerId, CLIENT3_SPECS);

  const pendingRows = await db.select({ id: transactionsTable.id }).from(transactionsTable).where(and(
    inArray(transactionsTable.userId, [investor.id, client2?.id, client3?.id].filter(Boolean) as number[]),
    eq(transactionsTable.status, "pending"),
    like(transactionsTable.notes, `%${SAMPLE_TXN_SEED_TAG}%`),
  ));

  const usersSeeded = [investor, client2, client3].filter(Boolean).length;
  return { usersSeeded, txnsInserted, pendingCount: pendingRows.length };
}

export async function ensureSampleTransactionHistory(): Promise<{ usersSeeded: number; txnsInserted: number }> {
  const [existing] = await db.select({ id: transactionsTable.id }).from(transactionsTable)
    .where(like(transactionsTable.notes, `%${SAMPLE_TXN_SEED_TAG}%`))
    .limit(1);

  if (existing) {
    return { usersSeeded: 0, txnsInserted: 0 };
  }

  const result = await seedAllSampleTransactions();
  if (result.txnsInserted > 0) {
    logger.info(result, "Sample transaction history seeded");
  }
  return { usersSeeded: result.usersSeeded, txnsInserted: result.txnsInserted };
}

/** Clear existing sample data and insert a fresh minimal demo set. */
export async function refreshSampleTransactionHistory(): Promise<{
  usersSeeded: number;
  txnsInserted: number;
  txnsRemoved: number;
  pendingCount: number;
}> {
  const { txnsRemoved } = await clearSampleTransactionData();
  const result = await seedAllSampleTransactions();
  logger.info({ ...result, txnsRemoved }, "Sample transaction history refreshed");
  return { ...result, txnsRemoved };
}

export const DEMO_ROLE_LOGINS = {
  investor: { email: "user@kuberquant.com", password: "user123", role: "Investor" },
  client2: { email: "client2@kuberquant.com", password: "client123", role: "Manager client" },
  client3: { email: "client3@kuberquant.com", password: "client123", role: "Manager client" },
  manager: { email: "manager@kuberquant.com", password: "manager123", role: "Manager" },
  admin: { email: "admin@kuberquant.com", password: "admin123", role: "Admin" },
  superadmin: { email: "superadmin@kuberquant.com", password: "superadmin123", role: "Super Admin" },
  support: { email: "support@kuberquant.com", password: "support123", role: "Support" },
} as const;
