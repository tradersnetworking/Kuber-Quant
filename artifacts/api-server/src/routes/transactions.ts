import { Router } from "express";
import { db, transactionsTable, usersTable, siteSettingsTable, promoCodesTable, promoUsagesTable } from "@workspace/db";
import { eq, desc, and } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { creditWallet, WalletError } from "../helpers/walletService";
import { notifyUser } from "../helpers/notificationService";
import { sendTransactionalEmail, buildTransactionEmail, buildKycEmail } from "../helpers/mailer";
import { assertUpiDepositWithinLimit, assertDigitalRupeeDepositWithinLimit } from "../helpers/paymentLimits";
import { emitN8nEvent } from "../helpers/n8nWebhookService";
import { validateDepositProofAsync } from "../helpers/documentOcrService";
import { assertKycVerified } from "../helpers/kycGateService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { CreateTransactionBody } from "@workspace/api-zod";
import { ManualDepositBody, type ManualDepositInput } from "../lib/routeBodySchemas";
import { normalizeProofUrl } from "../helpers/proofUrlUtil";

async function notifyTransactionSubmitted(userId: number, type: string, amount: number, currency: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  const purpose = type === "deposit" ? "deposit_submitted" : "withdrawal_submitted";
  await sendTransactionalEmail({
    to: user.email,
    purpose,
    subject: `${type === "deposit" ? "Deposit" : "Withdrawal"} request received`,
    html: buildTransactionEmail({
      name: user.fullName,
      type,
      amount,
      currency,
      status: "pending review",
    }),
  });
}

const router = Router();
const upload = createUploadMiddleware("payment_proofs");

export function mapTxn(t: any, userEmail?: string) {
  return {
    id: t.id,
    userId: t.userId,
    userEmail: userEmail || null,
    type: t.type,
    amount: Number(t.amount),
    currency: t.currency,
    status: t.status,
    paymentMethod: t.paymentMethod,
    txHash: t.txHash,
    notes: t.notes,
    proofUrl: normalizeProofUrl(t.proofUrl),
    utrReference: t.utrReference || null,
    gatewayProvider: t.gatewayProvider || null,
    gatewayOrderId: t.gatewayOrderId || null,
    gatewayPaymentId: t.gatewayPaymentId || null,
    paymentAccountId: t.paymentAccountId ?? null,
    adminNotes: t.adminNotes || null,
    reviewedByUserId: t.reviewedByUserId || null,
    reviewedAt: t.reviewedAt ? t.reviewedAt.toISOString() : null,
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

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txns.map(t => mapTxn(t)));
});

router.post("/", requireAuth, validateBody(CreateTransactionBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { type, amount, currency, paymentMethod, txHash, notes } = getValidatedBody<{
    type: "deposit" | "withdrawal";
    amount: number;
    currency: string;
    paymentMethod?: string;
    txHash?: string;
    notes?: string;
  }>(req);
  const utrReference = typeof req.body.utrReference === "string" ? req.body.utrReference : undefined;
  const gatewayProvider = typeof req.body.gatewayProvider === "string" ? req.body.gatewayProvider : undefined;
  const numAmount = Number(amount);
  if (numAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  try {
    await checkKycRequired(userId);

    if (type === "withdrawal") {
      res.status(400).json({
        error: "Withdrawals must be submitted via POST /api/wallet/payment-accounts/withdraw with password, 2FA, and email confirmation.",
        code: "WITHDRAWAL_USE_SECURE_ENDPOINT",
      });
      return;
    } else if (type === "deposit") {
      const { assertUserServiceEnabled, UserAccessError } = await import("../helpers/userAccessControl");
      try {
        await assertUserServiceEnabled(userId, "deposits");
      } catch (err) {
        if (err instanceof UserAccessError) {
          res.status(403).json({ error: err.message, code: err.code });
          return;
        }
        throw err;
      }
      const minDeposit = Number(await getSetting("min_deposit_fiat", "100"));
      if (numAmount < minDeposit && !["BTC", "ETH", "USDT"].includes(currency)) {
        res.status(400).json({ error: `Minimum deposit is ${minDeposit}` });
        return;
      }
    }

    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type,
      amount: String(numAmount),
      currency: currency as typeof transactionsTable.$inferInsert.currency,
      paymentMethod,
      txHash,
      notes,
      utrReference,
      gatewayProvider: gatewayProvider || "manual",
      status: "pending",
    }).returning();

    await notifyUser({
      userId,
      title: type === "deposit" ? "Deposit Submitted" : "Withdrawal Requested",
      message: `Your ${type} of ${numAmount} ${currency} is pending review.`,
      type: "info",
      category: type === "deposit" ? "deposit" : "withdrawal",
      actionUrl: "/transactions",
    });

    await notifyTransactionSubmitted(userId, type, numAmount, currency);

    if (type === "deposit") {
      emitN8nEvent("deposit.submitted", {
        transactionId: txn.id,
        userId,
        amount: numAmount,
        currency,
        paymentMethod: paymentMethod || "manual",
      });
    }

    res.status(201).json(mapTxn(txn));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.post("/manual-deposit", requireAuth, upload.single("proof"), validateBody(ManualDepositBody), async (req, res) => {
  const { userId } = (req as any).user;
  const {
    amount,
    currency,
    paymentMethod,
    utrReference,
    txHash,
    notes,
    promoCode,
    depositMethodType,
  } = getValidatedBody<ManualDepositInput>(req);
  if (!utrReference && !txHash && !req.file) {
    res.status(400).json({ error: "Provide UTR/reference number, transaction hash, or payment proof" });
    return;
  }

  try {
    await checkKycRequired(userId);
    const numAmount = amount;
    if (String(depositMethodType || "").toLowerCase() === "upi") {
      await assertUpiDepositWithinLimit(numAmount, currency);
    }
    if (String(depositMethodType || "").toLowerCase() === "digital_rupee") {
      await assertDigitalRupeeDepositWithinLimit(numAmount, currency);
    }
    let depositNotes = notes || "";
    let promoId: number | null = null;

    if (promoCode) {
      const now = new Date();
      const [promo] = await db.select().from(promoCodesTable)
        .where(eq(promoCodesTable.code, String(promoCode).toUpperCase()))
        .limit(1);
      if (!promo || !promo.isActive) {
        res.status(400).json({ error: "Invalid promo code" }); return;
      }
      if (promo.expiresAt && promo.expiresAt < now) {
        res.status(400).json({ error: "Promo code has expired" }); return;
      }
      if (promo.usedCount >= promo.maxUses) {
        res.status(400).json({ error: "Promo code usage limit reached" }); return;
      }
      if (promo.appliesTo !== "deposit") {
        res.status(400).json({ error: "Promo code not valid for deposits" }); return;
      }
      if (promo.minAmount && numAmount < Number(promo.minAmount)) {
        res.status(400).json({ error: `Minimum deposit for this promo is ${promo.minAmount}` }); return;
      }
      const alreadyUsed = await db.select().from(promoUsagesTable)
        .where(and(eq(promoUsagesTable.promoId, promo.id), eq(promoUsagesTable.userId, userId)))
        .limit(1);
      if (alreadyUsed.length) {
        res.status(400).json({ error: "You have already used this promo code" }); return;
      }
      const discount = promo.type === "percentage"
        ? parseFloat((numAmount * Number(promo.value) / 100).toFixed(2))
        : Number(promo.value);
      depositNotes = `${depositNotes ? depositNotes + " | " : ""}Promo: ${promo.code} (-${discount} ${currency})`;
      promoId = promo.id;
    }

    const proofUrl = req.file ? getUploadUrl("payment_proofs", req.file.filename) : null;

    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: String(numAmount),
      currency,
      paymentMethod,
      txHash: txHash || null,
      utrReference: utrReference || null,
      proofUrl,
      notes: depositNotes || null,
      gatewayProvider: "manual",
      status: "pending",
    }).returning();

    if (promoId) {
      const [promo] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, promoId)).limit(1);
      const discount = promo?.type === "percentage"
        ? parseFloat((numAmount * Number(promo.value) / 100).toFixed(2))
        : Number(promo?.value || 0);
      await db.insert(promoUsagesTable).values({
        promoId,
        userId,
        discountAmount: String(discount),
        appliedTo: `deposit:${txn.id}`,
      });
      if (promo) {
        await db.update(promoCodesTable)
          .set({ usedCount: promo.usedCount + 1 })
          .where(eq(promoCodesTable.id, promoId));
      }
    }

    await notifyUser({
      userId,
      title: "Manual Deposit Submitted",
      message: `Your deposit of ${numAmount} ${currency} via ${paymentMethod} is pending admin verification.`,
      type: "info",
      category: "deposit",
      actionUrl: "/transactions",
    });

    await notifyTransactionSubmitted(userId, "deposit", numAmount, currency);

    emitN8nEvent("deposit.submitted", {
      transactionId: txn.id,
      userId,
      amount: numAmount,
      currency,
      paymentMethod,
      utrReference: utrReference || null,
    });

    if (proofUrl) {
      void validateDepositProofAsync({ userId, transactionId: txn.id, proofUrl });
    }

    res.status(201).json(mapTxn(txn));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

export default router;
