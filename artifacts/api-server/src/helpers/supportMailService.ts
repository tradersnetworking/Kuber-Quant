import {
  db, usersTable, ticketsTable, supportInboxTable, notificationsTable,
  type SupportInboxMessage,
} from "@workspace/db";
import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { getSupportInboxConfig } from "./supportInboxSettings";
import {
  computePriority, computeSlaDueAt, getSupportMailDeskConfig, type SupportMailDeskConfig,
} from "./supportMailDeskSettings";
import { resolveFromAddress } from "./emailCommunicationSettings";
import { sendMail } from "./mailer";

export type SupportMailCategory = "query" | "complaint" | "dispute" | "general" | "other";
export type SupportMailStatus = "unread" | "read" | "replied" | "archived";

const COMPLAINT_WORDS = ["complaint", "complain", "unhappy", "dissatisfied", "poor service", "refund"];
const DISPUTE_WORDS = ["dispute", "chargeback", "fraud", "unauthorized", "scam", "charge back"];
const QUERY_WORDS = ["question", "query", "help", "how to", "inquiry", "enquiry", "information"];

export function detectMailCategory(subject: string, body: string): SupportMailCategory {
  const text = `${subject} ${body}`.toLowerCase();
  if (DISPUTE_WORDS.some(w => text.includes(w))) return "dispute";
  if (COMPLAINT_WORDS.some(w => text.includes(w))) return "complaint";
  if (QUERY_WORDS.some(w => text.includes(w))) return "query";
  return "general";
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match?.[1] || raw).trim().toLowerCase();
}

function extractDisplayName(raw: string): string | null {
  const match = raw.match(/^([^<]+)</);
  const name = match?.[1]?.trim().replace(/^"|"$/g, "");
  return name || null;
}

type UserLite = { id: number; email: string; fullName: string | null; role: string };

async function loadUsersMap(ids: number[]) {
  if (!ids.length) return new Map<number, UserLite>();
  const users = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable).where(inArray(usersTable.id, ids));
  return new Map(users.map(u => [u.id, u]));
}

function slaStatus(row: SupportInboxMessage): "ok" | "due_soon" | "breached" | "met" {
  if (row.firstResponseAt) return "met";
  if (!row.slaDueAt) return "ok";
  const now = Date.now();
  const due = row.slaDueAt.getTime();
  if (now > due) return "breached";
  if (due - now < 2 * 60 * 60 * 1000) return "due_soon";
  return "ok";
}

export async function mapSupportMail(
  row: SupportInboxMessage,
  user?: UserLite | null,
  agents?: Map<number, UserLite>,
) {
  const agentMap = agents ?? await loadUsersMap(
    [row.assignedToUserId, row.handledByUserId].filter(Boolean) as number[],
  );
  const assigned = row.assignedToUserId ? agentMap.get(row.assignedToUserId) : null;
  const handled = row.handledByUserId ? agentMap.get(row.handledByUserId) : null;

  return {
    id: row.id,
    externalMessageId: row.externalMessageId,
    threadId: row.threadId || row.externalMessageId || String(row.id),
    direction: row.direction,
    fromEmail: row.fromEmail,
    fromName: row.fromName,
    toEmail: row.toEmail,
    subject: row.subject,
    bodyText: row.bodyText,
    bodyHtml: row.bodyHtml,
    category: row.category,
    status: row.status,
    priority: row.priority,
    ticketId: row.ticketId,
    userId: row.userId,
    userEmail: user?.email ?? null,
    userName: user?.fullName ?? null,
    assignedToUserId: row.assignedToUserId,
    assignedToName: assigned?.fullName ?? assigned?.email ?? null,
    handledByUserId: row.handledByUserId,
    handledByName: handled?.fullName ?? handled?.email ?? null,
    slaDueAt: row.slaDueAt?.toISOString() ?? null,
    firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
    slaStatus: slaStatus(row),
    receivedAt: row.receivedAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

async function matchUserByEmail(email: string) {
  const normalized = extractEmailAddress(email);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalized)).limit(1);
  return user ?? null;
}

async function notifySupportAgents(title: string, message: string) {
  const desk = await getSupportMailDeskConfig();
  if (!desk.notifyAgentsOnInbound) return;

  const agents = await db.select({ id: usersTable.id }).from(usersTable)
    .where(or(eq(usersTable.role, "support"), eq(usersTable.role, "superadmin")));
  for (const agent of agents) {
    await db.insert(notificationsTable).values({
      userId: agent.id,
      title,
      message,
      type: "warning",
    });
  }
}

async function autoCreateTicketForMail(
  mailId: number,
  mail: SupportInboxMessage,
  desk: SupportMailDeskConfig,
) {
  if (!desk.autoCreateTickets || mail.ticketId) return null;
  if (!desk.autoTicketCategories.includes(mail.category)) return null;

  let userId = mail.userId;
  if (!userId) {
    const user = await matchUserByEmail(mail.fromEmail);
    userId = user?.id ?? null;
  }
  if (!userId) return null;

  const categoryMap: Record<string, string> = {
    complaint: "Complaint",
    dispute: "Complaint",
    query: "Query",
    general: "General",
    other: "General",
  };

  const [ticket] = await db.insert(ticketsTable).values({
    userId,
    subject: mail.subject,
    message: mail.bodyText || mail.bodyHtml || "(No message body)",
    category: categoryMap[mail.category] || "General",
    priority: mail.priority === "urgent" ? "urgent" : mail.priority === "high" ? "high" : "medium",
  }).returning();

  await db.update(supportInboxTable)
    .set({ ticketId: ticket!.id, userId })
    .where(eq(supportInboxTable.id, mailId));

  return ticket!.id;
}

async function processNewInboundMessage(row: SupportInboxMessage) {
  const desk = await getSupportMailDeskConfig();
  await autoCreateTicketForMail(row.id, row, desk);
  await notifySupportAgents(
    `New support email: ${row.category}`,
    `${row.fromName || row.fromEmail} — ${row.subject}`,
  );
}

function buildInboundValues(parsed: {
  externalMessageId: string;
  threadId: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date;
  category: SupportMailCategory;
  userId: number | null;
}, desk: SupportMailDeskConfig) {
  const priority = computePriority(parsed.category);
  const slaDueAt = computeSlaDueAt(parsed.category, parsed.receivedAt, desk);
  return {
    externalMessageId: parsed.externalMessageId,
    threadId: parsed.threadId,
    direction: "inbound" as const,
    fromEmail: parsed.fromEmail,
    fromName: parsed.fromName,
    toEmail: parsed.toEmail,
    subject: parsed.subject,
    bodyText: parsed.bodyText,
    bodyHtml: parsed.bodyHtml,
    category: parsed.category,
    status: "unread" as const,
    priority,
    slaDueAt,
    userId: parsed.userId,
    receivedAt: parsed.receivedAt,
  };
}

export async function listSupportAgents() {
  const agents = await db.select({
    id: usersTable.id,
    email: usersTable.email,
    fullName: usersTable.fullName,
    role: usersTable.role,
  }).from(usersTable).where(or(eq(usersTable.role, "support"), eq(usersTable.role, "superadmin")));
  return agents;
}

export async function listSupportMail(filters?: {
  category?: string;
  status?: string;
  direction?: string;
  q?: string;
  limit?: number;
  assignedTo?: string;
  folder?: string;
  staffUserId?: number;
}) {
  const conditions = [];
  if (filters?.category && filters.category !== "all") {
    conditions.push(eq(supportInboxTable.category, filters.category));
  }
  if (filters?.status && filters.status !== "all") {
    conditions.push(eq(supportInboxTable.status, filters.status));
  }
  if (filters?.direction && filters.direction !== "all") {
    conditions.push(eq(supportInboxTable.direction, filters.direction));
  }
  if (filters?.folder === "unassigned") {
    conditions.push(isNull(supportInboxTable.assignedToUserId));
    conditions.push(eq(supportInboxTable.direction, "inbound"));
    conditions.push(or(eq(supportInboxTable.status, "unread"), eq(supportInboxTable.status, "read")));
  }
  if (filters?.folder === "unread") {
    conditions.push(eq(supportInboxTable.status, "unread"));
    conditions.push(eq(supportInboxTable.direction, "inbound"));
  }
  if (filters?.folder === "mine" && filters.staffUserId) {
    conditions.push(eq(supportInboxTable.assignedToUserId, filters.staffUserId));
  }
  if (filters?.folder === "archived") {
    conditions.push(eq(supportInboxTable.status, "archived"));
  }
  if (filters?.assignedTo === "unassigned") {
    conditions.push(isNull(supportInboxTable.assignedToUserId));
  } else if (filters?.assignedTo && filters.assignedTo !== "all") {
    conditions.push(eq(supportInboxTable.assignedToUserId, parseInt(filters.assignedTo, 10)));
  }
  if (filters?.q?.trim()) {
    const q = `%${filters.q.trim()}%`;
    conditions.push(or(
      ilike(supportInboxTable.subject, q),
      ilike(supportInboxTable.fromEmail, q),
      ilike(supportInboxTable.bodyText, q),
    ));
  }

  let query = db.select().from(supportInboxTable).orderBy(desc(supportInboxTable.receivedAt));
  if (conditions.length) {
    query = query.where(and(...conditions)) as typeof query;
  }

  let rows = await query;
  if (filters?.limit) rows = rows.slice(0, filters.limit);

  const userIds = [...new Set(rows.map(r => r.userId).filter(Boolean))] as number[];
  const agentIds = [...new Set(rows.flatMap(r => [r.userId, r.assignedToUserId, r.handledByUserId].filter(Boolean)))] as number[];
  const userMap = await loadUsersMap(userIds);
  const agentMap = await loadUsersMap(agentIds);

  return Promise.all(rows.map(r => mapSupportMail(r, r.userId ? userMap.get(r.userId) : null, agentMap)));
}

export async function listSupportMailThreads(filters?: {
  category?: string;
  status?: string;
  q?: string;
  folder?: string;
  staffUserId?: number;
  limit?: number;
}) {
  const messages = await listSupportMail({ ...filters, limit: filters?.limit ?? 200 });
  const threadMap = new Map<string, typeof messages>();

  for (const msg of messages) {
    const key = msg.threadId || String(msg.id);
    const list = threadMap.get(key) || [];
    list.push(msg);
    threadMap.set(key, list);
  }

  const threads = [...threadMap.entries()].map(([threadId, msgs]) => {
    const sorted = msgs.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
    const root = sorted.find(m => m.direction === "inbound") || sorted[0]!;
    const unread = sorted.some(m => m.status === "unread" && m.direction === "inbound");
    return {
      threadId,
      subject: root.subject.replace(/^Re:\s*/i, ""),
      fromEmail: root.fromEmail,
      fromName: root.fromName,
      category: root.category,
      status: unread ? "unread" : root.status,
      priority: root.priority,
      ticketId: root.ticketId,
      userId: root.userId,
      userName: root.userName,
      userEmail: root.userEmail,
      assignedToUserId: root.assignedToUserId,
      assignedToName: root.assignedToName,
      slaDueAt: root.slaDueAt,
      slaStatus: root.slaStatus,
      messageCount: sorted.length,
      lastMessageAt: sorted[0]!.receivedAt,
      preview: (root.bodyText || "").slice(0, 120),
      latestMessageId: sorted[0]!.id,
    };
  });

  return threads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
}

export async function getSupportMailThread(threadId: string) {
  const rows = await db.select().from(supportInboxTable)
    .where(or(eq(supportInboxTable.threadId, threadId), eq(supportInboxTable.externalMessageId, threadId)))
    .orderBy(supportInboxTable.receivedAt);

  const ids = [...new Set(rows.flatMap(r => [r.userId, r.assignedToUserId, r.handledByUserId].filter(Boolean)))] as number[];
  const agentMap = await loadUsersMap(ids);
  const userMap = await loadUsersMap(rows.map(r => r.userId).filter(Boolean) as number[]);

  return Promise.all(rows.map(r => mapSupportMail(r, r.userId ? userMap.get(r.userId) : null, agentMap)));
}

export async function getSupportMailStats(staffUserId?: number) {
  const rows = await db.select().from(supportInboxTable);
  const inbound = rows.filter(r => r.direction === "inbound");
  const now = Date.now();

  return {
    total: rows.length,
    threads: new Set(rows.map(r => r.threadId || r.externalMessageId || String(r.id))).size,
    unread: inbound.filter(r => r.status === "unread").length,
    unassigned: inbound.filter(r => !r.assignedToUserId && r.status !== "archived").length,
    myQueue: staffUserId
      ? inbound.filter(r => r.assignedToUserId === staffUserId && r.status !== "archived" && r.status !== "replied").length
      : 0,
    slaBreached: inbound.filter(r => !r.firstResponseAt && r.slaDueAt && r.slaDueAt.getTime() < now && r.status !== "archived").length,
    queries: inbound.filter(r => r.category === "query").length,
    complaints: inbound.filter(r => r.category === "complaint").length,
    disputes: inbound.filter(r => r.category === "dispute").length,
    replied: inbound.filter(r => r.status === "replied").length,
    archived: inbound.filter(r => r.status === "archived").length,
    today: inbound.filter(r => {
      const d = new Date(r.receivedAt);
      return d.toDateString() === new Date().toDateString();
    }).length,
  };
}

export async function getSupportMailById(id: number) {
  const [row] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, id)).limit(1);
  if (!row) return null;
  const user = row.userId ? (await loadUsersMap([row.userId])).get(row.userId) : null;
  return mapSupportMail(row, user);
}

export async function assignSupportMail(id: number, assignedToUserId: number | null, staffUserId: number) {
  const [updated] = await db.update(supportInboxTable)
    .set({ assignedToUserId, handledByUserId: staffUserId })
    .where(eq(supportInboxTable.id, id))
    .returning();
  if (!updated) return null;

  if (assignedToUserId) {
    await db.insert(notificationsTable).values({
      userId: assignedToUserId,
      title: "Support mail assigned to you",
      message: updated.subject,
      type: "info",
    });
  }

  return getSupportMailById(id);
}

export async function updateSupportMail(
  id: number,
  patch: {
    status?: SupportMailStatus;
    category?: SupportMailCategory;
    priority?: string;
    handledByUserId?: number;
    assignedToUserId?: number | null;
  },
) {
  const updates: Record<string, unknown> = { ...patch };
  if (patch.category) {
    const desk = await getSupportMailDeskConfig();
    const [row] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, id)).limit(1);
    if (row) {
      updates.priority = computePriority(patch.category);
      updates.slaDueAt = computeSlaDueAt(patch.category, row.receivedAt, desk);
    }
  }

  const [updated] = await db.update(supportInboxTable)
    .set(updates)
    .where(eq(supportInboxTable.id, id))
    .returning();
  if (!updated) return null;
  return getSupportMailById(id);
}

export async function markSupportMailRead(id: number, staffUserId: number) {
  const [row] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, id)).limit(1);
  if (!row) return null;
  if (row.status === "unread") {
    return updateSupportMail(id, { status: "read", handledByUserId: staffUserId });
  }
  return getSupportMailById(id);
}

async function storeOutboundMessage(opts: {
  to: string;
  subject: string;
  bodyText: string;
  staffUserId: number;
  threadId?: string | null;
  inReplyToId?: number;
  category?: string;
  priority?: string;
}) {
  const from = await resolveFromAddress("ticket_reply");
  const fromEmail = extractEmailAddress(from);
  const fromName = extractDisplayName(from) || "Kuber Quant Support";

  let threadId = opts.threadId || null;
  if (opts.inReplyToId) {
    const [parent] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, opts.inReplyToId)).limit(1);
    threadId = parent?.threadId || parent?.externalMessageId || String(parent?.id) || threadId;
  }

  const [inserted] = await db.insert(supportInboxTable).values({
    externalMessageId: `outbound-${Date.now()}-${opts.staffUserId}`,
    threadId,
    direction: "outbound",
    fromEmail,
    fromName,
    toEmail: extractEmailAddress(opts.to),
    subject: opts.subject,
    bodyText: opts.bodyText,
    category: opts.category || "general",
    priority: opts.priority || "medium",
    status: "replied",
    handledByUserId: opts.staffUserId,
    assignedToUserId: opts.staffUserId,
    receivedAt: new Date(),
  }).returning();

  return inserted!;
}

export async function sendSupportMail(opts: {
  to: string;
  subject: string;
  body: string;
  staffUserId: number;
  inReplyToId?: number;
}) {
  const from = await resolveFromAddress("ticket_reply");
  const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:40px">
  <div style="max-width:560px;margin:0 auto;background:#0a1628;border-radius:12px;padding:32px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 16px">Kuber Quant Support</h2>
    <div style="color:#e4e4e7;line-height:1.6;white-space:pre-wrap">${opts.body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
    <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:24px">This message was sent from the Kuber Quant support team.</p>
  </div>
</body></html>`;

  const sent = await sendMail({ to: opts.to, subject: opts.subject, html, text: opts.body, from });

  let parent: SupportInboxMessage | undefined;
  if (opts.inReplyToId) {
    [parent] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, opts.inReplyToId)).limit(1);
  }

  const outbound = await storeOutboundMessage({
    to: opts.to,
    subject: opts.subject,
    bodyText: opts.body,
    staffUserId: opts.staffUserId,
    inReplyToId: opts.inReplyToId,
    category: parent?.category,
    priority: parent?.priority,
  });

  if (opts.inReplyToId && parent) {
    await db.update(supportInboxTable)
      .set({
        status: "replied",
        handledByUserId: opts.staffUserId,
        firstResponseAt: parent.firstResponseAt || new Date(),
      })
      .where(or(
        eq(supportInboxTable.id, opts.inReplyToId),
        eq(supportInboxTable.threadId, parent.threadId || parent.externalMessageId || String(parent.id)),
      ));
  }

  return { sent, message: await mapSupportMail(outbound) };
}

export async function replyToSupportMail(id: number, body: string, staffUserId: number) {
  const [original] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, id)).limit(1);
  if (!original) return null;

  const to = original.direction === "inbound" ? original.fromEmail : original.toEmail;
  const subject = original.subject.startsWith("Re:") ? original.subject : `Re: ${original.subject}`;

  return sendSupportMail({ to, subject, body, staffUserId, inReplyToId: id });
}

export async function createTicketFromMail(id: number, staffUserId: number) {
  const [mail] = await db.select().from(supportInboxTable).where(eq(supportInboxTable.id, id)).limit(1);
  if (!mail) return { error: "Message not found" as const };

  let userId = mail.userId;
  if (!userId) {
    const user = await matchUserByEmail(mail.fromEmail);
    userId = user?.id ?? null;
  }
  if (!userId) {
    return { error: "No platform user found for this sender. Link the account or ask the client to register first." as const };
  }

  const categoryMap: Record<string, string> = {
    complaint: "Complaint", dispute: "Complaint", query: "Query", general: "General", other: "General",
  };

  const [ticket] = await db.insert(ticketsTable).values({
    userId,
    subject: mail.subject,
    message: mail.bodyText || mail.bodyHtml || "(No message body)",
    category: categoryMap[mail.category] || "General",
    priority: mail.priority === "urgent" ? "urgent" : mail.priority === "high" ? "high" : "medium",
  }).returning();

  await db.update(supportInboxTable)
    .set({ ticketId: ticket!.id, userId, status: "read", handledByUserId: staffUserId })
    .where(eq(supportInboxTable.id, id));

  return { ticketId: ticket!.id };
}

type ParsedInbound = {
  externalMessageId: string;
  threadId: string | null;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  subject: string;
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date;
  category: SupportMailCategory;
};

async function parseImapMessage(source: Buffer, envelope: any, internalDate?: Date | string): Promise<ParsedInbound | null> {
  try {
    const { simpleParser } = await import("mailparser");
    const parsed = await simpleParser(source);
    const fromField = parsed.from as { value?: Array<{ address?: string; name?: string }> } | Array<{ value?: Array<{ address?: string; name?: string }> }> | undefined;
    const fromRaw = Array.isArray(fromField) ? fromField[0]?.value?.[0] : fromField?.value?.[0];
    const fromEmail = (fromRaw?.address || envelope?.from?.[0]?.address || "").toLowerCase();
    if (!fromEmail) return null;

    const toField = parsed.to as { value?: Array<{ address?: string }> } | undefined;
    const toRaw = toField?.value?.[0]?.address || envelope?.to?.[0]?.address || (await getSupportInboxConfig()).inboxAddress;
    const subject = parsed.subject || "(No subject)";
    const bodyText = parsed.text || null;
    const bodyHtml = typeof parsed.html === "string" ? parsed.html : null;
    const messageId = parsed.messageId || envelope?.messageId || `imap-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return {
      externalMessageId: messageId,
      threadId: parsed.inReplyTo || parsed.references || messageId,
      fromEmail,
      fromName: fromRaw?.name || envelope?.from?.[0]?.name || null,
      toEmail: toRaw.toLowerCase(),
      subject,
      bodyText,
      bodyHtml,
      receivedAt: parsed.date || (internalDate ? new Date(internalDate) : undefined) || new Date(),
      category: detectMailCategory(subject, bodyText || bodyHtml || ""),
    };
  } catch {
    return null;
  }
}

export async function syncSupportInboxFromImap(): Promise<{ synced: number; skipped: number; message: string }> {
  const cfg = await getSupportInboxConfig();
  if (!cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) {
    return { synced: 0, skipped: 0, message: "Support inbox IMAP is not configured. Set it up under Super Admin → Email & Communication." };
  }

  const desk = await getSupportMailDeskConfig();
  let synced = 0;
  let skipped = 0;

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
      logger: false,
    });

    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const searchResult = await client.search({ since }, { uid: true });
      const uidList = searchResult === false ? [] : searchResult.slice(-100);

      for (const uid of uidList) {
        const msg = await client.fetchOne(String(uid), { source: true, envelope: true, internalDate: true }, { uid: true });
        if (!msg || !msg.source) { skipped++; continue; }

        const parsed = await parseImapMessage(msg.source, msg.envelope, msg.internalDate);
        if (!parsed) { skipped++; continue; }

        const existing = await db.select().from(supportInboxTable)
          .where(eq(supportInboxTable.externalMessageId, parsed.externalMessageId))
          .limit(1);
        if (existing.length) { skipped++; continue; }

        const user = await matchUserByEmail(parsed.fromEmail);
        const [inserted] = await db.insert(supportInboxTable).values(
          buildInboundValues({ ...parsed, userId: user?.id ?? null }, desk),
        ).returning();

        await processNewInboundMessage(inserted!);
        synced++;
      }
    } finally {
      lock.release();
    }
    await client.logout();

    return {
      synced,
      skipped,
      message: synced > 0 ? `Synced ${synced} new message(s)` : "Inbox is up to date — no new messages",
    };
  } catch (err: any) {
    return { synced, skipped, message: err?.message || "IMAP sync failed" };
  }
}

export async function testSupportInboxConnection(): Promise<{ ok: boolean; message: string }> {
  const cfg = await getSupportInboxConfig();
  if (!cfg.host || !cfg.user || !cfg.pass) {
    return { ok: false, message: "Support inbox IMAP is not configured." };
  }

  try {
    const { ImapFlow } = await import("imapflow");
    const client = new ImapFlow({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.pass },
      tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
      logger: false,
    });
    await client.connect();
    await client.logout();
    return { ok: true, message: "IMAP connection verified successfully" };
  } catch (err: any) {
    return { ok: false, message: err?.message || "IMAP connection failed" };
  }
}

export async function logInboundSupportMail(opts: {
  fromEmail: string;
  fromName?: string;
  subject: string;
  body: string;
  category?: SupportMailCategory;
}) {
  const cfg = await getSupportInboxConfig();
  const desk = await getSupportMailDeskConfig();
  const user = await matchUserByEmail(opts.fromEmail);
  const category = opts.category || detectMailCategory(opts.subject, opts.body);
  const receivedAt = new Date();

  const [row] = await db.insert(supportInboxTable).values({
    externalMessageId: `manual-${Date.now()}`,
    threadId: `manual-${Date.now()}`,
    direction: "inbound",
    fromEmail: extractEmailAddress(opts.fromEmail),
    fromName: opts.fromName || null,
    toEmail: cfg.inboxAddress,
    subject: opts.subject,
    bodyText: opts.body,
    category,
    status: "unread",
    priority: computePriority(category),
    slaDueAt: computeSlaDueAt(category, receivedAt, desk),
    userId: user?.id ?? null,
    receivedAt,
  }).returning();

  await processNewInboundMessage(row!);
  return mapSupportMail(row!, user);
}
