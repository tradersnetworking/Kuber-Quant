import { Router } from "express";
import { db, paymentGatewaysTable } from "@workspace/db";
import { eq, asc, and } from "@workspace/db/orm";
import { requireAuth } from "../../middlewares/auth";
import razorpayRouter from "./razorpay";
import phonepeRouter from "./phonepe";
import paypalRouter from "./paypal";
import payuRouter from "./payu";
import cryptoRouter from "./crypto";
import qrRouter from "./qr";
import { ensurePaymentGatewayQrs } from "../../helpers/qrCodeService";
import { mapEnrichedDepositGateway } from "../../helpers/paymentCredentialsService";

const router = Router();

router.get("/gateways", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.isEnabled, true))
    .orderBy(asc(paymentGatewaysTable.sortOrder));
  await ensurePaymentGatewayQrs(gateways);
  res.json(gateways.map(mapEnrichedDepositGateway));
});

router.get("/gateways/manual", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(and(
      eq(paymentGatewaysTable.isEnabled, true),
    ))
    .orderBy(asc(paymentGatewaysTable.sortOrder));
  await ensurePaymentGatewayQrs(gateways);
  const manual = gateways.filter(g => ["upi", "digital_rupee", "bank", "fiat"].includes(g.type));
  res.json(manual.map(mapEnrichedDepositGateway));
});

/** Grouped platform deposit accounts for wallet UI */
router.get("/deposit-accounts", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(eq(paymentGatewaysTable.isEnabled, true))
    .orderBy(asc(paymentGatewaysTable.sortOrder));

  await ensurePaymentGatewayQrs(gateways);

  const onlineTypes = ["razorpay", "phonepe", "paytm", "payu", "cashfree", "stripe", "instamojo", "pinelabs", "easebuzz", "paypal"];
  const upi = gateways.filter(g => g.type === "upi").map(mapEnrichedDepositGateway);
  const digitalRupee = gateways.filter(g => g.type === "digital_rupee").map(mapEnrichedDepositGateway);
  const bank = gateways.filter(g => g.type === "bank" || g.type === "fiat").map(mapEnrichedDepositGateway);
  const crypto = gateways.filter(g => g.type === "crypto").map(mapEnrichedDepositGateway);
  const online = gateways.filter(g => onlineTypes.includes(g.type)).map(mapEnrichedDepositGateway);

  res.json({ upi, digitalRupee, bank, crypto, online });
});

/** Which deposit/withdrawal methods are enabled for users (admin-controlled) */
router.get("/method-visibility", requireAuth, async (_req, res) => {
  const { getPaymentMethodVisibility } = await import("../../helpers/paymentMethodVisibility");
  res.json(await getPaymentMethodVisibility());
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
router.use("/qr", qrRouter);
router.use("/crypto", cryptoRouter);

export default router;
