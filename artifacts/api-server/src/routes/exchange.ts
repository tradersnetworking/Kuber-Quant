import { Router } from "express";
import { requireAuth } from "../middlewares/auth";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { WalletError } from "../helpers/walletService";
import {
  listPublicExchangeRates,
  calculateExchangeQuote,
  createExchangeOrder,
  submitExchangeDeposit,
  listUserExchangeOrders,
  getExchangeOrderWithContext,
} from "../helpers/exchangeService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import {
  ExchangeQuoteBody,
  CreateExchangeOrderBody,
  ExchangeDepositProofBody,
} from "../lib/routeBodySchemas";

const router = Router();
const proofUpload = createUploadMiddleware("payment_proofs");

router.get("/rates", requireAuth, async (req, res) => {
  const fiat = String(req.query.fiat || "INR").toUpperCase();
  res.json(await listPublicExchangeRates(fiat));
});

router.post("/quote", requireAuth, validateBody(ExchangeQuoteBody), async (req, res) => {
  try {
    const { side, symbol, network, fiatCurrency, fiatAmount, cryptoAmount } = getValidatedBody<{
      side: "buy" | "sell";
      symbol: string;
      network: string;
      fiatCurrency: string;
      fiatAmount?: number;
      cryptoAmount?: number;
    }>(req);
    res.json(await calculateExchangeQuote({
      side,
      symbol,
      network,
      fiatCurrency,
      fiatAmount,
      cryptoAmount,
    }));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.get("/orders", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await listUserExchangeOrders(userId));
});

router.get("/orders/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const order = await getExchangeOrderWithContext(id, userId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(order);
});

router.post("/orders", requireAuth, validateBody(CreateExchangeOrderBody), async (req, res) => {
  const { userId } = (req as any).user;
  try {
    const body = getValidatedBody<{
      side: "buy" | "sell";
      symbol: string;
      network: string;
      fiatCurrency: string;
      fiatAmount?: number;
      cryptoAmount?: number;
      paymentGatewayId?: number;
      paymentAccountId?: number;
      receiveWalletAddress?: string;
      depositMethod?: string;
    }>(req);
    const order = await createExchangeOrder(userId, body);
    const full = await getExchangeOrderWithContext(order.id, userId);
    res.status(201).json(full);
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

router.post("/orders/:id/deposit", requireAuth, proofUpload.single("proof"), validateBody(ExchangeDepositProofBody), async (req, res) => {
  const { userId } = (req as any).user;
  const id = Number(req.params.id);
  const { txHash, utrReference } = getValidatedBody<{ txHash?: string; utrReference?: string }>(req);
  const proofUrl = req.file ? getUploadUrl("payment_proofs", req.file.filename) : undefined;
  try {
    await submitExchangeDeposit(userId, id, {
      proofUrl,
      txHash,
      utrReference,
    });
    res.json(await getExchangeOrderWithContext(id, userId));
  } catch (err) {
    if (err instanceof WalletError) {
      res.status(400).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

export default router;
