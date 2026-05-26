import { Router } from "express";
import { db, transactionsTable, usersTable, siteSettingsTable, promoCodesTable, promoUsagesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { creditWallet, debitWallet, WalletError } from "../helpers/walletService";
import { notifyUser } from "../helpers/notificationService";
import { sendTransactionalEmail, buildTransactionEmail, buildKycEmail } from "../helpers/mailer";

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
    proofUrl: t.proofUrl || null,
    utrReference: t.utrReference || null,
    gatewayProvider: t.gatewayProvider || null,
    gatewayOrderId: t.gatewayOrderId || null,
    gatewayPaymentId: t.gatewayPaymentId || null,
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
  const kycRequired = await getSetting("kyc_required", "true");
  if (kycRequired !== "true") return;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (user && user.kycStatus !== "verified") {
    throw new WalletError("KYC verification required before transactions", "KYC_REQUIRED");
  }
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(desc(transactionsTable.createdAt));
  res.json(txns.map(t => mapTxn(t)));
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { type, amount, currency, paymentMethod, txHash, notes, utrReference, gatewayProvider } = req.body;
  if (!type || !amount || !currency) {
    res.status(400).json({ error: "type, amount, currency are required" });
    return;
  }
  const numAmount = Number(amount);
  if (numAmount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  try {
    await checkKycRequired(userId);

    if (type === "withdrawal") {
      const minWithdraw = Number(await getSetting("min_withdrawal_fiat", "50"));
      if (numAmount < minWithdraw && !["BTC", "ETH", "USDT"].includes(currency)) {
        res.status(400).json({ error: `Minimum withdrawal is ${minWithdraw}` });
        return;
      }
      const feePercent = Number(await getSetting("withdrawal_fee_percent", "2"));
      const fee = numAmount * (feePercent / 100);
      const totalDebit = numAmount + fee;

      const [txn] = await db.insert(transactionsTable).values({
        userId,
        type,
        amount: String(numAmount),
        currency,
        paymentMethod,
        txHash,
        notes,
        utrReference,
        gatewayProvider: gatewayProvider || "manual",
        status: "pending",
      }).returning();

      await debitWallet({
        userId,
        amount: totalDebit,
        currency,
        type: "withdrawal",
        referenceType: "transaction",
        referenceId: txn.id,
        description: `Withdrawal request #${txn.id} (fee: ${fee.toFixed(2)})`,
      });

      await notifyUser({
        userId,
        title: "Withdrawal Requested",
        message: `Your withdrawal of ${numAmount} ${currency} is pending review.`,
        type: "info",
        category: "withdrawal",
        actionUrl: "/transactions",
      });

      await notifyTransactionSubmitted(userId, "withdrawal", numAmount, currency);

      res.status(201).json(mapTxn(txn));
      return;
    } else if (type === "deposit") {
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
      currency,
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

    res.status(201).json(mapTxn(txn));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.post("/manual-deposit", requireAuth, upload.single("proof"), async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency, paymentMethod, utrReference, txHash, notes, promoCode } = req.body;
  if (!amount || !currency || !paymentMethod) {
    res.status(400).json({ error: "amount, currency, paymentMethod are required" });
    return;
  }
  if (!utrReference && !txHash && !req.file) {
    res.status(400).json({ error: "Provide UTR/reference number, transaction hash, or payment proof" });
    return;
  }

  try {
    await checkKycRequired(userId);
    const numAmount = Number(amount);
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
