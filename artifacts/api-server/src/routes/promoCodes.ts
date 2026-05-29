import { Router } from "express";
import { db, promoCodesTable, promoUsagesTable, usersTable } from "@workspace/db";
import { eq, and, lte, gt } from "@workspace/db/orm";
import { requireAuth, requireAdmin, requirePermission } from "../middlewares/auth";
import { logAudit } from "../helpers/audit";

const router = Router();

// Admin: list all promo codes
router.get("/", requireAuth, requireAdmin, async (_req, res) => {
  const codes = await db.select().from(promoCodesTable).orderBy(promoCodesTable.createdAt);
  res.json(codes.map(c => ({ ...c, value: Number(c.value), minAmount: c.minAmount ? Number(c.minAmount) : null })));
});

// Admin: create promo code
router.post("/", requireAuth, requirePermission("manage_payments"), async (req, res) => {
  const { userId, role } = (req as any).user;
  const { code, description, type, value, appliesTo, maxUses, minAmount, expiresAt } = req.body;
  if (!code || !value) { res.status(400).json({ error: "code and value are required" }); return; }

  const existing = await db.select().from(promoCodesTable).where(eq(promoCodesTable.code, code.toUpperCase())).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Promo code already exists" }); return; }

  const [created] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase(),
    description, type: type || "percentage",
    value: String(value),
    appliesTo: appliesTo || "deposit",
    maxUses: maxUses || 100,
    minAmount: minAmount ? String(minAmount) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
  }).returning();

  await logAudit({ req, userId, role, action: "promo_code_created", entity: "promo_code", entityId: created.id, details: { code: created.code } });
  res.status(201).json({ ...created, value: Number(created.value) });
});

// Admin: toggle active/inactive
router.patch("/:id/toggle", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(promoCodesTable).where(eq(promoCodesTable.id, id)).limit(1);
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }
  const [updated] = await db.update(promoCodesTable).set({ isActive: !existing.isActive }).where(eq(promoCodesTable.id, id)).returning();
  res.json({ ...updated, value: Number(updated.value) });
});

// Admin: delete
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.delete(promoCodesTable).where(eq(promoCodesTable.id, id));
  res.json({ message: "Deleted" });
});

// User: validate/apply a promo code
router.post("/validate", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { code, amount, appliesTo } = req.body;
  if (!code) { res.status(400).json({ error: "code required" }); return; }

  const now = new Date();
  const [promo] = await db.select().from(promoCodesTable)
    .where(eq(promoCodesTable.code, code.toUpperCase()))
    .limit(1);

  if (!promo) { res.status(404).json({ error: "Invalid promo code" }); return; }
  if (!promo.isActive) { res.status(400).json({ error: "Promo code is inactive" }); return; }
  if (promo.expiresAt && promo.expiresAt < now) { res.status(400).json({ error: "Promo code has expired" }); return; }
  if (promo.usedCount >= promo.maxUses) { res.status(400).json({ error: "Promo code usage limit reached" }); return; }
  if (appliesTo && promo.appliesTo !== appliesTo) { res.status(400).json({ error: `Code is only valid for ${promo.appliesTo}` }); return; }
  if (promo.minAmount && amount && Number(amount) < Number(promo.minAmount)) {
    res.status(400).json({ error: `Minimum amount is $${promo.minAmount}` }); return;
  }

  // Check if user already used this code
  const alreadyUsed = await db.select().from(promoUsagesTable)
    .where(and(eq(promoUsagesTable.promoId, promo.id), eq(promoUsagesTable.userId, userId)))
    .limit(1);
  if (alreadyUsed.length > 0) { res.status(400).json({ error: "You have already used this promo code" }); return; }

  const inputAmount = Number(amount || 0);
  const discount = promo.type === "percentage"
    ? parseFloat((inputAmount * Number(promo.value) / 100).toFixed(2))
    : Number(promo.value);

  res.json({
    valid: true,
    code: promo.code,
    type: promo.type,
    value: Number(promo.value),
    discount,
    description: promo.description,
    appliesTo: promo.appliesTo,
  });
});

export default router;
