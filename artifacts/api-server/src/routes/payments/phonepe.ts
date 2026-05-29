import { Router } from "express";
import crypto from "crypto";
import { db, paymentOrdersTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

function sha256(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getPhonePeConfig() {
  return {
    merchantId: process.env.PHONEPE_MERCHANT_ID || "",
    saltKey: process.env.PHONEPE_SALT_KEY || "",
    saltIndex: process.env.PHONEPE_SALT_INDEX || "1",
    env: process.env.PHONEPE_ENV || "UAT",
  };
}

function phonePeBaseUrl(env: string) {
  return env === "PROD"
    ? "https://api.phonepe.com/apis/hermes"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";
}

router.post("/initiate", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency = "INR" } = req.body;
  const cfg = getPhonePeConfig();
  if (!cfg.merchantId || !cfg.saltKey) {
    res.status(503).json({ error: "PhonePe is not configured" });
    return;
  }

  const merchantTransactionId = `KUBER${userId}${Date.now()}`;
  const redirectUrl = `${process.env.APP_URL || "http://127.0.0.1:3000"}/wallet?phonepe=callback`;
  const payload = {
    merchantId: cfg.merchantId,
    merchantTransactionId,
    merchantUserId: String(userId),
    amount: Math.round(Number(amount) * 100),
    redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl: `${process.env.API_URL || `http://127.0.0.1:${process.env.PORT || 8080}`}/api/payments/phonepe/callback`,
    mobileNumber: req.body.mobile || "9999999999",
    paymentInstrument: { type: "PAY_PAGE" },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum = sha256(base64Payload + "/pg/v1/pay" + cfg.saltKey) + "###" + cfg.saltIndex;

  await db.insert(paymentOrdersTable).values({
    userId,
    provider: "phonepe",
    orderId: merchantTransactionId,
    amount: String(amount),
    currency,
    status: "created",
    metadata: payload,
  });

  res.json({
    url: `${phonePeBaseUrl(cfg.env)}/pg/v1/pay`,
    base64Payload,
    checksum,
    merchantTransactionId,
  });
});

router.post("/callback", async (req, res) => {
  const cfg = getPhonePeConfig();
  const response = req.body.response;
  if (!response) {
    res.status(400).json({ error: "Missing response" });
    return;
  }

  const xVerify = req.headers["x-verify"] as string | undefined;
  if (cfg.saltKey) {
    const expectedChecksum = sha256(response + cfg.saltKey) + "###" + cfg.saltIndex;
    if (!xVerify || xVerify !== expectedChecksum) {
      res.status(400).json({ error: "Invalid PhonePe callback signature" });
      return;
    }
  }

  const decoded = JSON.parse(Buffer.from(response, "base64").toString("utf8"));
  const merchantTransactionId = decoded?.data?.merchantTransactionId;
  const transactionId = decoded?.data?.transactionId;
  const success = decoded?.code === "PAYMENT_SUCCESS";

  if (!merchantTransactionId) {
    res.status(400).json({ error: "Invalid callback" });
    return;
  }

  const [order] = await db.select().from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.orderId, merchantTransactionId)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (success && order.status !== "paid") {
    const amount = Number(order.amount);
    const orderCurrency = (order.currency || "INR").toUpperCase() as "USD" | "EUR" | "INR" | "BTC" | "ETH" | "USDT" | "TRX" | "BNB";
    const [txn] = await db.insert(transactionsTable).values({
      userId: order.userId,
      type: "deposit",
      amount: String(amount),
      currency: orderCurrency,
      status: "pending",
      paymentMethod: "PhonePe",
      gatewayProvider: "phonepe",
      gatewayOrderId: merchantTransactionId,
      gatewayPaymentId: transactionId,
      notes: "PhonePe payment verified — pending admin approval",
    }).returning();

    await db.update(paymentOrdersTable).set({ status: "paid", paymentId: transactionId, transactionId: txn.id })
      .where(eq(paymentOrdersTable.id, order.id));

    await db.insert(notificationsTable).values({
      userId: order.userId,
      title: "Deposit Submitted",
      message: `${amount} via PhonePe is pending admin approval.`,
      type: "info",
      isRead: false,
    });
  } else if (!success) {
    await db.update(paymentOrdersTable).set({ status: "failed" })
      .where(eq(paymentOrdersTable.id, order.id));
  }

  res.json({ success });
});

router.get("/status/:merchantTransactionId", requireAuth, async (req, res) => {
  const cfg = getPhonePeConfig();
  const id = String(req.params.merchantTransactionId);
  const path = `/pg/v1/status/${cfg.merchantId}/${id}`;
  const checksum = sha256(path + cfg.saltKey) + "###" + cfg.saltIndex;

  const url = `${phonePeBaseUrl(cfg.env)}${path}`;
  const response = await fetch(url, {
    headers: { "X-VERIFY": checksum, "X-MERCHANT-ID": cfg.merchantId },
  });
  const data = await response.json();
  res.json(data);
});

export default router;
