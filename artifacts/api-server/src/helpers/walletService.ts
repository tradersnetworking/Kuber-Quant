import { db, usersTable, walletLedgerTable } from "@workspace/db";
import { eq, desc, and, inArray, sql } from "drizzle-orm";

const CRYPTO_CURRENCIES = new Set(["BTC", "ETH", "USDT"]);

export type WalletType = "fiat" | "crypto";
export type LedgerType = "deposit" | "withdrawal" | "profit" | "referral" | "investment" | "bonus" | "adjustment" | "transfer";

export class WalletError extends Error {
  constructor(message: string, public code: string = "WALLET_ERROR") {
    super(message);
    this.name = "WalletError";
  }
}

function isCryptoCurrency(currency: string): boolean {
  return CRYPTO_CURRENCIES.has(currency.toUpperCase());
}

function walletForCurrency(currency: string): WalletType {
  return isCryptoCurrency(currency) ? "crypto" : "fiat";
}

export async function getUserBalances(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) throw new WalletError("User not found", "USER_NOT_FOUND");
  return {
    user,
    fiat: Number(user.balanceFiat),
    crypto: Number(user.balanceCrypto),
  };
}

export async function creditWallet(opts: {
  userId: number;
  amount: number;
  currency: string;
  type: LedgerType;
  referenceType?: string;
  referenceId?: number;
  description?: string;
}) {
  if (opts.amount <= 0) throw new WalletError("Amount must be positive", "INVALID_AMOUNT");
  const walletType = walletForCurrency(opts.currency);

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, opts.userId)).limit(1);
    if (!user) throw new WalletError("User not found", "USER_NOT_FOUND");

    const before = walletType === "fiat" ? Number(user.balanceFiat) : Number(user.balanceCrypto);
    const after = before + opts.amount;

    if (walletType === "fiat") {
      await tx.update(usersTable).set({ balanceFiat: String(after) }).where(eq(usersTable.id, opts.userId));
    } else {
      await tx.update(usersTable).set({ balanceCrypto: String(after) }).where(eq(usersTable.id, opts.userId));
    }

    await tx.insert(walletLedgerTable).values({
      userId: opts.userId,
      type: opts.type,
      amount: String(opts.amount),
      currency: opts.currency,
      walletType,
      balanceBefore: String(before),
      balanceAfter: String(after),
      referenceType: opts.referenceType || null,
      referenceId: opts.referenceId || null,
      description: opts.description || null,
    });

    return { before, after, walletType };
  });
}

export async function debitWallet(opts: {
  userId: number;
  amount: number;
  currency: string;
  type: LedgerType;
  referenceType?: string;
  referenceId?: number;
  description?: string;
  allowNegative?: boolean;
}) {
  if (opts.amount <= 0) throw new WalletError("Amount must be positive", "INVALID_AMOUNT");
  const walletType = walletForCurrency(opts.currency);

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, opts.userId)).limit(1);
    if (!user) throw new WalletError("User not found", "USER_NOT_FOUND");

    const before = walletType === "fiat" ? Number(user.balanceFiat) : Number(user.balanceCrypto);
    if (!opts.allowNegative && before < opts.amount) {
      throw new WalletError("Insufficient balance", "INSUFFICIENT_BALANCE");
    }
    const after = before - opts.amount;

    if (walletType === "fiat") {
      await tx.update(usersTable).set({ balanceFiat: String(Math.max(0, after)) }).where(eq(usersTable.id, opts.userId));
    } else {
      await tx.update(usersTable).set({ balanceCrypto: String(Math.max(0, after)) }).where(eq(usersTable.id, opts.userId));
    }

    await tx.insert(walletLedgerTable).values({
      userId: opts.userId,
      type: opts.type,
      amount: String(-opts.amount),
      currency: opts.currency,
      walletType,
      balanceBefore: String(before),
      balanceAfter: String(Math.max(0, after)),
      referenceType: opts.referenceType || null,
      referenceId: opts.referenceId || null,
      description: opts.description || null,
    });

    return { before, after: Math.max(0, after), walletType };
  });
}

export async function transferBetweenWallets(opts: {
  userId: number;
  fromWallet: WalletType;
  toWallet: WalletType;
  amount: number;
}) {
  if (opts.fromWallet === opts.toWallet) throw new WalletError("Cannot transfer to same wallet", "SAME_WALLET");
  if (opts.amount <= 0) throw new WalletError("Amount must be positive", "INVALID_AMOUNT");

  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, opts.userId)).limit(1);
    if (!user) throw new WalletError("User not found", "USER_NOT_FOUND");

    const fiatBefore = Number(user.balanceFiat);
    const cryptoBefore = Number(user.balanceCrypto);

    if (opts.fromWallet === "fiat" && fiatBefore < opts.amount) {
      throw new WalletError("Insufficient fiat balance", "INSUFFICIENT_BALANCE");
    }
    if (opts.fromWallet === "crypto" && cryptoBefore < opts.amount) {
      throw new WalletError("Insufficient crypto balance", "INSUFFICIENT_BALANCE");
    }

    const fiatAfter = opts.fromWallet === "fiat" ? fiatBefore - opts.amount : fiatBefore + opts.amount;
    const cryptoAfter = opts.fromWallet === "crypto" ? cryptoBefore - opts.amount : cryptoBefore + opts.amount;

    await tx.update(usersTable).set({
      balanceFiat: String(fiatAfter),
      balanceCrypto: String(cryptoAfter),
    }).where(eq(usersTable.id, opts.userId));

    await tx.insert(walletLedgerTable).values([
      {
        userId: opts.userId,
        type: "transfer",
        amount: String(-opts.amount),
        currency: opts.fromWallet === "fiat" ? "USD" : "USDT",
        walletType: opts.fromWallet,
        balanceBefore: String(opts.fromWallet === "fiat" ? fiatBefore : cryptoBefore),
        balanceAfter: String(opts.fromWallet === "fiat" ? fiatAfter : cryptoAfter),
        description: `Transfer to ${opts.toWallet} wallet`,
      },
      {
        userId: opts.userId,
        type: "transfer",
        amount: String(opts.amount),
        currency: opts.toWallet === "fiat" ? "USD" : "USDT",
        walletType: opts.toWallet,
        balanceBefore: String(opts.toWallet === "fiat" ? fiatBefore : cryptoBefore),
        balanceAfter: String(opts.toWallet === "fiat" ? fiatAfter : cryptoAfter),
        description: `Transfer from ${opts.fromWallet} wallet`,
      },
    ]);

    return { fiatAfter, cryptoAfter };
  });
}

export async function getLedger(
  userId: number,
  opts: { limit?: number; offset?: number; types?: LedgerType[] } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const offset = opts.offset ?? 0;
  const conditions = [eq(walletLedgerTable.userId, userId)];
  if (opts.types?.length) {
    conditions.push(inArray(walletLedgerTable.type, opts.types));
  }
  return db.select().from(walletLedgerTable)
    .where(and(...conditions))
    .orderBy(desc(walletLedgerTable.createdAt))
    .limit(limit)
    .offset(offset);
}

export function mapLedgerEntry(e: typeof walletLedgerTable.$inferSelect) {
  return {
    id: e.id,
    type: e.type,
    amount: Number(e.amount),
    currency: e.currency,
    walletType: e.walletType,
    balanceBefore: Number(e.balanceBefore),
    balanceAfter: Number(e.balanceAfter),
    referenceType: e.referenceType,
    referenceId: e.referenceId,
    description: e.description,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function countLedger(userId: number, types?: LedgerType[]) {
  const conditions = [eq(walletLedgerTable.userId, userId)];
  if (types?.length) conditions.push(inArray(walletLedgerTable.type, types));
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(walletLedgerTable)
    .where(and(...conditions));
  return row?.count ?? 0;
}

export { isCryptoCurrency, walletForCurrency };
