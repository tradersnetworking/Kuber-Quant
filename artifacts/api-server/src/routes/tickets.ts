import { Router } from "express";
import { db, ticketsTable, ticketRepliesTable, usersTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { queueTicketAutoAcknowledgment } from "../helpers/ticketAutoReplyService";
import { emitN8nEvent } from "../helpers/n8nWebhookService";
import { validateBody, getValidatedBody } from "../middlewares/validate";
import { CreateTicketBody } from "@workspace/api-zod";
import { TicketReplyBody } from "../lib/routeBodySchemas";
import { loadUserTickets } from "../helpers/ticketListService";

const router = Router();

async function mapTicket(t: any, userEmail?: string, userName?: string) {
  const replies = await db.select().from(ticketRepliesTable)
    .where(eq(ticketRepliesTable.ticketId, t.id))
    .orderBy(ticketRepliesTable.createdAt);
  return {
    id: t.id,
    userId: t.userId,
    userEmail: userEmail || null,
    userName: userName || null,
    subject: t.subject,
    message: t.message,
    status: t.status,
    priority: t.priority,
    category: t.category || null,
    replies: replies.map(r => ({
      id: r.id,
      message: r.message,
      isAdmin: r.isAdmin,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: t.createdAt.toISOString(),
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  res.json(await loadUserTickets(userId));
});

router.post("/", requireAuth, validateBody(CreateTicketBody), async (req, res) => {
  const { userId } = (req as any).user;
  const { subject, message, priority, category } = getValidatedBody<{
    subject: string;
    message: string;
    priority?: "low" | "medium" | "high" | "urgent";
    category?: string;
  }>(req);
  const [ticket] = await db.insert(ticketsTable).values({
    userId, subject, message,
    priority: priority || "medium",
    category: category || null,
  }).returning();

  const [user] = await db.select({
    email: usersTable.email,
    fullName: usersTable.fullName,
  }).from(usersTable).where(eq(usersTable.id, userId)).limit(1);

  if (user?.email) {
    queueTicketAutoAcknowledgment({
      ticket: ticket!,
      userEmail: user.email,
      userName: user.fullName || "",
    });
  }

  emitN8nEvent("ticket.created", {
    ticketId: ticket.id,
    userId,
    subject,
    priority: priority || "medium",
    category: category || null,
  });

  res.status(201).json(await mapTicket(ticket));
});

router.get("/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket || ticket.userId !== userId) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  res.json(await mapTicket(ticket));
});

router.post("/:id/reply", requireAuth, validateBody(TicketReplyBody), async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const { message } = getValidatedBody<{ message: string }>(req);
  const [ticket] = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket || ticket.userId !== userId) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message, isAdmin: false });
  res.json({ message: "Reply sent" });
});

export default router;
export { mapTicket };
