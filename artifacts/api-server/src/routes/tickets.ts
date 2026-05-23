import { Router } from "express";
import { db, ticketsTable, ticketRepliesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

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
  const tickets = await db.select().from(ticketsTable)
    .where(eq(ticketsTable.userId, userId))
    .orderBy(desc(ticketsTable.createdAt));
  const mapped = await Promise.all(tickets.map(t => mapTicket(t)));
  res.json(mapped);
});

router.post("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const { subject, message, priority, category } = req.body;
  if (!subject || !message) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  const [ticket] = await db.insert(ticketsTable).values({
    userId, subject, message,
    priority: priority || "medium",
    category: category || null,
  }).returning();
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

router.post("/:id/reply", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id));
  const { message } = req.body;
  if (!message) { res.status(400).json({ error: "message is required" }); return; }
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
