import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { db, transactionsTable, paymentOrdersTable, notificationsTable } from "@workspace/db";
import { and, eq, ne } from "@workspace/db/orm";
import { requireAuth } from "../../middlewares/auth";
import { tryAutoApproveGatewayDeposit } from "../../helpers/gatewayAutoApprove";

const router = Router();

type FiatCurrency = "USD" | "EUR" | "INR" | "BTC" | "ETH" | "USDT" | "TRX" | "BNB";

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function orderCurrency(order: { currency: string | null }): FiatCurrency {
  return (order.currency || "INR").toUpperCase() as FiatCurrency;
}

/**
 * Atomically mark an order paid and insert a pending deposit using the stored order amount.
 * Concurrent verify + webhook cannot double-credit because only one UPDATE wins.
 */
async function settleRazorpayOrder(opts: {
  orderId: string;
  paymentId: string;
  notes: string;
  expectedUserId?: number;
}): Promise<{ alreadyPaid: boolean; transactionId?: number; userId?: number; amount?: number; currency?: FiatCurrency }> {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(paymentOrdersTable)
      .where(eq(paymentOrdersTable.orderId, opts.orderId))
      .limit(1);
    if (!order) {
      return { alreadyPaid: false };
    }
    if (opts.expectedUserId != null && order.userId !== opts.expectedUserId) {
      return { alreadyPaid: false };
    }
    if (order.status === "paid") {
      return { alreadyPaid: true, userId: order.userId };
    }

    const [claimed] = await tx.update(paymentOrdersTable).set({
      status: "paid",
      paymentId: opts.paymentId,
    }).where(and(
      eq(paymentOrdersTable.id, order.id),
      ne(paymentOrdersTable.status, "paid"),
    )).returning();

    if (!claimed) {
      return { alreadyPaid: true, userId: order.userId };
    }

    const amount = Number(claimed.amount);
    const currency = orderCurrency(claimed);
    const [txn] = await tx.insert(transactionsTable).values({
      userId: claimed.userId,
      type: "deposit",
      amount: String(amount),
      currency,
      status: "pending",
      paymentMethod: "Razorpay",
      gatewayProvider: "razorpay",
      gatewayOrderId: opts.orderId,
      gatewayPaymentId: opts.paymentId,
      notes: opts.notes,
    }).returning();

    await tx.update(paymentOrdersTable).set({
      transactionId: txn.id,
    }).where(eq(paymentOrdersTable.id, claimed.id));

    return {
      alreadyPaid: false,
      transactionId: txn.id,
      userId: claimed.userId,
      amount,
      currency,
    };
  });
}

router.post("/create-order", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency = "INR" } = req.body;
  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const rzp = getRazorpay();
  if (!rzp) {
    res.status(503).json({ error: "Razorpay is not configured" });
    return;
  }

  const amountPaise = Math.round(Number(amount) * 100);
  const order = await rzp.orders.create({
    amount: amountPaise,
    currency,
    receipt: `kuber_${userId}_${Date.now()}`,
    notes: { userId: String(userId) },
  });

  await db.insert(paymentOrdersTable).values({
    userId,
    provider: "razorpay",
    orderId: order.id,
    amount: String(amount),
    currency,
    status: "created",
    metadata: { receipt: order.receipt },
  });

  res.json({
    orderId: order.id,
    amount: amountPaise,
    currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
});

router.post("/verify", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    res.status(400).json({ error: "Missing Razorpay verification fields" });
    return;
  }

  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    res.status(503).json({ error: "Razorpay is not configured" });
    return;
  }

  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
  if (expected !== razorpay_signature) {
    res.status(400).json({ error: "Invalid payment signature" });
    return;
  }

  const settled = await settleRazorpayOrder({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    notes: "Razorpay payment verified — pending admin approval",
    expectedUserId: userId,
  });

  if (!settled.userId && !settled.alreadyPaid) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (settled.alreadyPaid) {
    res.json({ message: "Payment already processed", orderId: razorpay_order_id });
    return;
  }

  await db.insert(notificationsTable).values({
    userId,
    title: "Deposit Submitted",
    message: `${settled.amount} ${settled.currency} via Razorpay is pending admin approval.`,
    type: "info",
    isRead: false,
  });

  const autoApproved = await tryAutoApproveGatewayDeposit(settled.transactionId!);

  res.json({
    success: true,
    transactionId: settled.transactionId,
    autoApproved,
    status: autoApproved ? "approved" : "pending",
  });
});

router.post("/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) {
    res.status(503).json({ error: "Razorpay webhook secret is not configured" });
    return;
  }
  const signature = req.headers["x-razorpay-signature"] as string;
  if (!signature) {
    res.status(400).json({ error: "Missing webhook signature" });
    return;
  }
  const expected = crypto.createHmac("sha256", webhookSecret)
    .update(JSON.stringify(req.body)).digest("hex");
  if (signature !== expected) {
    res.status(400).json({ error: "Invalid webhook signature" });
    return;
  }

  const event = req.body?.event;
  if (event === "payment.captured") {
    const payment = req.body.payload?.payment?.entity;
    if (payment) {
      const settled = await settleRazorpayOrder({
        orderId: payment.order_id,
        paymentId: payment.id,
        notes: "Razorpay webhook — pending admin approval",
      });
      if (settled.transactionId) {
        await tryAutoApproveGatewayDeposit(settled.transactionId);
      }
    }
  }
  res.json({ received: true });
});

export default router;
