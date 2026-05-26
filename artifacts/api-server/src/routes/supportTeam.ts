import { Router } from "express";
import {
  db, usersTable, ticketsTable, ticketRepliesTable, transactionsTable, kycRecordsTable,
} from "@workspace/db";
import { eq, desc, or, ilike } from "drizzle-orm";
import { requireAuth, requireSupport } from "../middlewares/auth";
import { mapUser } from "./auth";
import { mapTicket } from "./tickets";
import { mapKyc } from "./kyc";

const router = Router();

const COMPLAINT_CATEGORIES = new Set(["Complaint", "complaint"]);
const QUERY_CATEGORIES = new Set(["Query", "General", "query", "general"]);

async function loadTickets(filters?: { status?: string; category?: string; priority?: string }) {
  const tickets = await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = new Map(users.map(u => [u.id, u]));

  let filtered = tickets;
  if (filters?.status && filters.status !== "all") {
    filtered = filtered.filter(t => t.status === filters.status);
  }
  if (filters?.priority && filters.priority !== "all") {
    filtered = filtered.filter(t => t.priority === filters.priority);
  }
  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    if (cat === "complaint" || cat === "complaints") {
      filtered = filtered.filter(t => COMPLAINT_CATEGORIES.has(t.category || "") || (t.category || "").toLowerCase() === "complaint");
    } else if (cat === "query" || cat === "queries") {
      filtered = filtered.filter(t => QUERY_CATEGORIES.has(t.category || "") || !t.category);
    } else {
      filtered = filtered.filter(t => (t.category || "").toLowerCase() === cat);
    }
  }

  const result = [];
  for (const t of filtered) {
    const u = userMap.get(t.userId);
    result.push(await mapTicket(t, u?.email, u?.fullName));
  }
  return result;
}

router.get("/stats", requireAuth, requireSupport, async (_req, res) => {
  const tickets = await db.select().from(ticketsTable);
  const open = tickets.filter(t => t.status === "open").length;
  const inProgress = tickets.filter(t => t.status === "in_progress").length;
  const resolved = tickets.filter(t => t.status === "resolved").length;
  const closed = tickets.filter(t => t.status === "closed").length;
  const urgent = tickets.filter(t => (t.priority === "urgent" || t.priority === "high") && t.status !== "closed" && t.status !== "resolved").length;
  const complaints = tickets.filter(t => COMPLAINT_CATEGORIES.has(t.category || "") || (t.category || "").toLowerCase() === "complaint").length;
  const queries = tickets.filter(t => QUERY_CATEGORIES.has(t.category || "") || !t.category).length;
  const pendingToday = tickets.filter(t => {
    const created = new Date(t.createdAt);
    const today = new Date();
    return created.toDateString() === today.toDateString() && (t.status === "open" || t.status === "in_progress");
  }).length;

  res.json({
    openTickets: open,
    inProgressTickets: inProgress,
    resolvedTickets: resolved,
    closedTickets: closed,
    totalTickets: tickets.length,
    urgentTickets: urgent,
    complaintTickets: complaints,
    queryTickets: queries,
    pendingToday,
  });
});

router.get("/tickets", requireAuth, requireSupport, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  const priority = typeof req.query.priority === "string" ? req.query.priority : undefined;
  res.json(await loadTickets({ status, category, priority }));
});

router.get("/tickets/:id", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/reply", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { message } = req.body;
  if (!message?.trim()) { res.status(400).json({ error: "message is required" }); return; }
  const [ticket] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const { userId } = (req as any).user;
  await db.insert(ticketRepliesTable).values({ ticketId: id, userId, message: message.trim(), isAdmin: true });
  if (ticket.status === "open") {
    await db.update(ticketsTable).set({ status: "in_progress" }).where(eq(ticketsTable.id, id));
  }
  const [updated] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, updated!.userId)).limit(1);
  res.json(await mapTicket(updated!, user?.email, user?.fullName));
});

router.patch("/tickets/:id/status", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const { status } = req.body;
  if (!["open", "in_progress", "resolved", "closed"].includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [ticket] = await db.update(ticketsTable).set({ status }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/close", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.update(ticketsTable).set({ status: "closed" }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.post("/tickets/:id/resolve", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [ticket] = await db.update(ticketsTable).set({ status: "resolved" }).where(eq(ticketsTable.id, id)).returning();
  if (!ticket) { res.status(404).json({ error: "Ticket not found" }); return; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ticket.userId)).limit(1);
  res.json(await mapTicket(ticket, user?.email, user?.fullName));
});

router.get("/users/lookup", requireAuth, requireSupport, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) { res.status(400).json({ error: "q query param required" }); return; }
  const users = await db.select().from(usersTable)
    .where(or(
      ilike(usersTable.email, `%${q}%`),
      ilike(usersTable.fullName, `%${q}%`),
    ))
    .limit(20);
  res.json(users.map(mapUser));
});

router.get("/users/:id/status", requireAuth, requireSupport, async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  const [kyc] = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, id)).limit(1);
  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.userId, id)).orderBy(desc(transactionsTable.createdAt)).limit(10);
  const userTickets = await db.select().from(ticketsTable).where(eq(ticketsTable.userId, id)).orderBy(desc(ticketsTable.createdAt)).limit(10);

  res.json({
    user: mapUser(user),
    kyc: kyc ? mapKyc(kyc, user.email, user.fullName) : null,
    recentTransactions: txns.map(t => ({
      id: t.id, type: t.type, amount: Number(t.amount), currency: t.currency,
      status: t.status, paymentMethod: t.paymentMethod, createdAt: t.createdAt.toISOString(),
    })),
    recentTickets: await Promise.all(userTickets.map(t => mapTicket(t, user.email, user.fullName))),
  });
});

export default router;
