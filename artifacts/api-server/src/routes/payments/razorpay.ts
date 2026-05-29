import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { db, transactionsTable, paymentOrdersTable, notificationsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { requireAuth } from "../../middlewares/auth";
import { tryAutoApproveGatewayDeposit } from "../../helpers/gatewayAutoApprove";

const router = Router();

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency = "INR" } = req.body;
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

  const [order] = await db.select().from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.orderId, razorpay_order_id)).limit(1);
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status === "paid") {
    res.json({ message: "Payment already processed", orderId: razorpay_order_id });
    return;
  }

  const depositAmount = amount ? Number(amount) : Number(order.amount);
  const depositCurrency = (currency || order.currency || "INR").toUpperCase() as "USD" | "EUR" | "INR" | "BTC" | "ETH" | "USDT" | "TRX" | "BNB";
  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: String(depositAmount),
    currency: depositCurrency,
    status: "pending",
    paymentMethod: "Razorpay",
    gatewayProvider: "razorpay",
    gatewayOrderId: razorpay_order_id,
    gatewayPaymentId: razorpay_payment_id,
    notes: "Razorpay payment verified — pending admin approval",
  }).returning();

  await db.update(paymentOrdersTable).set({
    status: "paid",
    paymentId: razorpay_payment_id,
    transactionId: txn.id,
  }).where(eq(paymentOrdersTable.id, order.id));

  await db.insert(notificationsTable).values({
    userId,
    title: "Deposit Submitted",
    message: `${depositAmount} ${depositCurrency} via Razorpay is pending admin approval.`,
    type: "info",
    isRead: false,
  });

  const autoApproved = await tryAutoApproveGatewayDeposit(txn.id);

  res.json({
    success: true,
    transactionId: txn.id,
    autoApproved,
    status: autoApproved ? "approved" : "pending",
  });
});

router.post("/webhook", async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (process.env.NODE_ENV === "production" && !webhookSecret) {
    res.status(503).json({ error: "Razorpay webhook secret is not configured" });
    return;
  }
  if (webhookSecret) {
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
  }

  const event = req.body?.event;
  if (event === "payment.captured") {
    const payment = req.body.payload?.payment?.entity;
    if (payment) {
      const [order] = await db.select().from(paymentOrdersTable)
        .where(eq(paymentOrdersTable.orderId, payment.order_id)).limit(1);
      if (order && order.status !== "paid") {
        const userId = order.userId;
        const amount = Number(order.amount);
        const orderCurrency = (order.currency || "INR").toUpperCase() as "USD" | "EUR" | "INR" | "BTC" | "ETH" | "USDT" | "TRX" | "BNB";
        const [txn] = await db.insert(transactionsTable).values({
          userId,
          type: "deposit",
          amount: String(amount),
          currency: orderCurrency,
          status: "pending",
          paymentMethod: "Razorpay",
          gatewayProvider: "razorpay",
          gatewayOrderId: payment.order_id,
          gatewayPaymentId: payment.id,
          notes: "Razorpay webhook — pending admin approval",
        }).returning();
        await db.update(paymentOrdersTable).set({ status: "paid", paymentId: payment.id, transactionId: txn.id })
          .where(eq(paymentOrdersTable.id, order.id));
        await tryAutoApproveGatewayDeposit(txn.id);
      }
    }
  }
  res.json({ received: true });
});

export default router;
