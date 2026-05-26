import { db, transactionsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { debitWallet, WalletError } from "./walletService";
import { notifyUser } from "./notificationService";
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

  const minWithdraw = Number(await getSetting("min_withdrawal_fiat", "50"));
  if (amount < minWithdraw && !["BTC", "ETH", "USDT"].includes(currency)) {
    throw new WalletError(`Minimum withdrawal is ${minWithdraw}`, "MIN_WITHDRAWAL");
  }

  const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
  const fee = amount * (feePercent / 100);
  const totalDebit = amount + fee;

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    currency: currency as any,
    paymentMethod,
    notes,
    gatewayProvider: "personal_account",
    status: "pending",
  }).returning();

  await debitWallet({
    userId,
    amount: totalDebit,
    currency,
    type: "withdrawal",
    referenceType: "transaction",
    referenceId: txn.id,
    description: `Withdrawal #${txn.id} to personal account (fee: ${fee.toFixed(2)})`,
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
