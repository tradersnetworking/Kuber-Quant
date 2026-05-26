import { Router } from "express";
import crypto from "crypto";
import { db, paymentOrdersTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

function getPayUConfig() {
  return {
    key: process.env.PAYU_MERCHANT_KEY || "",
    salt: process.env.PAYU_MERCHANT_SALT || "",
    env: process.env.PAYU_ENV || "test",
  };
}

function payUBaseUrl(env: string) {
  return env === "prod" ? "https://secure.payu.in" : "https://test.payu.in";
}

function generatePayUHash(params: Record<string, string>, salt: string): string {
  const sequence = [
    params.key, params.txnid, params.amount, params.productinfo,
    params.firstname, params.email,
    params.udf1 || "", params.udf2 || "", params.udf3 || "", params.udf4 || "", params.udf5 || "",
    "", "", "", "", "",
    salt,
  ].join("|");
  return crypto.createHash("sha512").update(sequence).digest("hex");
}

router.post("/initiate", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency = "INR", email, firstname, phone } = req.body;
  const cfg = getPayUConfig();
  if (!cfg.key || !cfg.salt) {
    res.status(503).json({ error: "PayU is not configured" });
    return;
  }

  const txnid = `KUBER${userId}${Date.now()}`;
  const productinfo = "Kuber Quant Wallet Deposit";
  const surl = `${process.env.APP_URL || "http://127.0.0.1:3000"}/wallet?payu=success`;
  const furl = `${process.env.APP_URL || "http://127.0.0.1:3000"}/wallet?payu=failed`;

  const params: Record<string, string> = {
    key: cfg.key,
    txnid,
    amount: String(Number(amount).toFixed(2)),
    productinfo,
    firstname: firstname || "User",
    email: email || `user${userId}@kuberquant.com`,
    phone: phone || "9999999999",
    surl,
    furl,
    udf1: String(userId),
    service_provider: "payu_paisa",
  };
  params.hash = generatePayUHash(params, cfg.salt);

  await db.insert(paymentOrdersTable).values({
    userId,
    provider: "payu",
    orderId: txnid,
    amount: String(amount),
    currency,
    status: "created",
    metadata: params,
  });

  res.json({
    action: `${payUBaseUrl(cfg.env)}/_payment`,
    params,
  });
});

router.post("/callback", async (req, res) => {
  const cfg = getPayUConfig();
  const body = req.body as Record<string, string>;
  const { status, txnid, mihpayid, amount, hash, udf1 } = body;

  const reverseHash = crypto.createHash("sha512").update([
    cfg.salt, status, "", "", "", "", "", udf1 || "", "", "", "", "", "",
    body.email, body.firstname, body.productinfo, amount, txnid, cfg.key,
  ].join("|")).digest("hex");

  if (hash !== reverseHash) {
    res.status(400).json({ error: "Invalid PayU hash" });
    return;
  }

  const [order] = await db.select().from(paymentOrdersTable)
    .where(eq(paymentOrdersTable.orderId, txnid)).limit(1);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  if (status === "success" && order.status !== "paid") {
    const depositAmount = Number(amount);
    const userId = order.userId;
    const [txn] = await db.insert(transactionsTable).values({
      userId,
      type: "deposit",
      amount: String(depositAmount),
      currency: "USD",
      status: "pending",
      paymentMethod: "PayU",
      gatewayProvider: "payu",
      gatewayOrderId: txnid,
      gatewayPaymentId: mihpayid,
      notes: "PayU payment verified — pending admin approval",
    }).returning();
    await db.update(paymentOrdersTable).set({ status: "paid", paymentId: mihpayid, transactionId: txn.id })
      .where(eq(paymentOrdersTable.id, order.id));

    await db.insert(notificationsTable).values({
      userId,
      title: "Deposit Submitted",
      message: `${depositAmount} via PayU is pending admin approval.`,
      type: "info",
      isRead: false,
    });
    res.redirect(`${process.env.APP_URL || ""}/wallet?deposit=success`);
    return;
  }

  await db.update(paymentOrdersTable).set({ status: "failed" }).where(eq(paymentOrdersTable.id, order.id));
  res.redirect(`${process.env.APP_URL || ""}/wallet?deposit=failed`);
});

export default router;
