import { Router } from "express";
import { requireAuth, requireSupport, requireSuperAdmin } from "../middlewares/auth";
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
import {
  deleteSupportMailTemplate,
  listSupportMailTemplates,
  saveSupportMailTemplate,
} from "../helpers/supportMailTemplatesService";
import { getSupportMailDeskConfig, saveSupportMailDeskConfig } from "../helpers/supportMailDeskSettings";

const router = Router();

router.get("/stats", requireAuth, requireSupport, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await getSupportMailStats(userId));
});

router.get("/agents", requireAuth, requireSupport, async (_req, res) => {
  res.json(await listSupportAgents());
});

router.get("/templates", requireAuth, requireSupport, async (_req, res) => {
  res.json(await listSupportMailTemplates(true));
});

router.get("/threads", requireAuth, requireSupport, async (req, res) => {
  const { userId } = (req as any).user;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const folder = typeof req.query.folder === "string" ? req.query.folder : undefined;
  res.json(await listSupportMailThreads({ category, status, q, folder, staffUserId: userId }));
});

router.get("/threads/:threadId", requireAuth, requireSupport, async (req, res) => {
  res.json(await getSupportMailThread(String(req.params.threadId)));
});

router.get("/inbox", requireAuth, requireSupport, async (req, res) => {
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

router.post("/sync", requireAuth, requireSupport, async (_req, res) => {
  res.json(await syncSupportInboxFromImap());
});

router.post("/send", requireAuth, requireSupport, async (req, res) => {
  const { to, subject, body } = req.body;
  if (!to?.trim() || !subject?.trim() || !body?.trim()) {
    res.status(400).json({ error: "to, subject, and body are required" });
    return;
  }
  const { userId } = (req as any).user;
  res.json(await sendSupportMail({
    to: to.trim(),
    subject: subject.trim(),
    body: body.trim(),
    staffUserId: userId,
  }));
});

router.post("/log", requireAuth, requireSupport, async (req, res) => {
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

router.post("/:id/reply", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { body } = req.body;
  if (!body?.trim()) { res.status(400).json({ error: "body is required" }); return; }
  const { userId } = (req as any).user;
  const result = await replyToSupportMail(id, body.trim(), userId);
  if (!result) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(result);
});

router.post("/:id/read", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { userId } = (req as any).user;
  const message = await markSupportMailRead(id, userId);
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

router.post("/:id/assign", requireAuth, requireSupport, async (req, res) => {
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

router.patch("/:id", requireAuth, requireSupport, async (req, res) => {
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

router.post("/:id/create-ticket", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { userId } = (req as any).user;
  const result = await createTicketFromMail(id, userId);
  if ("error" in result) { res.status(400).json({ error: result.error }); return; }
  res.json(result);
});

router.get("/:id", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const message = await getSupportMailById(id);
  if (!message) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(message);
});

export default router;
