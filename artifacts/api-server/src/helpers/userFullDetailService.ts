import {

  db, usersTable, userProfilesTable, kycRecordsTable, userPaymentAccountsTable,

  mt5AccountsTable, transactionsTable, investmentsTable, mt5RequestsTable,

  algoSubscriptionsTable, algoStrategiesTable, eaSubscriptionsTable, eaStrategiesTable,

  copyFollowsTable, copyTradersTable, roiPayoutsTable,

} from "@workspace/db";

import { eq, desc, and } from "@workspace/db/orm";

import { mapUserWithLedger } from "../routes/auth";

import { mapPaymentAccount } from "./paymentAccountSync";

import { decryptSensitive } from "./encryption";
import { normalizeProofUrl } from "./proofUrlUtil";

import { mapAccount } from "../routes/mt5";

import { getWalletFinancialSummary } from "./walletService";

import { mapUserServiceFlags } from "./userAccessControl";



function mapProfile(row: typeof userProfilesTable.$inferSelect | undefined) {

  if (!row) return null;

  let banking: Record<string, string | null> | null = null;

  if (row.bankingDetailsEnc) {

    try {

      const parsed = JSON.parse(decryptSensitive(row.bankingDetailsEnc)) as Record<string, string>;

      banking = {

        accountHolderName: parsed.accountHolderName || null,

        bankName: parsed.bankName || null,

        accountNumber: parsed.accountNumber || null,

        ifscCode: parsed.ifscCode || null,

        branchName: parsed.branchName || null,

        upiId: parsed.upiId || null,

      };

    } catch { /* ignore */ }

  }

  return {

    username: row.username || null,

    investorId: row.investorId || null,

    dateOfBirth: row.dateOfBirth || null,

    gender: row.gender || null,

    nationality: row.nationality || null,

    country: row.country || null,

    state: row.state || null,

    city: row.city || null,

    address: row.address || null,

    postalCode: row.postalCode || null,

    taxId: row.taxId || null,

    occupation: row.occupation || null,

    annualIncomeRange: row.annualIncomeRange || null,

    investmentExperience: row.investmentExperience || null,

    riskAppetite: row.riskAppetite || null,

    preferredInvestmentType: row.preferredInvestmentType || null,

    sourceOfFunds: row.sourceOfFunds || null,

    tradingInterests: (row.tradingInterests as string[]) || [],

    cryptoWallets: (row.cryptoWallets as Record<string, string>) || {},

    banking,

    onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() || null,

    createdAt: row.createdAt.toISOString(),

    updatedAt: row.updatedAt?.toISOString() || null,

  };

}



function mapKycRecord(k: typeof kycRecordsTable.$inferSelect) {

  return {

    id: k.id,

    userId: k.userId,

    fullName: k.fullName || null,

    address: k.address || null,

    country: k.country || null,

    idType: k.idType || null,

    idNumber: k.idNumber || null,

    panCard: k.panCard || null,

    aadhaarNumber: k.aadhaarNumber || null,

    taxId: k.taxId || null,

    bankAccountNumber: k.bankAccountNumber || null,

    bankName: k.bankName || null,

    ifscCode: k.ifscCode || null,

    branchName: k.branchName || null,

    upiId: k.upiId || null,

    idDocumentUrl: k.idDocumentUrl || null,

    panDocumentUrl: k.panDocumentUrl || null,

    aadhaarFrontUrl: k.aadhaarFrontUrl || null,

    aadhaarBackUrl: k.aadhaarBackUrl || null,

    passportDocumentUrl: k.passportDocumentUrl || null,

    passportPhotoUrl: k.passportPhotoUrl || null,

    addressProofUrl: k.addressProofUrl || null,

    selfieUrl: k.selfieUrl || null,

    signatureUrl: k.signatureUrl || null,

    cancelledChequeUrl: k.cancelledChequeUrl || null,

    status: k.status,

    rejectionReason: k.rejectionReason || null,

    createdAt: k.createdAt.toISOString(),

    updatedAt: k.updatedAt?.toISOString() || null,

  };

}



function mapTransaction(t: typeof transactionsTable.$inferSelect) {

  return {

    id: t.id,

    type: t.type,

    amount: Number(t.amount),

    currency: t.currency,

    status: t.status,

    paymentMethod: t.paymentMethod || null,

    utrReference: t.utrReference || null,

    proofUrl: normalizeProofUrl(t.proofUrl),

    notes: t.notes || null,

    createdAt: t.createdAt.toISOString(),

  };

}



function mapInvestment(i: typeof investmentsTable.$inferSelect) {

  return {

    id: i.id,

    type: i.type,

    planName: i.planName,

    amount: Number(i.amount),

    currency: i.currency,

    profit: Number(i.profit),

    profitPercent: Number(i.profitPercent),

    status: i.status,

    maturityDate: i.maturityDate?.toISOString?.() || i.maturityDate || null,

    createdAt: i.createdAt.toISOString(),

  };

}



export async function getUserFullDetail(

  userId: number,

  opts?: { transactionLimit?: number; investmentLimit?: number; full?: boolean },

) {

  const full = opts?.full ?? false;

  const transactionLimit = full ? 500 : (opts?.transactionLimit ?? 8);

  const investmentLimit = full ? 200 : (opts?.investmentLimit ?? 8);



  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (!user) return null;



  const paymentAccountQuery = full

    ? db.select().from(userPaymentAccountsTable).where(eq(userPaymentAccountsTable.userId, userId)).orderBy(desc(userPaymentAccountsTable.isDefault))

    : db.select().from(userPaymentAccountsTable)

      .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))

      .orderBy(desc(userPaymentAccountsTable.isDefault));



  const [

    profileRow,

    kycRows,

    paymentAccounts,

    mt5Accounts,

    mt5Requests,

    txnRows,

    investmentRows,

    investmentProfitRows,

    managerRow,

    referrerRow,

    algoSubs,

    eaSubs,

    copyFollows,

    roiPayouts,

    algoStrategies,

    eaStrategies,

    copyTraders,

  ] = await Promise.all([

    db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1).then(r => r[0]),

    db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, userId)).orderBy(desc(kycRecordsTable.id)),

    paymentAccountQuery,

    db.select().from(mt5AccountsTable).where(eq(mt5AccountsTable.userId, userId)).orderBy(desc(mt5AccountsTable.updatedAt)),

    db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.userId, userId)).orderBy(desc(mt5RequestsTable.createdAt)).limit(full ? 50 : 5),

    db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(transactionLimit),

    db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)).orderBy(desc(investmentsTable.createdAt)).limit(investmentLimit),

    db.select({ profit: investmentsTable.profit }).from(investmentsTable).where(eq(investmentsTable.userId, userId)),

    user.managerId

      ? db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })

        .from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1).then(r => r[0])

      : Promise.resolve(undefined),

    user.referredBy

      ? db.select({ id: usersTable.id, fullName: usersTable.fullName, referralCode: usersTable.referralCode })

        .from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1).then(r => r[0])

      : Promise.resolve(undefined),

    db.select().from(algoSubscriptionsTable).where(eq(algoSubscriptionsTable.userId, userId)).orderBy(desc(algoSubscriptionsTable.createdAt)).limit(full ? 100 : 10),

    db.select().from(eaSubscriptionsTable).where(eq(eaSubscriptionsTable.userId, userId)).orderBy(desc(eaSubscriptionsTable.createdAt)).limit(full ? 100 : 10),

    db.select().from(copyFollowsTable).where(eq(copyFollowsTable.userId, userId)).orderBy(desc(copyFollowsTable.createdAt)).limit(full ? 100 : 10),

    db.select().from(roiPayoutsTable).where(eq(roiPayoutsTable.userId, userId)).orderBy(desc(roiPayoutsTable.createdAt)).limit(full ? 100 : 10),

    db.select().from(algoStrategiesTable),

    db.select().from(eaStrategiesTable),

    db.select().from(copyTradersTable),

  ]);



  const walletSummary = await getWalletFinancialSummary(userId);

  const investmentProfit = investmentProfitRows.reduce((s, i) => s + Number(i.profit), 0);

  const algoMap = new Map(algoStrategies.map(s => [s.id, s]));

  const eaMap = new Map(eaStrategies.map(s => [s.id, s]));

  const traderMap = new Map(copyTraders.map(t => [t.id, t]));



  const mappedUser = await mapUserWithLedger(user);

  const serviceAccess = mapUserServiceFlags(user);



  const transactions = txnRows.map(mapTransaction);

  const investments = investmentRows.map(mapInvestment);

  const deposits = transactions.filter(t => t.type === "deposit");

  const withdrawals = transactions.filter(t => t.type === "withdrawal");



  return {

    user: { ...mappedUser, ...serviceAccess },

    profile: mapProfile(profileRow),

    manager: managerRow ? { id: managerRow.id, fullName: managerRow.fullName, email: managerRow.email } : null,

    referrer: referrerRow ? { id: referrerRow.id, fullName: referrerRow.fullName, referralCode: referrerRow.referralCode } : null,

    kycRecords: kycRows.map(mapKycRecord),

    kyc: kycRows[0] ? mapKycRecord(kycRows[0]) : null,

    paymentAccounts: paymentAccounts.map(mapPaymentAccount),

    mt5Accounts: mt5Accounts.map(mapAccount),

    mt5Requests: mt5Requests.map(r => ({

      id: r.id,

      type: r.type,

      status: r.status,

      profitSharingPercent: r.profitSharingPercent,

      details: r.details || null,

      createdAt: r.createdAt.toISOString(),

    })),

    summary: {

      balanceFiat: walletSummary.fiatBalance,

      balanceCrypto: walletSummary.cryptoBalance,

      totalProfit: walletSummary.totalProfit,

      referralEarnings: Number(user.referralEarnings || 0),

      referralCount: user.referralCount || 0,

      totalDeposits: walletSummary.totalDeposited,

      totalWithdrawals: walletSummary.totalWithdrawn,

      activeInvestments: investments.filter(i => i.status === "active").length,

      depositCount: deposits.length,

      withdrawalCount: withdrawals.length,

    },

    transactions,

    deposits,

    withdrawals,

    investments,

    recentTransactions: transactions.slice(0, 8),

    recentInvestments: investments.slice(0, 8),

    algoSubscriptions: algoSubs.map(s => ({

      id: s.id,

      strategyId: s.strategyId,

      strategyName: algoMap.get(s.strategyId)?.name || `Strategy #${s.strategyId}`,

      active: s.active,

      createdAt: s.createdAt.toISOString(),

    })),

    eaSubscriptions: eaSubs.map(s => ({

      id: s.id,

      strategyId: s.strategyId,

      strategyName: eaMap.get(s.strategyId)?.name || `EA #${s.strategyId}`,

      mtAccountNumber: s.mtAccountNumber,

      mtPlatform: s.mtPlatform,

      plan: s.plan,

      status: s.status,

      expiresAt: s.expiresAt?.toISOString?.() || s.expiresAt || null,

      createdAt: s.createdAt.toISOString(),

    })),

    copyFollows: copyFollows.map(f => ({

      id: f.id,

      traderId: f.traderId,

      traderName: traderMap.get(f.traderId)?.name || `Trader #${f.traderId}`,

      amount: Number(f.amount),

      currency: f.currency,

      profitSharingPercent: f.profitSharingPercent,

      active: f.active,

      createdAt: f.createdAt.toISOString(),

    })),

    roiPayouts: roiPayouts.map(p => ({

      id: p.id,

      investmentId: p.investmentId,

      amount: Number(p.amount),

      roiPercent: Number(p.roiPercent),

      status: p.status,

      planName: p.planName,

      note: p.note,

      processedAt: p.processedAt?.toISOString?.() || p.processedAt || null,

      createdAt: p.createdAt.toISOString(),

    })),

    serviceAccess,

  };

}


