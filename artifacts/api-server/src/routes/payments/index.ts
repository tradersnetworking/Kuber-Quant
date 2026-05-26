import { Router } from "express";
import { db, paymentGatewaysTable } from "@workspace/db";
import { eq, asc, and } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";
import razorpayRouter from "./razorpay";
import phonepeRouter from "./phonepe";
import paypalRouter from "./paypal";
import payuRouter from "./payu";
import cryptoRouter from "./crypto";

const router = Router();

function mapGateway(g: any) {
  return {
    id: g.id,
    name: g.name,
    type: g.type,
    symbol: g.symbol || null,
    network: g.network || null,
    description: g.description || null,
    walletAddress: g.walletAddress || null,
    upiId: g.upiId || null,
    qrCodeUrl: g.qrCodeUrl || null,
    minAmount: Number(g.minAmount || 0),
    maxAmount: g.maxAmount ? Number(g.maxAmount) : null,
    isEnabled: g.isEnabled,
    sortOrder: g.sortOrder,
    extraConfig: g.extraConfig || {},
  };
}

router.get("/gateways", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.isEnabled, true))
    .orderBy(asc(paymentGatewaysTable.sortOrder));
  res.json(gateways.map(mapGateway));
});

router.get("/gateways/manual", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(and(
      eq(paymentGatewaysTable.isEnabled, true),
    ))
    .orderBy(asc(paymentGatewaysTable.sortOrder));
  const manual = gateways.filter(g => ["upi", "bank", "fiat"].includes(g.type));
  res.json(manual.map(mapGateway));
});

function enrichDepositGateway(g: any) {
  const base = mapGateway(g);
  const ec = (g.extraConfig || {}) as Record<string, string>;
  return {
    ...base,
    accountHolderName: ec.accountHolderName || null,
    bankName: ec.bankName || (g.type === "bank" ? g.name : null),
    accountNumber: ec.accountNumber || null,
    ifscCode: ec.ifscCode || null,
    branchName: ec.branchName || null,
    accountType: ec.accountType || null,
    swiftCode: ec.swiftCode || null,
    micrCode: ec.micrCode || ec.micr || null,
    badge: ec.badge || null,
    note: ec.note || null,
    logoUrl: ec.logoUrl || null,
  };
}

/** Grouped platform deposit accounts for wallet UI */
router.get("/deposit-accounts", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.isEnabled, true))
    .orderBy(asc(paymentGatewaysTable.sortOrder));

  const onlineTypes = ["razorpay", "phonepe", "paytm", "payu", "cashfree", "stripe", "instamojo", "pinelabs", "easebuzz", "paypal"];
  const upi = gateways.filter(g => g.type === "upi").map(enrichDepositGateway);
  const bank = gateways.filter(g => g.type === "bank" || g.type === "fiat").map(enrichDepositGateway);
  const crypto = gateways.filter(g => g.type === "crypto").map(enrichDepositGateway);
  const online = gateways.filter(g => onlineTypes.includes(g.type)).map(enrichDepositGateway);

  res.json({ upi, bank, crypto, online });
});

/** Which online gateways have server env credentials configured */
router.get("/online/status", requireAuth, async (_req, res) => {
  const configured = {
    razorpay: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    phonepe: !!(process.env.PHONEPE_MERCHANT_ID && process.env.PHONEPE_SALT_KEY),
    paytm: !!(process.env.PAYTM_MERCHANT_ID && process.env.PAYTM_MERCHANT_KEY),
    payu: !!(process.env.PAYU_MERCHANT_KEY && process.env.PAYU_MERCHANT_SALT),
    cashfree: !!(process.env.CASHFREE_APP_ID && process.env.CASHFREE_SECRET_KEY),
    stripe: !!(process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_SECRET_KEY),
    instamojo: !!(process.env.INSTAMOJO_API_KEY && process.env.INSTAMOJO_AUTH_TOKEN),
    pinelabs: !!(process.env.PINELABS_MERCHANT_ID && process.env.PINELABS_ACCESS_CODE),
    easebuzz: !!(process.env.EASEBUZZ_MERCHANT_KEY && process.env.EASEBUZZ_SALT),
    paypal: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
  };
  res.json(configured);
});

router.use("/razorpay", razorpayRouter);
router.use("/phonepe", phonepeRouter);
router.use("/paypal", paypalRouter);
router.use("/payu", payuRouter);
router.use("/crypto", cryptoRouter);

export default router;
