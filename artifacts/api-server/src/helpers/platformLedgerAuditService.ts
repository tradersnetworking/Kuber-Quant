import { db, usersTable, walletLedgerTable, investmentsTable } from "@workspace/db";
import { eq, inArray, and, lte } from "@workspace/db/orm";
import { inDateRange } from "./platformStatsService";

export type LedgerFiatRow = {
  id: number;
  userId: number;
  type: string;
  amount: string | number;
  walletType: string;
  balanceAfter: string | number;
  referenceType: string | null;
  referenceId: number | null;
  description: string | null;
  createdAt: Date;
};

export type PlatformFiatAudit = {
  availableBalance: number;
  periodNetFlow: number;
  periodDeposits: number;
  periodWithdrawals: number;
  periodMaturityProfits: number;
  periodPeriodicProfits: number;
  periodInvestmentOut: number;
  periodInvestmentReturns: number;
  periodAdjustments: number;
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativeMaturityProfits: number;
  cumulativePeriodicProfits: number;
  cumulativeInvestmentOut: number;
  cumulativeInvestmentReturns: number;
  cumulativeAdjustments: number;
  computedBalance: number;
  drift: number;
  investorCount: number;
  ledgerBackedInvestors: number;
  accountFallbackInvestors: number;
  asOf: string;
  source: "ledger" | "mixed";
};

export type PresentWalletBreakdown = {
  /** Ledger snapshot — sum of investor wallet balances now. */
  availableLedger: number;
  deposits: number;
  withdrawals: number;
  maturityProfits: number;
  periodicProfits: number;
  investmentOut: number;
  investmentReturns: number;
  adjustments: number;
  /** Audit formula: deposits − withdrawals + maturity + periodic + returns − invested + adjustments */
  computedAvailable: number;
  drift: number;
};

export type PlatformCryptoAudit = {
  availableBalance: number;
  periodDeposits: number;
  periodWithdrawals: number;
  periodMaturityProfits: number;
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativeMaturityProfits: number;
  cumulativePeriodicProfits: number;
  cumulativeInvestmentOut: number;
  cumulativeInvestmentReturns: number;
  cumulativeAdjustments: number;
  computedBalance: number;
  drift: number;
  source: "ledger" | "mixed";
  breakdown?: PresentWalletBreakdown;
};

export type PlatformPresentSnapshot = {
  availableFiat: number;
  availableCrypto: number;
  activeInvested: number;
  activeInvestmentCount: number;
  walletAvailable: number;
  totalAssets: number;
  asOf: string;
  fiatBreakdown: PresentWalletBreakdown;
  cryptoBreakdown: PresentWalletBreakdown;
};

export type PlatformLedgerAudit = {
  mode: "present" | "period";
  fiat: PlatformFiatAudit;
  crypto: PlatformCryptoAudit;
  present: PlatformPresentSnapshot;
};

function utcDay(iso: Date | string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

type LedgerRow = LedgerFiatRow;

function balanceAtForUser(rows: LedgerRow[], userId: number, asOf: Date): number {
  const cutoff = asOf.getTime();
  let balance = 0;
  let found = false;
  const userRows = rows
    .filter(r => r.userId === userId)
    .sort((a, b) => {
      const t = a.createdAt.getTime() - b.createdAt.getTime();
      return t !== 0 ? t : a.id - b.id;
    });

  for (const row of userRows) {
    if (row.createdAt.getTime() > cutoff) break;
    balance = Number(row.balanceAfter);
    found = true;
  }
  return found ? balance : 0;
}

function isMaturityProfit(
  row: LedgerFiatRow,
  maturityDayByInvId: Map<number, string>,
): boolean {
  if (row.type !== "profit" || Number(row.amount) <= 0) return false;
  if (row.referenceType !== "investment" || !row.referenceId) return false;
  const maturityDay = maturityDayByInvId.get(row.referenceId);
  if (!maturityDay) return false;
  const ledgerDay = utcDay(row.createdAt);
  // Periodic ROI before maturity; on/after maturity day = maturity profit (auto-credited to wallet).
  return ledgerDay >= maturityDay;
}

type FlowBuckets = {
  deposits: number;
  withdrawals: number;
  maturityProfits: number;
  periodicProfits: number;
  investmentOut: number;
  investmentReturns: number;
  adjustments: number;
};

function classifyWalletRow(
  row: LedgerFiatRow,
  maturityDayByInvId: Map<number, string>,
): FlowBuckets {
  const amt = Number(row.amount);
  const out: FlowBuckets = {
    deposits: 0,
    withdrawals: 0,
    maturityProfits: 0,
    periodicProfits: 0,
    investmentOut: 0,
    investmentReturns: 0,
    adjustments: 0,
  };

  switch (row.type) {
    case "deposit":
      if (amt > 0) out.deposits = amt;
      break;
    case "withdrawal":
      if (amt < 0) out.withdrawals = Math.abs(amt);
      break;
    case "profit":
      if (amt > 0) {
        if (isMaturityProfit(row, maturityDayByInvId)) out.maturityProfits = amt;
        else out.periodicProfits = amt;
      }
      break;
    case "investment":
      if (amt < 0) out.investmentOut = Math.abs(amt);
      else if (amt > 0) out.investmentReturns = amt;
      break;
    case "adjustment":
      out.adjustments = amt;
      break;
    case "referral":
    case "bonus":
      if (amt > 0) out.adjustments += amt;
      break;
    case "transfer":
      if (amt > 0) out.deposits += amt;
      else if (amt < 0) out.withdrawals += Math.abs(amt);
      break;
    default:
      break;
  }
  return out;
}

function buildBreakdown(
  cumulative: FlowBuckets,
  availableLedger: number,
  computedBalance: number,
): PresentWalletBreakdown {
  return {
    availableLedger,
    deposits: parseFloat(cumulative.deposits.toFixed(8)),
    withdrawals: parseFloat(cumulative.withdrawals.toFixed(8)),
    maturityProfits: parseFloat(cumulative.maturityProfits.toFixed(8)),
    periodicProfits: parseFloat(cumulative.periodicProfits.toFixed(8)),
    investmentOut: parseFloat(cumulative.investmentOut.toFixed(8)),
    investmentReturns: parseFloat(cumulative.investmentReturns.toFixed(8)),
    adjustments: parseFloat(cumulative.adjustments.toFixed(8)),
    computedAvailable: computedBalance,
    drift: parseFloat((availableLedger - computedBalance).toFixed(8)),
  };
}

function addBuckets(target: FlowBuckets, src: FlowBuckets) {
  target.deposits += src.deposits;
  target.withdrawals += src.withdrawals;
  target.maturityProfits += src.maturityProfits;
  target.periodicProfits += src.periodicProfits;
  target.investmentOut += src.investmentOut;
  target.investmentReturns += src.investmentReturns;
  target.adjustments += src.adjustments;
}

function computedFromBuckets(b: FlowBuckets): number {
  return parseFloat((
    b.deposits
    + b.maturityProfits
    + b.periodicProfits
    + b.investmentReturns
    + b.adjustments
    - b.withdrawals
    - b.investmentOut
  ).toFixed(8));
}

async function auditWalletType(opts: {
  investorIds: number[];
  walletType: "fiat" | "crypto";
  from: Date | null;
  to: Date | null;
  asOf: Date;
  maturityDayByInvId?: Map<number, string>;
  accountBalanceField: "balanceFiat" | "balanceCrypto";
}): Promise<{
  rows: LedgerRow[];
  availableBalance: number;
  period: FlowBuckets;
  cumulative: FlowBuckets;
  computedBalance: number;
  drift: number;
  ledgerBackedInvestors: number;
  accountFallbackInvestors: number;
  source: "ledger" | "mixed";
}> {
  const [ledgerRows, accountRows] = await Promise.all([
    db.select({
      id: walletLedgerTable.id,
      userId: walletLedgerTable.userId,
      type: walletLedgerTable.type,
      amount: walletLedgerTable.amount,
      walletType: walletLedgerTable.walletType,
      balanceAfter: walletLedgerTable.balanceAfter,
      referenceType: walletLedgerTable.referenceType,
      referenceId: walletLedgerTable.referenceId,
      description: walletLedgerTable.description,
      createdAt: walletLedgerTable.createdAt,
    })
      .from(walletLedgerTable)
      .where(and(
        inArray(walletLedgerTable.userId, opts.investorIds),
        eq(walletLedgerTable.walletType, opts.walletType),
        lte(walletLedgerTable.createdAt, opts.asOf),
      )),
    db.select({
      id: usersTable.id,
      balanceFiat: usersTable.balanceFiat,
      balanceCrypto: usersTable.balanceCrypto,
    })
      .from(usersTable)
      .where(inArray(usersTable.id, opts.investorIds)),
  ]);

  const rows = ledgerRows as LedgerRow[];
  const usersWithLedger = new Set(rows.map(r => r.userId));
  let availableBalance = 0;
  let ledgerBackedInvestors = 0;
  let accountFallbackInvestors = 0;

  for (const userId of opts.investorIds) {
    if (usersWithLedger.has(userId)) {
      availableBalance += balanceAtForUser(rows, userId, opts.asOf);
      ledgerBackedInvestors++;
    } else {
      const acct = accountRows.find(u => u.id === userId);
      availableBalance += Number(
        opts.accountBalanceField === "balanceFiat"
          ? acct?.balanceFiat || 0
          : acct?.balanceCrypto || 0,
      );
      accountFallbackInvestors++;
    }
  }

  const cumulative: FlowBuckets = {
    deposits: 0,
    withdrawals: 0,
    maturityProfits: 0,
    periodicProfits: 0,
    investmentOut: 0,
    investmentReturns: 0,
    adjustments: 0,
  };
  const period: FlowBuckets = { ...cumulative };
  const maturityMap = opts.maturityDayByInvId ?? new Map<number, string>();

  for (const row of rows) {
    const bucket = classifyWalletRow(row, maturityMap);
    addBuckets(cumulative, bucket);
    if (inDateRange(row.createdAt, opts.from, opts.to)) {
      addBuckets(period, bucket);
    }
  }

  const computedBalance = computedFromBuckets(cumulative);
  const drift = parseFloat((availableBalance - computedBalance).toFixed(8));

  return {
    rows,
    availableBalance: parseFloat(availableBalance.toFixed(8)),
    period,
    cumulative,
    computedBalance,
    drift,
    ledgerBackedInvestors,
    accountFallbackInvestors,
    source: accountFallbackInvestors > 0 ? "mixed" : "ledger",
  };
}

export async function computePlatformLedgerAudit(opts: {
  from: Date | null;
  to: Date | null;
  investorIds?: number[];
  mode?: "present" | "period";
}): Promise<PlatformLedgerAudit> {
  const asOf = opts.to ?? new Date();
  const mode = opts.mode ?? (opts.from == null ? "present" : "period");

  let investorIds = opts.investorIds;
  if (!investorIds?.length) {
    const investors = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.role, "user"));
    investorIds = investors.map(u => u.id);
  }

  if (investorIds.length === 0) {
    const emptyFiat: PlatformFiatAudit = {
      availableBalance: 0,
      periodNetFlow: 0,
      periodDeposits: 0,
      periodWithdrawals: 0,
      periodMaturityProfits: 0,
      periodPeriodicProfits: 0,
      periodInvestmentOut: 0,
      periodInvestmentReturns: 0,
      periodAdjustments: 0,
      cumulativeDeposits: 0,
      cumulativeWithdrawals: 0,
      cumulativeMaturityProfits: 0,
      cumulativePeriodicProfits: 0,
      cumulativeInvestmentOut: 0,
      cumulativeInvestmentReturns: 0,
      cumulativeAdjustments: 0,
      computedBalance: 0,
      drift: 0,
      investorCount: 0,
      ledgerBackedInvestors: 0,
      accountFallbackInvestors: 0,
      asOf: asOf.toISOString(),
      source: "ledger",
    };
    return {
      mode,
      fiat: emptyFiat,
      crypto: {
        availableBalance: 0,
        periodDeposits: 0,
        periodWithdrawals: 0,
        periodMaturityProfits: 0,
        cumulativeDeposits: 0,
        cumulativeWithdrawals: 0,
        cumulativeMaturityProfits: 0,
        cumulativePeriodicProfits: 0,
        cumulativeInvestmentOut: 0,
        cumulativeInvestmentReturns: 0,
        cumulativeAdjustments: 0,
        computedBalance: 0,
        drift: 0,
        source: "ledger",
      },
      present: {
        availableFiat: 0,
        availableCrypto: 0,
        activeInvested: 0,
        activeInvestmentCount: 0,
        walletAvailable: 0,
        totalAssets: 0,
        asOf: asOf.toISOString(),
        fiatBreakdown: buildBreakdown({
          deposits: 0, withdrawals: 0, maturityProfits: 0, periodicProfits: 0,
          investmentOut: 0, investmentReturns: 0, adjustments: 0,
        }, 0, 0),
        cryptoBreakdown: buildBreakdown({
          deposits: 0, withdrawals: 0, maturityProfits: 0, periodicProfits: 0,
          investmentOut: 0, investmentReturns: 0, adjustments: 0,
        }, 0, 0),
      },
    };
  }

  const investmentRows = await db.select({
    id: investmentsTable.id,
    userId: investmentsTable.userId,
    amount: investmentsTable.amount,
    status: investmentsTable.status,
    maturityDate: investmentsTable.maturityDate,
  })
    .from(investmentsTable)
    .where(inArray(investmentsTable.userId, investorIds));

  const maturityDayByInvId = new Map<number, string>();
  for (const inv of investmentRows) {
    if (inv.maturityDate) maturityDayByInvId.set(inv.id, utcDay(inv.maturityDate));
  }

  const activeInvestments = investmentRows.filter(i => i.status === "active");
  const activeInvested = activeInvestments.reduce((s, i) => s + Number(i.amount), 0);

  const [fiatAudit, cryptoAudit] = await Promise.all([
    auditWalletType({
      investorIds,
      walletType: "fiat",
      from: opts.from,
      to: opts.to,
      asOf,
      maturityDayByInvId,
      accountBalanceField: "balanceFiat",
    }),
    auditWalletType({
      investorIds,
      walletType: "crypto",
      from: opts.from,
      to: opts.to,
      asOf,
      accountBalanceField: "balanceCrypto",
    }),
  ]);

  const periodNetFlow = parseFloat((
    fiatAudit.period.deposits + fiatAudit.period.maturityProfits - fiatAudit.period.withdrawals
  ).toFixed(8));

  const fiat: PlatformFiatAudit = {
    availableBalance: fiatAudit.availableBalance,
    periodNetFlow,
    periodDeposits: parseFloat(fiatAudit.period.deposits.toFixed(8)),
    periodWithdrawals: parseFloat(fiatAudit.period.withdrawals.toFixed(8)),
    periodMaturityProfits: parseFloat(fiatAudit.period.maturityProfits.toFixed(8)),
    periodPeriodicProfits: parseFloat(fiatAudit.period.periodicProfits.toFixed(8)),
    periodInvestmentOut: parseFloat(fiatAudit.period.investmentOut.toFixed(8)),
    periodInvestmentReturns: parseFloat(fiatAudit.period.investmentReturns.toFixed(8)),
    periodAdjustments: parseFloat(fiatAudit.period.adjustments.toFixed(8)),
    cumulativeDeposits: parseFloat(fiatAudit.cumulative.deposits.toFixed(8)),
    cumulativeWithdrawals: parseFloat(fiatAudit.cumulative.withdrawals.toFixed(8)),
    cumulativeMaturityProfits: parseFloat(fiatAudit.cumulative.maturityProfits.toFixed(8)),
    cumulativePeriodicProfits: parseFloat(fiatAudit.cumulative.periodicProfits.toFixed(8)),
    cumulativeInvestmentOut: parseFloat(fiatAudit.cumulative.investmentOut.toFixed(8)),
    cumulativeInvestmentReturns: parseFloat(fiatAudit.cumulative.investmentReturns.toFixed(8)),
    cumulativeAdjustments: parseFloat(fiatAudit.cumulative.adjustments.toFixed(8)),
    computedBalance: fiatAudit.computedBalance,
    drift: fiatAudit.drift,
    investorCount: investorIds.length,
    ledgerBackedInvestors: fiatAudit.ledgerBackedInvestors,
    accountFallbackInvestors: fiatAudit.accountFallbackInvestors,
    asOf: asOf.toISOString(),
    source: fiatAudit.source,
  };

  const crypto: PlatformCryptoAudit = {
    availableBalance: cryptoAudit.availableBalance,
    periodDeposits: parseFloat(cryptoAudit.period.deposits.toFixed(8)),
    periodWithdrawals: parseFloat(cryptoAudit.period.withdrawals.toFixed(8)),
    periodMaturityProfits: parseFloat(cryptoAudit.period.maturityProfits.toFixed(8)),
    cumulativeDeposits: parseFloat(cryptoAudit.cumulative.deposits.toFixed(8)),
    cumulativeWithdrawals: parseFloat(cryptoAudit.cumulative.withdrawals.toFixed(8)),
    cumulativeMaturityProfits: parseFloat(cryptoAudit.cumulative.maturityProfits.toFixed(8)),
    cumulativePeriodicProfits: parseFloat(cryptoAudit.cumulative.periodicProfits.toFixed(8)),
    cumulativeInvestmentOut: parseFloat(cryptoAudit.cumulative.investmentOut.toFixed(8)),
    cumulativeInvestmentReturns: parseFloat(cryptoAudit.cumulative.investmentReturns.toFixed(8)),
    cumulativeAdjustments: parseFloat(cryptoAudit.cumulative.adjustments.toFixed(8)),
    computedBalance: cryptoAudit.computedBalance,
    drift: cryptoAudit.drift,
    source: cryptoAudit.source,
    breakdown: buildBreakdown(cryptoAudit.cumulative, cryptoAudit.availableBalance, cryptoAudit.computedBalance),
  };

  const fiatBreakdown = buildBreakdown(fiatAudit.cumulative, fiatAudit.availableBalance, fiatAudit.computedBalance);
  const cryptoBreakdown = crypto.breakdown!;

  const walletAvailable = parseFloat((fiat.availableBalance + crypto.availableBalance).toFixed(8));
  const totalAssets = parseFloat((walletAvailable + activeInvested).toFixed(8));

  return {
    mode,
    fiat,
    crypto,
    present: {
      availableFiat: fiat.availableBalance,
      availableCrypto: crypto.availableBalance,
      activeInvested: parseFloat(activeInvested.toFixed(8)),
      activeInvestmentCount: activeInvestments.length,
      walletAvailable,
      totalAssets,
      asOf: asOf.toISOString(),
      fiatBreakdown,
      cryptoBreakdown,
    },
  };
}

/** @deprecated Use computePlatformLedgerAudit */
export async function computePlatformFiatAudit(opts: {
  from: Date | null;
  to: Date | null;
  investorIds?: number[];
}): Promise<PlatformFiatAudit> {
  const audit = await computePlatformLedgerAudit(opts);
  return audit.fiat;
}
