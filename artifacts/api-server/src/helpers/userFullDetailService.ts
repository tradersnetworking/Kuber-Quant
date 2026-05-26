import {
  db, usersTable, userProfilesTable, kycRecordsTable, userPaymentAccountsTable,
  mt5AccountsTable, transactionsTable, investmentsTable, mt5RequestsTable,
} from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { mapUser } from "../routes/auth";
import { mapPaymentAccount } from "./paymentAccountSync";
import { decryptSensitive } from "./encryption";
import { mapAccount } from "../routes/mt5";

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

export async function getUserFullDetail(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return null;

  const [
    profileRow,
    kycRows,
    paymentAccounts,
    mt5Accounts,
    mt5Requests,
    recentTxns,
    recentInvestments,
    managerRow,
    referrerRow,
  ] = await Promise.all([
    db.select().from(userProfilesTable).where(eq(userProfilesTable.userId, userId)).limit(1).then(r => r[0]),
    db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, userId)).orderBy(desc(kycRecordsTable.id)),
    db.select().from(userPaymentAccountsTable)
      .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))
      .orderBy(desc(userPaymentAccountsTable.isDefault)),
    db.select().from(mt5AccountsTable).where(eq(mt5AccountsTable.userId, userId)).orderBy(desc(mt5AccountsTable.updatedAt)),
    db.select().from(mt5RequestsTable).where(eq(mt5RequestsTable.userId, userId)).orderBy(desc(mt5RequestsTable.createdAt)).limit(5),
    db.select().from(transactionsTable).where(eq(transactionsTable.userId, userId)).orderBy(desc(transactionsTable.createdAt)).limit(8),
    db.select().from(investmentsTable).where(eq(investmentsTable.userId, userId)).orderBy(desc(investmentsTable.createdAt)).limit(8),
    user.managerId
      ? db.select({ id: usersTable.id, fullName: usersTable.fullName, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, user.managerId)).limit(1).then(r => r[0])
      : Promise.resolve(undefined),
    user.referredBy
      ? db.select({ id: usersTable.id, fullName: usersTable.fullName, referralCode: usersTable.referralCode })
        .from(usersTable).where(eq(usersTable.id, user.referredBy)).limit(1).then(r => r[0])
      : Promise.resolve(undefined),
  ]);

  const deposits = recentTxns.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawals = recentTxns.filter(t => t.type === "withdrawal" && t.status === "approved");

  return {
    user: mapUser(user),
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
      balanceFiat: Number(user.balanceFiat),
      balanceCrypto: Number(user.balanceCrypto),
      totalProfit: Number(user.totalProfit),
      referralEarnings: Number(user.referralEarnings || 0),
      referralCount: user.referralCount || 0,
      totalDeposits: deposits.reduce((s, t) => s + Number(t.amount), 0),
      totalWithdrawals: withdrawals.reduce((s, t) => s + Number(t.amount), 0),
      activeInvestments: recentInvestments.filter(i => i.status === "active").length,
    },
    recentTransactions: recentTxns.map(t => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      currency: t.currency,
      status: t.status,
      paymentMethod: t.paymentMethod || null,
      createdAt: t.createdAt.toISOString(),
    })),
    recentInvestments: recentInvestments.map(i => ({
      id: i.id,
      type: i.type,
      planName: i.planName,
      amount: Number(i.amount),
      currency: i.currency,
      profit: Number(i.profit),
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  };
}
