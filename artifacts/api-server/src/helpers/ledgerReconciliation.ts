import { db, usersTable, walletLedgerTable, transactionsTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "@workspace/db/orm";
import { logger } from "../lib/logger";
import { convertToUsd } from "./exchangeRateService";
import { computePlatformLedgerAudit } from "./platformLedgerAuditService";

export type ReconciliationDrift = {
  userId: number;
  email: string;
  ledgerFiat: number;
  ledgerCrypto: number;
  accountFiat: number;
  accountCrypto: number;
  fiatDrift: number;
  cryptoDrift: number;
};

export type ReconciliationReport = {
  scanned: number;
  driftCount: number;
  fixed: number;
  drifts: ReconciliationDrift[];
  ranAt: string;
};

const DRIFT_TOLERANCE = 0.000001;
const CRYPTO_CURRENCIES = new Set(["BTC", "ETH", "USDT", "TRX", "BNB"]);

type LedgerBalanceSnapshot = {
  fiat: number;
  crypto: number;
  hasEntries: boolean;
};

/** Latest fiat/crypto balances per user from immutable wallet ledger (single query). */
async function getBatchBalancesFromLedger(userIds: number[]): Promise<Map<number, LedgerBalanceSnapshot>> {
  const out = new Map<number, LedgerBalanceSnapshot>();
  if (userIds.length === 0) return out;

  const rows = await db.select({
    userId: walletLedgerTable.userId,
    walletType: walletLedgerTable.walletType,
    balanceAfter: walletLedgerTable.balanceAfter,
  })
    .from(walletLedgerTable)
    .where(inArray(walletLedgerTable.userId, userIds))
    .orderBy(desc(walletLedgerTable.createdAt), desc(walletLedgerTable.id));

  const pending = new Map<number, { fiat: number | null; crypto: number | null }>();

  for (const row of rows) {
    let slot = pending.get(row.userId);
    if (!slot) {
      slot = { fiat: null, crypto: null };
      pending.set(row.userId, slot);
    }
    if (row.walletType === "fiat" && slot.fiat === null) slot.fiat = Number(row.balanceAfter);
    if (row.walletType === "crypto" && slot.crypto === null) slot.crypto = Number(row.balanceAfter);
  }

  for (const [userId, slot] of pending) {
    out.set(userId, {
      fiat: slot.fiat ?? 0,
      crypto: slot.crypto ?? 0,
      hasEntries: true,
    });
  }

  return out;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export async function reconcileUserBalances(opts: {
  autoFix?: boolean;
  userIds?: number[];
} = {}): Promise<ReconciliationReport> {
  const users = opts.userIds?.length
    ? await db.select({
      id: usersTable.id,
      email: usersTable.email,
      balanceFiat: usersTable.balanceFiat,
      balanceCrypto: usersTable.balanceCrypto,
    }).from(usersTable).where(inArray(usersTable.id, opts.userIds))
    : await db.select({
      id: usersTable.id,
      email: usersTable.email,
      balanceFiat: usersTable.balanceFiat,
      balanceCrypto: usersTable.balanceCrypto,
    }).from(usersTable);
  const userIds = users.map(u => u.id);
  const ledgerByUser = await getBatchBalancesFromLedger(userIds);

  const drifts: ReconciliationDrift[] = [];
  let fixed = 0;

  for (const user of users) {
    const ledger = ledgerByUser.get(user.id);
    if (!ledger?.hasEntries) continue;

    const accountFiat = safeNumber(user.balanceFiat);
    const accountCrypto = safeNumber(user.balanceCrypto);
    const fiatDrift = parseFloat((ledger.fiat - accountFiat).toFixed(8));
    const cryptoDrift = parseFloat((ledger.crypto - accountCrypto).toFixed(8));

    if (Math.abs(fiatDrift) <= DRIFT_TOLERANCE && Math.abs(cryptoDrift) <= DRIFT_TOLERANCE) {
      continue;
    }

    drifts.push({
      userId: user.id,
      email: user.email || `user#${user.id}`,
      ledgerFiat: ledger.fiat,
      ledgerCrypto: ledger.crypto,
      accountFiat,
      accountCrypto,
      fiatDrift,
      cryptoDrift,
    });

    if (opts.autoFix) {
      await db.update(usersTable).set({
        balanceFiat: String(ledger.fiat),
        balanceCrypto: String(ledger.crypto),
      }).where(eq(usersTable.id, user.id));
      fixed++;
    }
  }

  if (drifts.length > 0) {
    logger.warn({ driftCount: drifts.length, fixed, autoFix: !!opts.autoFix }, "Ledger reconciliation detected balance drift");
  }

  return {
    scanned: users.length,
    driftCount: drifts.length,
    fixed,
    drifts: drifts.slice(0, 100),
    ranAt: new Date().toISOString(),
  };
}

export async function getTreasurySnapshot(opts: { investorIds?: number[] } = {}) {
  const ledgerAudit = await computePlatformLedgerAudit({
    from: null,
    to: new Date(),
    mode: "present",
    investorIds: opts.investorIds,
  });

  const investorFilter = opts.investorIds?.length
    ? inArray(usersTable.id, opts.investorIds)
    : eq(usersTable.role, "user");

  const [userTotals] = await db.select({
    totalCrypto: sql<string>`coalesce(sum(${usersTable.balanceCrypto}::numeric), 0)`,
    userCount: sql<number>`count(*)::int`,
  }).from(usersTable).where(investorFilter);

  const pendingRows = await db.select({
    type: transactionsTable.type,
    amount: transactionsTable.amount,
    currency: transactionsTable.currency,
    status: transactionsTable.status,
  }).from(transactionsTable).where(eq(transactionsTable.status, "pending"));

  let pendingDepositUsd = 0;
  let pendingWithdrawalUsd = 0;
  let pendingDeposits = 0;
  let pendingWithdrawals = 0;

  for (const row of pendingRows) {
    const amount = safeNumber(row.amount);
    const currency = String(row.currency || "USD").toUpperCase();
    const amt = CRYPTO_CURRENCIES.has(currency)
      ? amount
      : await convertToUsd(amount, currency);
    if (row.type === "deposit") {
      pendingDeposits++;
      pendingDepositUsd += amt;
    } else if (row.type === "withdrawal") {
      pendingWithdrawals++;
      pendingWithdrawalUsd += amt;
    }
  }

  const ledgerProfit = await db.select({
    total: sql<string>`coalesce(sum(case when type = 'profit' and amount::numeric > 0 then amount::numeric else 0 end), 0)`,
  }).from(walletLedgerTable);

  return {
    userLiabilities: {
      fiat: ledgerAudit.present.availableFiat,
      crypto: ledgerAudit.present.availableCrypto,
      investorCount: userTotals?.userCount ?? 0,
    },
    fiatBalanceAudit: ledgerAudit.fiat,
    ledgerAudit,
    pendingOperations: {
      deposits: pendingDeposits,
      withdrawals: pendingWithdrawals,
      depositAmount: parseFloat(pendingDepositUsd.toFixed(2)),
      withdrawalAmount: parseFloat(pendingWithdrawalUsd.toFixed(2)),
    },
    ledgerProfitPaid: safeNumber(ledgerProfit[0]?.total),
    snapshotAt: new Date().toISOString(),
  };
}
