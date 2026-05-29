import { Router } from "express";
import { db, paymentOrdersTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

function getPayPalConfig() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  const mode = process.env.PAYPAL_MODE || "sandbox";
  const baseUrl = mode === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  return { clientId, clientSecret, baseUrl };
}

async function getPayPalAccessToken(): Promise<string | null> {
  const { clientId, clientSecret, baseUrl } = getPayPalConfig();
  if (!clientId || !clientSecret) return null;

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const data = await res.json() as { access_token?: string };
  return data.access_token || null;
}

router.post("/create-order", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency = "USD" } = req.body;
  if (!amount || Number(amount) <= 0) {
    res.status(400).json({ error: "Valid amount is required" });
    return;
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    res.status(503).json({ error: "PayPal is not configured" });
    return;
  }

  const { baseUrl } = getPayPalConfig();
  const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { currency_code: currency, value: String(Number(amount).toFixed(2)) },
        description: `Kuber Quant deposit — User ${userId}`,
      }],
    }),
  });
  const order = await response.json() as { id?: string; status?: string; links?: { rel: string; href: string }[] };
  if (!order.id) {
    res.status(502).json({ error: "Failed to create PayPal order", details: order });
    return;
  }

  await db.insert(paymentOrdersTable).values({
    userId,
    provider: "paypal",
    orderId: order.id,
    amount: String(amount),
    currency,
    status: "created",
  });

  const approveLink = order.links?.find(l => l.rel === "approve")?.href;
  res.json({ orderId: order.id, approveUrl: approveLink });
});

router.post("/capture", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { orderId } = req.body;
  if (!orderId) {
    res.status(400).json({ error: "orderId is required" });
    return;
  }

  const [order] = await db.select().from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.orderId, orderId)).limit(1);
  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  if (order.status === "paid") {
    res.json({ message: "Already captured" });
    return;
  }

  const token = await getPayPalAccessToken();
  if (!token) {
    res.status(503).json({ error: "PayPal is not configured" });
    return;
  }

  const { baseUrl } = getPayPalConfig();
  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  const capture = await response.json() as { status?: string; purchase_units?: { payments?: { captures?: { id: string }[] } }[] };

  if (capture.status !== "COMPLETED") {
    await db.update(paymentOrdersTable).set({ status: "failed" }).where(eq(paymentOrdersTable.id, order.id));
    res.status(400).json({ error: "Payment not completed", status: capture.status });
    return;
  }

  const paymentId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id || orderId;
  const amount = Number(order.amount);

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: String(amount),
    currency: order.currency as any,
    status: "pending",
    paymentMethod: "PayPal",
    gatewayProvider: "paypal",
    gatewayOrderId: orderId,
    gatewayPaymentId: paymentId,
    notes: "PayPal payment captured — pending admin approval",
  }).returning();

  await db.update(paymentOrdersTable).set({ status: "paid", paymentId, transactionId: txn.id })
    .where(eq(paymentOrdersTable.id, order.id));

  await db.insert(notificationsTable).values({
    userId,
    title: "Deposit Submitted",
    message: `${amount} ${order.currency} via PayPal is pending admin approval.`,
    type: "info",
    isRead: false,
  });

  res.json({ success: true, transactionId: txn.id });
});

export default router;
