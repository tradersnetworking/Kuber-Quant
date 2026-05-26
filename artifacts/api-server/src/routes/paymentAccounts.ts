import { Router } from "express";
import { db, userPaymentAccountsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { WalletError } from "../helpers/walletService";
import { createWithdrawalRequest } from "../helpers/withdrawalService";

const router = Router();

function mapAccount(a: typeof userPaymentAccountsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    label: a.label,
    accountType: a.accountType,
    accountHolderName: a.accountHolderName || null,
    bankName: a.bankName || null,
    accountNumber: a.accountNumber || null,
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

function formatPaymentMethod(a: typeof userPaymentAccountsTable.$inferSelect): string {
  if (a.accountType === "bank") {
    return `Bank: ${a.bankName} | ${a.accountHolderName} | A/C ${a.accountNumber} | IFSC ${a.ifscCode || "—"}`;
  }
  if (a.accountType === "upi") return `UPI: ${a.upiId}`;
  return `Crypto ${a.cryptoSymbol} (${a.cryptoNetwork || "—"}): ${a.walletAddress}`;
}

function currencyForAccount(a: typeof userPaymentAccountsTable.$inferSelect): string {
  if (a.accountType === "crypto") {
    const sym = (a.cryptoSymbol || "USDT").toUpperCase();
    if (["BTC", "ETH", "USDT"].includes(sym)) return sym;
    return "USDT";
  }
  return "USD";
}

function normalizeNetwork(n?: string | null): string {
  return (n || "").trim().toUpperCase();
}

const USDT_CHAINS = new Set(["TRC20", "ERC20", "BEP20"]);

function validateCryptoAccount(symbol?: string | null, network?: string | null): string | null {
  if (!network?.trim()) return "cryptoNetwork is required for crypto accounts";
  const sym = (symbol || "USDT").toUpperCase();
  const net = normalizeNetwork(network);
  if (sym === "USDT" && !USDT_CHAINS.has(net)) {
    return "USDT withdrawals support TRC20, ERC20, or BEP20 only";
  }
  return null;
}

router.post("/withdraw", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { paymentAccountId, amount, currency: bodyCurrency, cryptoNetwork } = req.body;

  if (!paymentAccountId || !amount) {
    res.status(400).json({ error: "paymentAccountId and amount are required" });
    return;
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  const [account] = await db.select().from(userPaymentAccountsTable)
    .where(and(
      eq(userPaymentAccountsTable.id, Number(paymentAccountId)),
      eq(userPaymentAccountsTable.userId, userId),
      eq(userPaymentAccountsTable.isActive, true),
    )).limit(1);

  if (!account) {
    res.status(404).json({ error: "Personal payout account not found" });
    return;
  }

  if (account.accountType === "crypto") {
    const cryptoErr = validateCryptoAccount(account.cryptoSymbol, account.cryptoNetwork);
    if (cryptoErr) {
      res.status(400).json({ error: cryptoErr });
      return;
    }
    if (cryptoNetwork && normalizeNetwork(cryptoNetwork) !== normalizeNetwork(account.cryptoNetwork)) {
      res.status(400).json({ error: `Account chain (${account.cryptoNetwork}) does not match selected chain (${cryptoNetwork})` });
      return;
    }
  }

  const currency = bodyCurrency || currencyForAccount(account);
  const chainLabel = account.accountType === "crypto" && account.cryptoNetwork
    ? ` [${normalizeNetwork(account.cryptoNetwork)}]`
    : "";
  const paymentMethod = formatPaymentMethod(account) + chainLabel;

  try {
    const txn = await createWithdrawalRequest(userId, {
      amount: numAmount,
      currency,
      paymentMethod,
      notes: `Withdraw to personal ${account.accountType} account #${account.id} (${account.label})${account.cryptoNetwork ? ` chain ${account.cryptoNetwork}` : ""}`,
    });
    res.status(201).json(txn);
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const rows = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))
    .orderBy(userPaymentAccountsTable.isDefault);
  res.json(rows.map(mapAccount));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const {
    label, accountType, accountHolderName, bankName, accountNumber,
    ifscCode, branchName, upiId, cryptoSymbol, cryptoNetwork, walletAddress, isDefault,
  } = req.body;

  if (!label || !accountType) {
    res.status(400).json({ error: "label and accountType are required" });
    return;
  }
  if (!["bank", "upi", "crypto"].includes(accountType)) {
    res.status(400).json({ error: "accountType must be bank, upi, or crypto" });
    return;
  }

  if (accountType === "bank" && (!accountHolderName || !bankName || !accountNumber)) {
    res.status(400).json({ error: "Bank accounts require accountHolderName, bankName, accountNumber" });
    return;
  }
  if (accountType === "upi" && !upiId) {
    res.status(400).json({ error: "UPI accounts require upiId" });
    return;
  }
  if (accountType === "crypto" && (!walletAddress || !cryptoSymbol)) {
    res.status(400).json({ error: "Crypto accounts require walletAddress and cryptoSymbol" });
    return;
  }
  if (accountType === "crypto") {
    const cryptoErr = validateCryptoAccount(cryptoSymbol, cryptoNetwork);
    if (cryptoErr) {
      res.status(400).json({ error: cryptoErr });
      return;
    }
  }

  if (isDefault) {
    await db.update(userPaymentAccountsTable)
      .set({ isDefault: false })
      .where(eq(userPaymentAccountsTable.userId, userId));
  }

  const [created] = await db.insert(userPaymentAccountsTable).values({
    userId,
    label,
    accountType,
    accountHolderName: accountHolderName || null,
    bankName: bankName || null,
    accountNumber: accountNumber || null,
    ifscCode: ifscCode || null,
    branchName: branchName || null,
    upiId: upiId || null,
    cryptoSymbol: cryptoSymbol || null,
    cryptoNetwork: cryptoNetwork || null,
    walletAddress: walletAddress || null,
    isDefault: !!isDefault,
  }).returning();

  res.status(201).json(mapAccount(created));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const [existing] = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.id, id), eq(userPaymentAccountsTable.userId, userId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const fields = [
    "label", "accountHolderName", "bankName", "accountNumber", "ifscCode",
    "branchName", "upiId", "cryptoSymbol", "cryptoNetwork", "walletAddress", "isDefault", "isActive",
  ] as const;
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  for (const f of fields) {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  }

  const mergedType = (updates.accountType as string) || existing.accountType;
  const mergedSymbol = (updates.cryptoSymbol as string) ?? existing.cryptoSymbol;
  const mergedNetwork = (updates.cryptoNetwork as string) ?? existing.cryptoNetwork;
  if (mergedType === "crypto") {
    const cryptoErr = validateCryptoAccount(mergedSymbol, mergedNetwork);
    if (cryptoErr) {
      res.status(400).json({ error: cryptoErr });
      return;
    }
  }

  if (req.body.isDefault) {
    await db.update(userPaymentAccountsTable)
      .set({ isDefault: false })
      .where(eq(userPaymentAccountsTable.userId, userId));
  }

  const [updated] = await db.update(userPaymentAccountsTable)
    .set(updates)
    .where(and(eq(userPaymentAccountsTable.id, id), eq(userPaymentAccountsTable.userId, userId)))
    .returning();

  res.json(mapAccount(updated));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const [updated] = await db.update(userPaymentAccountsTable)
    .set({ isActive: false, isDefault: false, updatedAt: new Date() })
    .where(and(eq(userPaymentAccountsTable.id, id), eq(userPaymentAccountsTable.userId, userId)))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json({ message: "Account removed", id: updated.id });
});

export default router;
