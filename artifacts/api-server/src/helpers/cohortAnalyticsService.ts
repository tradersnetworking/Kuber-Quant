import { dbRead, db, usersTable, transactionsTable } from "@workspace/db";
import { eq, gte, and, sql } from "@workspace/db/orm";

export type CohortRow = {
  month: string;
  signups: number;
  verifiedKyc: number;
  firstDeposit: number;
  activeInvestors: number;
  depositConversionPct: number;
};

export async function computeCohortAnalytics(months = 12): Promise<{
  cohorts: CohortRow[];
  summary: {
    totalUsers: number;
    verifiedKyc: number;
    usersWithDeposit: number;
    depositConversionPct: number;
  };
}> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - months);

  const readDb = dbRead;

  const users = await readDb.select({
    id: usersTable.id,
    kycStatus: usersTable.kycStatus,
    createdAt: usersTable.createdAt,
  }).from(usersTable).where(gte(usersTable.createdAt, since));

  const deposits = await readDb.select({
    userId: transactionsTable.userId,
    createdAt: transactionsTable.createdAt,
  }).from(transactionsTable).where(and(
    eq(transactionsTable.type, "deposit"),
    eq(transactionsTable.status, "approved"),
    gte(transactionsTable.createdAt, since),
  ));

  const firstDepositByUser = new Map<number, Date>();
  for (const d of deposits) {
    const existing = firstDepositByUser.get(d.userId);
    if (!existing || d.createdAt < existing) {
      firstDepositByUser.set(d.userId, d.createdAt);
    }
  }

  const cohortMap = new Map<string, CohortRow>();

  for (const u of users) {
    const month = u.createdAt.toISOString().slice(0, 7);
    let row = cohortMap.get(month);
    if (!row) {
      row = { month, signups: 0, verifiedKyc: 0, firstDeposit: 0, activeInvestors: 0, depositConversionPct: 0 };
      cohortMap.set(month, row);
    }
    row.signups += 1;
    if (u.kycStatus === "verified") row.verifiedKyc += 1;
    if (firstDepositByUser.has(u.id)) row.firstDeposit += 1;
  }

  const cohorts = [...cohortMap.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(row => ({
      ...row,
      depositConversionPct: row.signups > 0
        ? Math.round((row.firstDeposit / row.signups) * 1000) / 10
        : 0,
    }));

  const [totalRow] = await readDb.select({ count: sql<number>`count(*)::int` }).from(usersTable);
  const [verifiedRow] = await readDb.select({ count: sql<number>`count(*)::int` })
    .from(usersTable).where(eq(usersTable.kycStatus, "verified"));
  const usersWithDeposit = firstDepositByUser.size;

  return {
    cohorts,
    summary: {
      totalUsers: totalRow?.count ?? 0,
      verifiedKyc: verifiedRow?.count ?? 0,
      usersWithDeposit,
      depositConversionPct: (totalRow?.count ?? 0) > 0
        ? Math.round((usersWithDeposit / (totalRow?.count ?? 1)) * 1000) / 10
        : 0,
    },
  };
}
