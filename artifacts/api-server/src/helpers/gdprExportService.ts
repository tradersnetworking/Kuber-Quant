import {
  db, usersTable, userProfilesTable, kycRecordsTable, transactionsTable,
  investmentsTable, ticketsTable, walletLedgerTable,
} from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";

function redactKyc(kyc: typeof kycRecordsTable.$inferSelect) {
  return {
    id: kyc.id,
    fullName: kyc.fullName,
    address: kyc.address,
    country: kyc.country,
    idType: kyc.idType,
    status: kyc.status,
    verifiedAt: kyc.verifiedAt?.toISOString() || null,
    createdAt: kyc.createdAt.toISOString(),
    updatedAt: kyc.updatedAt?.toISOString() || null,
  };
}

export async function buildUserDataExport(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  const [profile] = await db.select().from(userProfilesTable)
    .where(eq(userProfilesTable.userId, userId)).limit(1);
  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId)).limit(1);

  const transactions = await db.select({
    id: transactionsTable.id,
    type: transactionsTable.type,
    amount: transactionsTable.amount,
    currency: transactionsTable.currency,
    status: transactionsTable.status,
    paymentMethod: transactionsTable.paymentMethod,
    createdAt: transactionsTable.createdAt,
  }).from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(500);

  const investments = await db.select({
    id: investmentsTable.id,
    type: investmentsTable.type,
    planName: investmentsTable.planName,
    amount: investmentsTable.amount,
    status: investmentsTable.status,
    createdAt: investmentsTable.createdAt,
  }).from(investmentsTable).where(eq(investmentsTable.userId, userId)).orderBy(desc(investmentsTable.createdAt)).limit(200);

  const tickets = await db.select({
    id: ticketsTable.id,
    subject: ticketsTable.subject,
    category: ticketsTable.category,
    status: ticketsTable.status,
    createdAt: ticketsTable.createdAt,
  }).from(ticketsTable).where(eq(ticketsTable.userId, userId)).orderBy(desc(ticketsTable.createdAt)).limit(100);

  const ledger = await db.select({
    id: walletLedgerTable.id,
    type: walletLedgerTable.type,
    amount: walletLedgerTable.amount,
    currency: walletLedgerTable.currency,
    balanceAfter: walletLedgerTable.balanceAfter,
    createdAt: walletLedgerTable.createdAt,
  }).from(walletLedgerTable).where(eq(walletLedgerTable.userId, userId)).orderBy(desc(walletLedgerTable.createdAt)).limit(500);

  return {
    exportedAt: new Date().toISOString(),
    format: "kuber-quant-gdpr-export-v1",
    account: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      kycStatus: user.kycStatus,
      referralCode: user.referralCode,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    profile: profile ? {
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      postalCode: profile.postalCode,
    } : null,
    kyc: kyc ? redactKyc(kyc) : null,
    transactions: transactions.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    investments: investments.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })),
    supportTickets: tickets.map(t => ({ ...t, createdAt: t.createdAt.toISOString() })),
    walletLedger: ledger.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })),
  };
}
