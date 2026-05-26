import { db, userPaymentAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const CRYPTO_KEY_MAP: Record<string, { symbol: string; network: string; label: string }> = {
  btc: { symbol: "BTC", network: "BTC", label: "BTC Wallet" },
  eth: { symbol: "ETH", network: "ERC20", label: "ETH Wallet" },
  usdtTrc20: { symbol: "USDT", network: "TRC20", label: "USDT TRC20" },
  usdtErc20: { symbol: "USDT", network: "ERC20", label: "USDT ERC20" },
  usdtBep20: { symbol: "USDT", network: "BEP20", label: "USDT BEP20" },
  bnb: { symbol: "BNB", network: "BEP20", label: "BNB Wallet" },
  xrp: { symbol: "XRP", network: "XRP", label: "XRP Wallet" },
  tron: { symbol: "TRX", network: "TRC20", label: "Tron Wallet" },
};

export async function seedPaymentAccountsFromOnboarding(
  userId: number,
  data: {
    accountHolderName?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    ifscCode?: string | null;
    branchName?: string | null;
    upiId?: string | null;
    cryptoWallets?: Record<string, string> | null;
  },
) {
  const [existing] = await db.select({ id: userPaymentAccountsTable.id })
    .from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))
    .limit(1);
  if (existing) return;

  let isDefault = true;
  const rows: (typeof userPaymentAccountsTable.$inferInsert)[] = [];

  if (data.accountNumber && data.bankName && data.accountHolderName) {
    rows.push({
      userId,
      label: "Primary Bank Account",
      accountType: "bank",
      accountHolderName: data.accountHolderName,
      bankName: data.bankName,
      accountNumber: String(data.accountNumber),
      ifscCode: data.ifscCode || null,
      branchName: data.branchName || null,
      isDefault,
    });
    isDefault = false;
  }

  if (data.upiId) {
    rows.push({
      userId,
      label: "Primary UPI",
      accountType: "upi",
      upiId: data.upiId,
      accountHolderName: data.accountHolderName || null,
      isDefault,
    });
    isDefault = false;
  }

  const wallets = data.cryptoWallets || {};
  for (const [key, address] of Object.entries(wallets)) {
    if (!address?.trim()) continue;
    const meta = CRYPTO_KEY_MAP[key];
    if (!meta) continue;
    rows.push({
      userId,
      label: meta.label,
      accountType: "crypto",
      cryptoSymbol: meta.symbol,
      cryptoNetwork: meta.network,
      walletAddress: address.trim(),
      isDefault: isDefault && rows.length === 0,
    });
    isDefault = false;
  }

  if (rows.length) {
    await db.insert(userPaymentAccountsTable).values(rows);
  }
}

export function mapPaymentAccount(a: typeof userPaymentAccountsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    label: a.label,
    accountType: a.accountType,
    accountHolderName: a.accountHolderName || null,
    bankName: a.bankName || null,
    accountNumber: a.accountNumber ? maskAccountNumber(a.accountNumber) : null,
    accountNumberFull: a.accountNumber || null,
    ifscCode: a.ifscCode || null,
    branchName: a.branchName || null,
    upiId: a.upiId || null,
    cryptoSymbol: a.cryptoSymbol || null,
    cryptoNetwork: a.cryptoNetwork || null,
    walletAddress: a.walletAddress || null,
    isDefault: a.isDefault,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt?.toISOString() || null,
  };
}

export function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return `****${num.slice(-4)}`;
}
