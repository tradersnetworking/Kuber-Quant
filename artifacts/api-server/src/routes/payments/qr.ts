import { Router } from "express";
import { buildUpiPayUri, generateQrPngBuffer } from "../../helpers/qrCodeService";

const router = Router();

/** Public PNG QR for UPI payments (supports optional amount). */
router.get("/upi", async (req, res) => {
  const upiId = String(req.query.upiId || "").trim();
  const name = String(req.query.name || "Payee").trim();
  const amountRaw = req.query.amount;
  const amount = amountRaw != null && amountRaw !== "" ? Number(amountRaw) : undefined;

  if (!upiId) {
    res.status(400).json({ error: "upiId is required" });
    return;
  }

  try {
    const uri = buildUpiPayUri(upiId, name, Number.isFinite(amount) ? amount : undefined);
    const png = await generateQrPngBuffer(uri);
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=300");
    res.send(png);
  } catch {
    res.status(500).json({ error: "Failed to generate UPI QR code" });
  }
});

/** Public PNG QR for crypto wallet addresses. */
router.get("/wallet", async (req, res) => {
  const address = String(req.query.address || "").trim();
  if (!address) {
    res.status(400).json({ error: "address is required" });
    return;
  }

  try {
    const png = await generateQrPngBuffer(address);
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(png);
  } catch {
    res.status(500).json({ error: "Failed to generate wallet QR code" });
  }
});

export default router;
