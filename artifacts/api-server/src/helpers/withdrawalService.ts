import { db, transactionsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { debitWallet, WalletError } from "./walletService";
import { notifyUser } from "./notificationService";
import { convertToUsd } from "./exchangeRateService";

const CRYPTO = new Set(["BTC", "ETH", "USDT"]);
function mapTxn(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    userId: t.userId,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    paymentMethod: t.paymentMethod,
    notes: t.notes,
    createdAt: t.createdAt.toISOString(),
  };
}

async function getSetting(key: string, fallback: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value ?? fallback;
}

async function checkKycRequired(userId: number) {
  const kycRequired = await getSetting("kyc_required", "true");
  if (kycRequired !== "true") return;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user && user.kycStatus !== "verified") {
    throw new WalletError("KYC verification required before withdrawals", "KYC_REQUIRED");
  }
}

export async function createWithdrawalRequest(
  userId: number,
  opts: { amount: number; currency: string; paymentMethod: string; notes?: string },
) {
  const { amount, currency, paymentMethod, notes } = opts;
  if (amount <= 0) throw new WalletError("Amount must be positive", "INVALID_AMOUNT");

  await checkKycRequired(userId);

  const minWithdrawUsd = Number(await getSetting("min_withdrawal_fiat", "50"));
  const isCrypto = CRYPTO.has(currency.toUpperCase());
  const walletDebitAmount = isCrypto ? amount : await convertToUsd(amount, currency);

  if (!isCrypto && walletDebitAmount < minWithdrawUsd) {
    throw new WalletError(`Minimum withdrawal is ${minWithdrawUsd} USD equivalent`, "MIN_WITHDRAWAL");
  }
  if (isCrypto && amount < minWithdrawUsd) {
    throw new WalletError(`Minimum withdrawal is ${minWithdrawUsd}`, "MIN_WITHDRAWAL");
  }

  const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
  const fee = isCrypto
    ? amount * (feePercent / 100)
    : walletDebitAmount * (feePercent / 100);
  const totalDebit = isCrypto ? amount + fee : walletDebitAmount + fee;
  const debitCurrency = isCrypto ? currency : "USD";

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    currency: currency as any,
    paymentMethod,
    notes: notes
      ? `${notes}${!isCrypto && currency.toUpperCase() !== "USD" ? ` | Wallet debit ~$${walletDebitAmount.toFixed(2)} USD` : ""}`
      : (!isCrypto && currency.toUpperCase() !== "USD" ? `Wallet debit ~$${walletDebitAmount.toFixed(2)} USD` : null),
    gatewayProvider: "personal_account",
    status: "pending",
  }).returning();

  await debitWallet({
    userId,
    amount: totalDebit,
    currency: debitCurrency,
    type: "withdrawal",
    referenceType: "transaction",
    referenceId: txn.id,
    description: `Withdrawal #${txn.id} — ${amount} ${currency} (fee: ${fee.toFixed(2)} ${isCrypto ? currency : "USD"})`,
  });

  await notifyUser({
    userId,
    title: "Withdrawal Requested",
    message: `Your withdrawal of ${amount} ${currency} to your personal account is pending review.`,
    type: "info",
    category: "withdrawal",
    actionUrl: "/transactions",
  });
  return mapTxn(txn);
}
