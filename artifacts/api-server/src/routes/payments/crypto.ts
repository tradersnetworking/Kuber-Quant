import { Router } from "express";
import QRCode from "qrcode";
import { db, paymentGatewaysTable, transactionsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../../middlewares/auth";

const router = Router();

router.get("/addresses", requireAuth, async (_req, res) => {
  const gateways = await db.select().from(paymentGatewaysTable)
    .where(and(eq(paymentGatewaysTable.type, "crypto"), eq(paymentGatewaysTable.isEnabled, true)));
  res.json(gateways.map(g => ({
    id: g.id,
    name: g.name,
    symbol: g.symbol,
    network: g.network,
    walletAddress: g.walletAddress,
    minAmount: Number(g.minAmount),
    maxAmount: g.maxAmount ? Number(g.maxAmount) : null,
    qrCodeUrl: g.qrCodeUrl,
  })));
});

router.get("/qr/:address", requireAuth, async (req, res) => {
  const address = String(req.params.address);
  try {
    const qrDataUrl = await QRCode.toDataURL(address, { width: 256, margin: 2 });
    res.json({ qrDataUrl });
  } catch {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

router.post("/deposit", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { amount, currency, txHash, gatewayId } = req.body;
  if (!amount || !currency || !txHash) {
    res.status(400).json({ error: "amount, currency, and txHash are required" });
    return;
  }

  let gw: typeof paymentGatewaysTable.$inferSelect | undefined;
  if (gatewayId) {
    const [row] = await db.select().from(paymentGatewaysTable).where(eq(paymentGatewaysTable.id, Number(gatewayId))).limit(1);
    if (!row || !row.isEnabled) {
      res.status(400).json({ error: "Invalid crypto gateway" });
      return;
    }
    gw = row;
  }

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "deposit",
    amount: String(amount),
    currency,
    status: "pending",
    paymentMethod: `Crypto (${currency}${gw ? ` · ${gw.network || ""}` : ""})`.replace(/ · $/, ""),
    txHash: String(txHash).trim(),
    gatewayProvider: "crypto",
    gatewayOrderId: gatewayId ? String(gatewayId) : null,
    notes: gw
      ? `network:${gw.network || ""}|symbol:${gw.symbol || currency}|wallet:${gw.walletAddress || ""}|Crypto deposit — verify on blockchain before approval`
      : `symbol:${currency}|Crypto deposit — verify on blockchain before approval`,
  }).returning();

  await db.insert(notificationsTable).values({
    userId,
    title: "Crypto Deposit Submitted",
    message: `Your ${amount} ${currency} deposit is pending verification. TX: ${txHash.slice(0, 12)}...`,
    type: "info",
    isRead: false,
  });

  res.status(201).json({
    id: txn.id,
    status: txn.status,
    message: "Crypto deposit submitted for admin verification",
  });
});

export default router;
