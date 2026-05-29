import { dbRead, usersTable, transactionsTable, investmentsTable, walletLedgerTable } from "@workspace/db";
import { eq, sql, and } from "@workspace/db/orm";
import { convertToUsd } from "./exchangeRateService";

const CRYPTO = new Set(["BTC", "ETH", "USDT", "TRX", "BNB"]);

/** Sanitized platform statistics for public trust display. */
export async function getPublicPlatformStats() {
  const [investors] = await dbRead.select({
    count: sql<number>`count(*) filter (where ${usersTable.role} = 'user')::int`,
  }).from(usersTable);

  const [activeInvestments] = await dbRead.select({
    count: sql<number>`count(*) filter (where status = 'active')::int`,
    total: sql<string>`coalesce(sum(amount::numeric) filter (where status = 'active'), 0)`,
  }).from(investmentsTable);

  const approvedDeposits = await dbRead.select({
    amount: transactionsTable.amount,
    currency: transactionsTable.currency,
  }).from(transactionsTable).where(and(
    eq(transactionsTable.type, "deposit"),
    eq(transactionsTable.status, "approved"),
  ));

  let totalDepositsUsd = 0;
  for (const row of approvedDeposits) {
    if (CRYPTO.has(row.currency.toUpperCase())) {
      totalDepositsUsd += Number(row.amount);
    } else {
      totalDepositsUsd += await convertToUsd(Number(row.amount), row.currency);
    }
  }

  const [profitPaid] = await dbRead.select({
    total: sql<string>`coalesce(sum(amount::numeric) filter (where type = 'profit' and amount::numeric > 0), 0)`,
  }).from(walletLedgerTable);

  const [verifiedKyc] = await dbRead.select({
    count: sql<number>`count(*) filter (where kyc_status = 'verified')::int`,
  }).from(usersTable);

  return {
    investorCount: investors?.count ?? 0,
    activeInvestments: activeInvestments?.count ?? 0,
    activeInvestmentVolumeUsd: Number(activeInvestments?.total ?? 0),
    totalDepositsProcessedUsd: parseFloat(totalDepositsUsd.toFixed(2)),
    totalProfitPaidUsd: Number(profitPaid?.total ?? 0),
    verifiedUsers: verifiedKyc?.count ?? 0,
    updatedAt: new Date().toISOString(),
  };
}
