import { Router } from "express";
import { requireAuth, requireMailDesk, requireSuperAdmin } from "../middlewares/auth";
import { createUploadMiddleware } from "../middlewares/upload";
import {
  assignSupportMail,
  createTicketFromMail,
  getSupportMailById,
  getSupportMailStats,
  getSupportMailThread,
  listSupportAgents,
  listSupportMail,
  listSupportMailThreads,
  logInboundSupportMail,
  markSupportMailRead,
  replyToSupportMail,
  sendSupportMail,
  syncSupportInboxFromImap,
  updateSupportMail,
} from "../helpers/supportMailService";
import { stageMailAttachments } from "../helpers/supportMailAttachmentService";
import {
  deleteSupportMailTemplate,
  listSupportMailTemplates,
  saveSupportMailTemplate,
} from "../helpers/supportMailTemplatesService";
import { getSupportMailDeskConfig, saveSupportMailDeskConfig } from "../helpers/supportMailDeskSettings";

const router = Router();
const mailUpload = createUploadMiddleware("mail_attachments");

function parseAttachmentIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(v => parseInt(String(v), 10)).filter(n => Number.isFinite(n) && n > 0);
}

router.get("/stats", requireAuth, requireMailDesk, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await getSupportMailStats(userId));
});

router.get("/agents", requireAuth, requireMailDesk, async (_req, res) => {
  res.json(await listSupportAgents());
});

router.get("/templates", requireAuth, requireMailDesk, async (_req, res) => {
  res.json(await listSupportMailTemplates(true));
});

router.get("/threads", requireAuth, requireMailDesk, async (req, res) => {
  const { userId } = (req as any).user;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const folder = typeof req.query.folder === "string" ? req.query.folder : undefined;
  res.json(await listSupportMailThreads({ category, status, q, folder, staffUserId: userId }));
});

router.get("/threads/:threadId", requireAuth, requireMailDesk, async (req, res) => {
  res.json(await getSupportMailThread(String(req.params.threadId)));
});

router.get("/inbox", requireAuth, requireMailDesk, async (req, res) => {
  const { userId } = (req as any).user;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const direction = typeof req.query.direction === "string" ? req.query.direction : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const folder = typeof req.query.folder === "string" ? req.query.folder : undefined;
  const assignedTo = typeof req.query.assignedTo === "string" ? req.query.assignedTo : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  res.json(await listSupportMail({
    category, status, direction, q, limit, folder, assignedTo, staffUserId: userId,
  }));
});

router.get("/desk-config", requireAuth, requireSuperAdmin, async (_req, res) => {
  res.json(await getSupportMailDeskConfig());
});

router.post("/desk-config", requireAuth, requireSuperAdmin, async (req, res) => {
  res.json(await saveSupportMailDeskConfig(req.body || {}));
});

router.get("/templates/all", requireAuth, requireSuperAdmin, async (_req, res) => {
  res.json(await listSupportMailTemplates(false));
});

router.post("/templates", requireAuth, requireSuperAdmin, async (req, res) => {
  const { id, name, category, subject, body, isActive } = req.body;
  if (!name?.trim() || !body?.trim()) {
    res.status(400).json({ error: "name and body are required" });
    return;
  }
  const saved = await saveSupportMailTemplate({
    id, name: name.trim(), category: category || "general", subject, body: body.trim(), isActive,
  });
  res.json(saved);
});

router.delete("/templates/:id", requireAuth, requireSuperAdmin, async (req, res) => {
  await deleteSupportMailTemplate(parseInt(String(req.params.id), 10));
  res.json({ message: "Template deleted" });
});

router.post("/attachments", requireAuth, requireMailDesk, (req, res, next) => {
  mailUpload.array("files", 5)(req, res, (err) => {
    if (err) {
      res.status(400).json({ error: err.message || "Upload failed" });
      return;
    }
    next();
  });
}, async (req, res) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (!files.length) {
    res.status(400).json({ error: "At least one file is required" });
    return;
  }
  const { userId } = (req as any).user;
  res.json(await stageMailAttachments(files, userId));
});

router.post("/sync", requireAuth, requireMailDesk, async (_req, res) => {
  res.json(await syncSupportInboxFromImap());
});

router.post("/send", requireAuth, requireMailDesk, async (req, res) => {
  const { to, subject, body, attachmentIds } = req.body;
  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: "to, subject, and body are required" });
    return;
  }
  const { userId } = (req as any).user;
  try {
    res.json(await sendSupportMail({
      to: to.trim(),
      subject: subject.trim(),
      body: body.trim(),
      staffUserId: userId,
      attachmentIds: parseAttachmentIds(attachmentIds),
    }));
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to send email" });
  }
});

router.post("/log", requireAuth, requireMailDesk, async (req, res) => {
  const { fromEmail, fromName, subject, body, category } = req.body;
  if (!fromEmail?.trim() || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: "fromEmail, subject, and body are required" });
    return;
  }
  res.json(await logInboundSupportMail({
    fromEmail: fromEmail.trim(),
    fromName: fromName?.trim(),
    subject: subject.trim(),
    body: body.trim(),
    category,
  }));
});

router.post("/:id/reply", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { body, attachmentIds } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }
  const { userId } = (req as any).user;
  try {
    const result = await replyToSupportMail(id, body.trim(), userId, parseAttachmentIds(attachmentIds));
    if (!result) { res.status(404).json({ error: "Message not found" }); return; }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || "Failed to send reply" });
  }
});

router.post("/:id/read", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { userId } = (req as any).user;
  const message = await markSupportMailRead(id, userId);
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

router.post("/:id/assign", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { assignedToUserId } = req.body;
  const { userId } = (req as any).user;
  const agentId = assignedToUserId === null || assignedToUserId === undefined
    ? null
    : parseInt(String(assignedToUserId), 10);
  const message = await assignSupportMail(id, agentId, userId);
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

router.patch("/:id", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { status, category, priority, assignedToUserId } = req.body;
  const { userId } = (req as any).user;
  const message = await updateSupportMail(id, {
    status,
    category,
    priority,
    assignedToUserId: assignedToUserId === null ? null : assignedToUserId,
    handledByUserId: userId,
  });
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

router.post("/:id/create-ticket", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { userId } = (req as any).user;
  const result = await createTicketFromMail(id, userId);
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.json(result);
});

router.get("/:id", requireAuth, requireMailDesk, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const message = await getSupportMailById(id);
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

export default router;
