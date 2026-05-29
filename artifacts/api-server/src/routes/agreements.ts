import { Router } from "express";
import { db, agreementsTable, agreementEventsTable, agreementTemplatesTable, usersTable } from "@workspace/db";
import { eq, desc, and } from "@workspace/db/orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { generateAgreement, signAgreement, getAgreementPDF, previewTemplateContent } from "../helpers/agreementEngine";
import { DEFAULT_TEMPLATES, getDefaultTemplate, templateContentToMarkdown, AGREEMENT_PLACEHOLDERS } from "../helpers/agreementTemplates";

const router = Router();

function getIp(req: any): string {
  const fwd = req.headers["x-forwarded-for"];
  const ip = Array.isArray(fwd) ? fwd[0] : fwd?.split(",")[0]?.trim();
  return ip || req.socket?.remoteAddress || "unknown";
}

function toInt(val: string | string[]): number {
  return parseInt(Array.isArray(val) ? val[0] : val);
}

// ── User Routes ────────────────────────────────────────────────────────────────

// List my agreements
router.get("/my", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const list = await db.select({
    id: agreementsTable.id,
    agreementUid: agreementsTable.agreementUid,
    type: agreementsTable.type,
    status: agreementsTable.status,
    agreementDate: agreementsTable.agreementDate,
    signedAt: agreementsTable.signedAt,
    triggerEvent: agreementsTable.triggerEvent,
    createdAt: agreementsTable.createdAt,
  })
    .from(agreementsTable)
    .where(eq(agreementsTable.userId, userId))
    .orderBy(desc(agreementsTable.createdAt));
  res.json(list);
});

// Get single agreement detail
router.get("/my/:id", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const id = toInt(req.params.id);
  const [agreement] = await db.select().from(agreementsTable).where(
    and(eq(agreementsTable.id, id), eq(agreementsTable.userId, userId))
  ).limit(1);
  if (!agreement) { res.status(404).json({ error: "Not found" }); return; }

  // Log view
  await db.insert(agreementEventsTable).values({
    agreementId: id, event: "viewed", userId, ipAddress: getIp(req), metadata: null,
  }).catch(() => {});

  res.json(agreement);
});

// Generate an agreement (user-initiated)
router.post("/generate", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const { type, triggerEntityId, extraData } = req.body;
  if (!type) { res.status(400).json({ error: "type is required" }); return; }
  const result = await generateAgreement({
    userId, type,
    triggerEvent: "user_requested",
    triggerEntityId: triggerEntityId ? parseInt(triggerEntityId) : undefined,
    ipAddress: getIp(req),
    userAgent: req.headers["user-agent"] || "",
    extraData: extraData || {},
  });
  res.json(result);
});

// Sign an agreement
router.post("/my/:id/sign", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const id = toInt(req.params.id);
  const { signatureData, method } = req.body;
  const { pdfBuffer, pdfHash } = await signAgreement({
    agreementId: id, userId,
    signatureData, method: method || "draw",
    ipAddress: getIp(req),
    userAgent: req.headers["user-agent"] || "",
  });
  res.json({ success: true, pdfHash });
});

// Download agreement PDF
router.get("/my/:id/download", requireAuth, async (req, res) => {
  const userId = (req as any).user.userId;
  const id = toInt(req.params.id);
  const buffer = await getAgreementPDF(id, userId, false);
  const [agr] = await db.select({ uid: agreementsTable.agreementUid }).from(agreementsTable).where(eq(agreementsTable.id, id)).limit(1);
  const filename = `${agr?.uid || "agreement"}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});

// ── Admin Routes ───────────────────────────────────────────────────────────────

// List all agreements (admin)
router.get("/admin/all", requireAuth, requireAdmin, async (req, res) => {
  const limit = parseInt(String(req.query.limit || "50"));
  const userId = req.query.userId ? parseInt(String(req.query.userId)) : undefined;
  const list = await db.select({
    id: agreementsTable.id,
    agreementUid: agreementsTable.agreementUid,
    userId: agreementsTable.userId,
    type: agreementsTable.type,
    status: agreementsTable.status,
    agreementDate: agreementsTable.agreementDate,
    signedAt: agreementsTable.signedAt,
    triggerEvent: agreementsTable.triggerEvent,
    createdAt: agreementsTable.createdAt,
    userName: usersTable.fullName,
    userEmail: usersTable.email,
  })
    .from(agreementsTable)
    .leftJoin(usersTable, eq(agreementsTable.userId, usersTable.id))
    .where(userId ? eq(agreementsTable.userId, userId) : undefined)
    .orderBy(desc(agreementsTable.createdAt))
    .limit(limit);
  res.json(list);
});

// Get agreement detail (admin)
router.get("/admin/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  const [agreement] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, id)).limit(1);
  if (!agreement) { res.status(404).json({ error: "Not found" }); return; }
  res.json(agreement);
});

// Generate agreement for user (admin)
router.post("/admin/generate", requireAuth, requireAdmin, async (req, res) => {
  const adminId = (req as any).user.userId;
  const { userId, type, triggerEntityId, extraData } = req.body;
  if (!userId || !type) { res.status(400).json({ error: "userId and type are required" }); return; }
  const result = await generateAgreement({
    userId: parseInt(userId), type,
    triggerEvent: "admin_generated",
    triggerEntityId: triggerEntityId ? parseInt(triggerEntityId) : undefined,
    ipAddress: getIp(req),
    userAgent: req.headers["user-agent"] || "",
    extraData: extraData || {},
  });
  res.json(result);
});

// Download PDF (admin)
router.get("/admin/:id/download", requireAuth, requireAdmin, async (req, res) => {
  const requesterId = (req as any).user.userId;
  const id = toInt(req.params.id);
  const buffer = await getAgreementPDF(id, requesterId, true);
  const [agr] = await db.select({ uid: agreementsTable.agreementUid }).from(agreementsTable).where(eq(agreementsTable.id, id)).limit(1);
  const filename = `${agr?.uid || "agreement"}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(buffer);
});

// Revoke agreement (admin)
router.patch("/admin/:id/revoke", requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  await db.update(agreementsTable).set({ status: "revoked", updatedAt: new Date() }).where(eq(agreementsTable.id, id));
  res.json({ success: true });
});

// ── Templates ─────────────────────────────────────────────────────────────────

// List templates (returns built-in defaults + any custom ones)
router.get("/templates", requireAuth, async (_req, res) => {
  const dbTemplates = await db.select().from(agreementTemplatesTable).orderBy(desc(agreementTemplatesTable.createdAt)).catch(() => []);
  const defaults = DEFAULT_TEMPLATES.map(t => ({
    id: null, type: t.type, title: t.title, version: "built-in", isActive: true, isBuiltIn: true,
    sectionCount: t.sections.length,
  }));
  res.json({ defaults, custom: dbTemplates.map(t => ({ ...t, isBuiltIn: false })) });
});

router.get("/templates/placeholders", requireAuth, requireAdmin, async (_req, res) => {
  res.json(AGREEMENT_PLACEHOLDERS);
});

router.get("/templates/default/:type", requireAuth, requireAdmin, async (req, res) => {
  const type = String(req.params.type);
  const template = getDefaultTemplate(type);
  if (!template) { res.status(404).json({ error: "Built-in template not found for this type" }); return; }
  res.json({
    type: template.type,
    title: template.title,
    content: templateContentToMarkdown(template),
    isBuiltIn: true,
  });
});

router.get("/templates/custom/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  const [tpl] = await db.select().from(agreementTemplatesTable).where(eq(agreementTemplatesTable.id, id)).limit(1);
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(tpl);
});

router.post("/templates", requireAuth, requireAdmin, async (req, res) => {
  const adminId = (req as any).user.userId;
  const { type, title, version, content, isActive } = req.body;
  if (!type || !title?.trim() || !content?.trim()) {
    res.status(400).json({ error: "type, title, and content are required" });
    return;
  }
  const [tpl] = await db.insert(agreementTemplatesTable).values({
    type,
    title: title.trim(),
    version: version?.trim() || "1.0",
    content: content.trim(),
    isActive: isActive !== false,
    createdBy: adminId,
  }).returning();
  res.json(tpl);
});

router.patch("/templates/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  const { title, version, content, isActive, type } = req.body;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) patch.title = title;
  if (version !== undefined) patch.version = version;
  if (content !== undefined) patch.content = content;
  if (isActive !== undefined) patch.isActive = isActive;
  if (type !== undefined) patch.type = type;
  const [tpl] = await db.update(agreementTemplatesTable).set(patch).where(eq(agreementTemplatesTable.id, id)).returning();
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }
  res.json(tpl);
});

router.delete("/templates/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = toInt(req.params.id);
  const [tpl] = await db.delete(agreementTemplatesTable).where(eq(agreementTemplatesTable.id, id)).returning();
  if (!tpl) { res.status(404).json({ error: "Template not found" }); return; }
  res.json({ success: true });
});

// Preview filled template content without creating an agreement
router.post("/templates/preview-content", requireAuth, requireAdmin, async (req, res) => {
  const { type, userId, title, content, triggerEntityId, extraData } = req.body;
  if (!type || !userId || !title?.trim() || !content?.trim()) {
    res.status(400).json({ error: "type, userId, title, and content are required" });
    return;
  }
  try {
    const preview = await previewTemplateContent({
      userId: parseInt(String(userId)),
      type: String(type),
      title: String(title),
      content: String(content),
      triggerEntityId: triggerEntityId ? parseInt(String(triggerEntityId)) : undefined,
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || "",
      extraData: extraData || {},
    });
    res.json(preview);
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Preview failed" });
  }
});

router.post("/templates/preview", requireAuth, requireAdmin, async (req, res) => {
  const { type, userId, title, content } = req.body;
  if (!type || !userId) { res.status(400).json({ error: "type and userId required" }); return; }
  try {
    if (title && content) {
      const preview = await previewTemplateContent({
        userId: parseInt(String(userId)),
        type: String(type),
        title: String(title),
        content: String(content),
        ipAddress: getIp(req),
        userAgent: req.headers["user-agent"] || "",
      });
      res.json(preview);
      return;
    }
    const result = await generateAgreement({
      userId: parseInt(String(userId)),
      type: String(type),
      triggerEvent: "preview",
      ipAddress: getIp(req),
      userAgent: req.headers["user-agent"] || "",
    });
    const [agr] = await db.select().from(agreementsTable).where(eq(agreementsTable.id, result.id)).limit(1);
    await db.delete(agreementsTable).where(eq(agreementsTable.id, result.id)).catch(() => {});
    res.json({ agreementUid: result.agreementUid, filledData: agr?.filledData });
  } catch (e: any) {
    res.status(400).json({ error: e.message || "Preview failed" });
  }
});

export default router;
