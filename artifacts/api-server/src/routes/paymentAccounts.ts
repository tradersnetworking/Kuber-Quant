import { Router } from "express";
import { db, userPaymentAccountsTable, usersTable } from "@workspace/db";
import { eq, and } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { WalletError } from "../helpers/walletService";
import { createWithdrawalRequest } from "../helpers/withdrawalService";
import { verifyTotpCode } from "../helpers/totpUtil";
import {
  createWithdrawalConfirmation, loadPendingWithdrawal, markWithdrawalConfirmed, verifyWithdrawalPassword,
} from "../helpers/withdrawalConfirmationService";
import { createEmailOtp, verifyEmailOtp, sendOtpEmail } from "../helpers/authHelpers";
import { clientIp } from "../helpers/trustedDeviceService";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../lib/jwtSecret";
import { getUserBiometricPrefs } from "../helpers/webauthnService";

import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import {
  buildUserAccountInsertValues,
  mapUserPaymentAccountResponse,
  normalizeUserAccountWrite,
} from "../helpers/paymentCredentialsService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  PaymentAccountCreateBody,
  PaymentAccountPatchBody,
  WithdrawRequestBody,
} from "../lib/routeBodySchemas";

const router = Router();
const upiQrUpload = createUploadMiddleware("qr_codes");

function mapAccount(a: typeof userPaymentAccountsTable.$inferSelect) {
  return mapUserPaymentAccountResponse(a);
}

function formatPaymentMethod(a: typeof userPaymentAccountsTable.$inferSelect): string {
  if (a.accountType === "bank") {
    return `Bank: ${a.bankName} | ${a.accountHolderName} | A/C ${a.accountNumber} | IFSC ${a.ifscCode || "—"}`;
  }
  if (a.accountType === "upi") return `UPI: ${a.upiId}`;
  if (a.accountType === "digital_rupee") return `Digital Rupee: ${a.digitalRupeeId}`;
  return `Crypto ${a.cryptoSymbol} (${a.cryptoNetwork || "—"}): ${a.walletAddress}`;
}

function currencyForAccount(a: typeof userPaymentAccountsTable.$inferSelect): string {
  if (a.accountType === "crypto") {
    const sym = (a.cryptoSymbol || "USDT").toUpperCase();
    if (["BTC", "ETH", "USDT", "USDC", "BNB", "TRX", "SOL", "XRP", "DOGE", "LTC"].includes(sym)) return sym;
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
  if (!(symbol || "").trim()) return "cryptoSymbol is required for crypto accounts";
  if (network.trim().length < 2) return "Enter a valid network / chain name";
  const sym = (symbol || "USDT").toUpperCase();
  const net = normalizeNetwork(network);
  if (sym === "USDT" && !USDT_CHAINS.has(net)) {
    return "USDT withdrawals support TRC20, ERC20, or BEP20 only";
  }
  return null;
}

router.post("/withdraw", requireAuth, validateBody(WithdrawRequestBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<
    | { confirmationToken: string; emailOtp: string }
    | {
      paymentAccountId: number;
      amount: number;
      currency?: string;
      cryptoNetwork?: string;
      password: string;
      totpCode: string;
    }
  >(req);

  if ("confirmationToken" in body && "emailOtp" in body) {
    const { confirmationToken, emailOtp } = body;
    const pending = await loadPendingWithdrawal(String(confirmationToken), userId);
    if (!pending) {
      res.status(400).json({ error: "Invalid or expired withdrawal confirmation. Please start again.", code: "CONFIRMATION_EXPIRED" });
      return;
    }
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const otpValid = await verifyEmailOtp({ email: user.email, otp: String(emailOtp), purpose: "withdrawal_confirm" });
    if (!otpValid) {
      res.status(400).json({ error: "Invalid or expired email confirmation code.", code: "INVALID_EMAIL_OTP" });
      return;
    }

    try {
      const txn = await createWithdrawalRequest(userId, {
        amount: Number(pending.amount),
        currency: pending.currency,
        paymentMethod: pending.paymentMethod,
        paymentAccountId: pending.paymentAccountId,
        notes: pending.notes ?? undefined,
        clientIp: pending.clientIp ?? undefined,
      });
      await markWithdrawalConfirmed(pending.id);
      res.status(201).json(txn);
    } catch (err) {
      if (err instanceof WalletError) {
        res.status(400).json({ error: err.message, code: err.code });
        return;
      }
      throw err;
    }
    return;
  }

  const {
    paymentAccountId, amount, currency: bodyCurrency, cryptoNetwork, password, totpCode, biometricActionToken,
  } = body as {
    paymentAccountId: number;
    amount: number;
    currency?: string;
    cryptoNetwork?: string;
    password: string;
    totpCode: string;
    biometricActionToken?: string;
  };

  // Step 1: password + TOTP → send email confirmation

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    res.status(400).json({ error: "Enable two-factor authentication before withdrawing.", code: "WITHDRAWAL_2FA_REQUIRED" });
    return;
  }
  if (!(await verifyWithdrawalPassword(userId, String(password)))) {
    res.status(400).json({ error: "Incorrect password.", code: "INVALID_PASSWORD" });
    return;
  }
  if (!verifyTotpCode(user.twoFactorSecret, String(totpCode))) {
    res.status(400).json({ error: "Invalid authenticator code.", code: "INVALID_TOTP" });
    return;
  }

  const numAmount = Number(amount);
  if (numAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  const withdrawCurrency = (bodyCurrency || "INR").toUpperCase();
  const biometricPrefs = await getUserBiometricPrefs(userId);
  const biometricThreshold = Number(biometricPrefs.withdrawalThresholdInr ?? 10000);
  if (
    biometricPrefs.biometricWithdrawalsEnabled &&
    withdrawCurrency === "INR" &&
    numAmount >= biometricThreshold
  ) {
    if (!biometricActionToken) {
      res.status(400).json({
        error: `Fingerprint verification required for withdrawals of ₹${biometricThreshold.toLocaleString("en-IN")} or more.`,
        code: "BIOMETRIC_REQUIRED",
        thresholdInr: biometricThreshold,
      });
      return;
    }
    try {
      const payload = jwt.verify(String(biometricActionToken), JWT_SECRET) as { userId?: number; purpose?: string };
      if (payload.userId !== userId || payload.purpose !== "biometric_action") {
        res.status(400).json({ error: "Invalid biometric verification.", code: "BIOMETRIC_INVALID" });
        return;
      }
    } catch {
      res.status(400).json({ error: "Biometric verification expired. Please verify again.", code: "BIOMETRIC_EXPIRED" });
      return;
    }
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
  const notes = `Withdraw to personal ${account.accountType} account #${account.id} (${account.label})${account.cryptoNetwork ? ` chain ${account.cryptoNetwork}` : ""}`;
  const ip = clientIp(req);

  const { confirmationToken: token, expiresAt } = await createWithdrawalConfirmation({
    userId,
    paymentAccountId: account.id,
    amount: numAmount,
    currency,
    paymentMethod,
    notes,
    clientIp: ip,
  });

  const { otp } = await createEmailOtp({
    email: user.email,
    userId: user.id,
    purpose: "withdrawal_confirm",
    ttlMinutes: 15,
  });
  await sendOtpEmail({
    to: user.email,
    name: user.fullName,
    otp,
    purpose: `Withdrawal Confirmation (${numAmount} ${currency})`,
  });

  res.json({
    requiresEmailConfirmation: true,
    confirmationToken: token,
    expiresAt: expiresAt.toISOString(),
    maskedEmail: user.email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    message: "Check your email for a confirmation code to complete this withdrawal.",
  });
});
router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const rows = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.userId, userId), eq(userPaymentAccountsTable.isActive, true)))
    .orderBy(userPaymentAccountsTable.isDefault);

  const { ensureUserPaymentAccountQr } = await import("../helpers/qrCodeService");
  const ensured = await Promise.all(rows.map(ensureUserPaymentAccountQr));
  res.json(ensured.map(mapAccount));
});

router.post("/", requireAuth, validateBody(PaymentAccountCreateBody), async (req, res) => {
  const { userId } = (req as any).user;
  const body = getValidatedBody<Record<string, unknown>>(req);
  const {
    label, accountType, accountHolderName, bankName, accountNumber,
    ifscCode, branchName, upiId, digitalRupeeId, upiQrUrl, cryptoSymbol, cryptoNetwork, walletAddress, walletQrUrl, isDefault,
  } = body as {
    label: string;
    accountType: "bank" | "upi" | "digital_rupee" | "crypto";
    accountHolderName?: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    branchName?: string;
    upiId?: string;
    digitalRupeeId?: string;
    upiQrUrl?: string;
    cryptoSymbol?: string;
    cryptoNetwork?: string;
    walletAddress?: string;
    walletQrUrl?: string;
    isDefault?: boolean;
  };

  if (accountType === "bank" && (!accountHolderName || !bankName || !accountNumber)) {
    res.status(400).json({ error: "Bank accounts require accountHolderName, bankName, accountNumber" });
    return;
  }
  if (accountType === "upi" && !upiId) {
    res.status(400).json({ error: "UPI accounts require upiId" });
    return;
  }
  if (accountType === "digital_rupee" && !digitalRupeeId) {
    res.status(400).json({ error: "Digital Rupee accounts require digitalRupeeId" });
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

  const insertValues = buildUserAccountInsertValues(userId, { ...body, isDefault: !!isDefault });
  const { resolveUserAccountQrUrls } = await import("../helpers/qrCodeService");
  const autoQr = await resolveUserAccountQrUrls({
    accountType,
    label: insertValues.label || "Account",
    upiId: insertValues.upiId,
    digitalRupeeId: insertValues.digitalRupeeId,
    walletAddress: insertValues.walletAddress,
    upiQrUrl: insertValues.upiQrUrl || null,
    walletQrUrl: insertValues.walletQrUrl || null,
    identifierChanged: true,
  });

  const [created] = await db.insert(userPaymentAccountsTable).values({
    ...insertValues,
    upiQrUrl: autoQr.upiQrUrl ?? insertValues.upiQrUrl ?? null,
    walletQrUrl: autoQr.walletQrUrl ?? insertValues.walletQrUrl ?? null,
  }).returning();

  res.status(201).json(mapAccount(created));
});

router.patch("/:id", requireAuth, validateBody(PaymentAccountPatchBody), async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const patchBody = getValidatedBody<Record<string, unknown>>(req);
  const [existing] = await db.select().from(userPaymentAccountsTable)
    .where(and(eq(userPaymentAccountsTable.id, id), eq(userPaymentAccountsTable.userId, userId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { updates, accountType: mergedType, identifierChanged } = normalizeUserAccountWrite(patchBody, existing);

  const mergedSymbol = (updates.cryptoSymbol as string) ?? existing.cryptoSymbol;
  const mergedNetwork = (updates.cryptoNetwork as string) ?? existing.cryptoNetwork;
  if (mergedType === "crypto") {
    const cryptoErr = validateCryptoAccount(mergedSymbol, mergedNetwork);
    if (cryptoErr) {
      res.status(400).json({ error: cryptoErr });
      return;
    }
  }

  if (patchBody.isDefault) {
    await db.update(userPaymentAccountsTable)
      .set({ isDefault: false })
      .where(eq(userPaymentAccountsTable.userId, userId));
  }

  const mergedLabel = (updates.label as string) ?? existing.label;
  const mergedUpi = (updates.upiId as string | null | undefined) ?? existing.upiId;
  const mergedDigitalRupee = (updates.digitalRupeeId as string | null | undefined) ?? existing.digitalRupeeId;
  const mergedWallet = (updates.walletAddress as string | null | undefined) ?? existing.walletAddress;
  const mergedUpiQr = (updates.upiQrUrl as string | null | undefined) ?? existing.upiQrUrl;
  const mergedWalletQr = (updates.walletQrUrl as string | null | undefined) ?? existing.walletQrUrl;

  const { resolveUserAccountQrUrls } = await import("../helpers/qrCodeService");
  const autoQr = await resolveUserAccountQrUrls({
    accountType: mergedType,
    label: mergedLabel,
    upiId: mergedUpi,
    digitalRupeeId: mergedDigitalRupee,
    walletAddress: mergedWallet,
    upiQrUrl: mergedUpiQr,
    walletQrUrl: mergedWalletQr,
    identifierChanged,
  });
  if (autoQr.upiQrUrl !== undefined) updates.upiQrUrl = autoQr.upiQrUrl;
  if (autoQr.walletQrUrl !== undefined) updates.walletQrUrl = autoQr.walletQrUrl;

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

router.post("/upload/upi-qr", requireAuth, upiQrUpload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }
  res.json({ url: getUploadUrl("qr_codes", req.file.filename) });
});

router.post("/upload/wallet-qr", requireAuth, upiQrUpload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }
  res.json({ url: getUploadUrl("qr_codes", req.file.filename) });
});

export default router;
