import { db, ticketsTable, ticketRepliesTable, usersTable } from "@workspace/db";
import { eq, desc, inArray, and, or, isNull, sql } from "@workspace/db/orm";
import type { Ticket, TicketReply } from "@workspace/db";

export type StaffTicketFilters = {
  status?: string;
  category?: string;
  priority?: string;
};

function buildStaffTicketWhere(filters?: StaffTicketFilters) {
  const conditions = [];

  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(ticketsTable.status, filters.status as Ticket["status"]));
  }
  if (filters?.priority && filters.priority !== "all") {
    conditions.push(eq(ticketsTable.priority, filters.priority as Ticket["priority"]));
  }
  if (filters?.category) {
    const cat = filters.category.toLowerCase();
    if (cat === "complaint" || cat === "complaints") {
      conditions.push(or(
        inArray(ticketsTable.category, ["Complaint", "complaint"]),
        sql`lower(trim(${ticketsTable.category})) = 'complaint'`,
      )!);
    } else if (cat === "query" || cat === "queries") {
      conditions.push(or(
        isNull(ticketsTable.category),
        eq(ticketsTable.category, ""),
        inArray(ticketsTable.category, ["Query", "General", "query", "general"]),
      )!);
    } else {
      conditions.push(sql`lower(${ticketsTable.category}) = ${cat}`);
    }
  }

  return conditions.length ? and(...conditions) : undefined;
}

function mapTicketRow(
  ticket: Ticket,
  userEmail?: string | null,
  userName?: string | null,
  replies: TicketReply[] = [],
) {
  return {
    id: ticket.id,
    userId: ticket.userId,
    userEmail: userEmail || null,
    userName: userName || null,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    priority: ticket.priority,
    category: ticket.category || null,
    replies: replies.map(r => ({
      id: r.id,
      message: r.message,
      isAdmin: r.isAdmin,
      createdAt: r.createdAt.toISOString(),
    })),
    createdAt: ticket.createdAt.toISOString(),
  };
}

export async function loadStaffTickets(filters?: StaffTicketFilters) {
  const where = buildStaffTicketWhere(filters);
  const tickets = where
    ? await db.select().from(ticketsTable).where(where).orderBy(desc(ticketsTable.createdAt))
    : await db.select().from(ticketsTable).orderBy(desc(ticketsTable.createdAt));

  if (!tickets.length) return [];

  const ticketIds = tickets.map(t => t.id);
  const userIds = [...new Set(tickets.map(t => t.userId))];

  const [replies, users] = await Promise.all([
    db.select().from(ticketRepliesTable)
      .where(inArray(ticketRepliesTable.ticketId, ticketIds))
      .orderBy(ticketRepliesTable.createdAt),
    db.select({
      id: usersTable.id,
      email: usersTable.email,
      fullName: usersTable.fullName,
    }).from(usersTable).where(inArray(usersTable.id, userIds)),
  ]);

  const repliesByTicket = new Map<number, TicketReply[]>();
  for (const reply of replies) {
    const list = repliesByTicket.get(reply.ticketId) ?? [];
    list.push(reply);
    repliesByTicket.set(reply.ticketId, list);
  }
  const userMap = new Map(users.map(u => [u.id, u]));

  return tickets.map(t => {
    const u = userMap.get(t.userId);
    return mapTicketRow(t, u?.email, u?.fullName, repliesByTicket.get(t.id) ?? []);
  });
}

export async function loadUserTickets(userId: number) {
  const tickets = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.userId, userId))
    .orderBy(desc(ticketsTable.createdAt));

  if (!tickets.length) return [];

  const ticketIds = tickets.map(t => t.id);
  const replies = await db
    .select()
    .from(ticketRepliesTable)
    .where(inArray(ticketRepliesTable.ticketId, ticketIds))
    .orderBy(ticketRepliesTable.createdAt);

  const repliesByTicket = new Map<number, TicketReply[]>();
  for (const reply of replies) {
    const list = repliesByTicket.get(reply.ticketId) ?? [];
    list.push(reply);
    repliesByTicket.set(reply.ticketId, list);
  }

  return tickets.map(t => mapTicketRow(t, null, null, repliesByTicket.get(t.id) ?? []));
}
