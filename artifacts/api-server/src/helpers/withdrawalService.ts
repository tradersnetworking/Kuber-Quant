import { db, transactionsTable, usersTable, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { debitWallet, getWalletFinancialSummary, WalletError } from "./walletService";
import { notifyUser } from "./notificationService";
import { emitN8nEvent } from "./n8nWebhookService";
import { convertToUsd, convertFromUsd } from "./exchangeRateService";
import { assertWithdrawalAllowed } from "./withdrawalFraudGuard";
import { assertKycVerified } from "./kycGateService";

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
  await assertKycVerified(userId);
}

async function checkWithdrawalsEnabled(userId: number) {
  const { assertUserServiceEnabled, UserAccessError } = await import("./userAccessControl");
  try {
    await assertUserServiceEnabled(userId, "withdrawals");
  } catch (err) {
    if (err instanceof UserAccessError) {
      throw new WalletError(err.message, err.code);
    }
    throw err;
  }
}

export async function createWithdrawalRequest(
  userId: number,
  opts: { amount: number; currency: string; paymentMethod: string; paymentAccountId?: number; notes?: string; clientIp?: string },
) {
  const { amount, currency, paymentMethod, paymentAccountId, notes } = opts;
  if (amount <= 0) throw new WalletError("Amount must be positive", "INVALID_AMOUNT");

  await checkWithdrawalsEnabled(userId);
  await checkKycRequired(userId);
  await assertWithdrawalAllowed({
    userId,
    amount,
    currency,
    clientIp: opts.clientIp,
  });

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

  const wallet = await getWalletFinancialSummary(userId);
  const walletBalance = isCrypto ? wallet.cryptoBalance : wallet.fiatBalance;
  if (totalDebit > walletBalance + 1e-9) {
    const maxBeforeFee = walletBalance / (1 + feePercent / 100);
    const maxInCurrency = isCrypto
      ? maxBeforeFee
      : currency.toUpperCase() === "USD"
        ? maxBeforeFee
        : await convertFromUsd(maxBeforeFee, currency);
    const formattedMax = maxInCurrency.toLocaleString(undefined, { maximumFractionDigits: isCrypto ? 8 : 2 });
    throw new WalletError(
      `Amount exceeds available wallet balance. Enter an amount less than or equal to ${formattedMax} ${currency.toUpperCase()}.`,
      "INSUFFICIENT_BALANCE",
    );
  }

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    currency: currency as any,
    paymentMethod,
    paymentAccountId: paymentAccountId ?? null,
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

  emitN8nEvent("withdrawal.submitted", {
    transactionId: txn.id,
    userId,
    amount,
    currency,
    paymentMethod,
    paymentAccountId: paymentAccountId ?? null,
  });

  return mapTxn(txn);
}
