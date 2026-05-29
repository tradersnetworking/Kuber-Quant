import { db, dbRead, walletLedgerTable, transactionsTable, usersTable } from "@workspace/db";
import { eq, and, gte, lte, desc } from "@workspace/db/orm";

export async function buildInvestorStatementCsv(userId: number, from: Date, to: Date): Promise<string> {
  const [user] = await db.select({ email: usersTable.email, fullName: usersTable.fullName })
    .from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  const ledger = await dbRead.select().from(walletLedgerTable)
    .where(and(
      eq(walletLedgerTable.userId, userId),
      gte(walletLedgerTable.createdAt, from),
      lte(walletLedgerTable.createdAt, to),
    ))
    .orderBy(desc(walletLedgerTable.createdAt));

  const txns = await dbRead.select().from(transactionsTable)
    .where(and(
      eq(transactionsTable.userId, userId),
      gte(transactionsTable.createdAt, from),
      lte(transactionsTable.createdAt, to),
    ))
    .orderBy(desc(transactionsTable.createdAt));

  const lines = [
    "Kuber Quant — Investor Statement",
    `Account: ${user?.fullName || "User"} (${user?.email || userId})`,
    `Period: ${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}`,
    "",
    "=== Wallet Ledger ===",
    "Date,Type,Amount,Currency,Balance After,Description",
    ...ledger.map(e => [
      e.createdAt.toISOString(),
      e.type,
      e.amount,
      e.currency,
      e.balanceAfter,
      `"${(e.description || "").replace(/"/g, '""')}"`,
    ].join(",")),
    "",
    "=== Transactions ===",
    "Date,Type,Amount,Currency,Status,Method",
    ...txns.map(t => [
      t.createdAt.toISOString(),
      t.type,
      t.amount,
      t.currency,
      t.status,
      t.paymentMethod || "",
    ].join(",")),
  ];

  return lines.join("\n");
}
