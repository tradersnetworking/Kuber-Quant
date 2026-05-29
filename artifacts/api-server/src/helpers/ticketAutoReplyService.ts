import {
  db, usersTable, ticketRepliesTable, type Ticket,
} from "@workspace/db";
import { inArray } from "@workspace/db/orm";
import { sendTransactionalEmail, buildTicketAcknowledgmentEmail, buildTicketReplyEmail } from "./mailer";
import { getSupportMailDeskConfig } from "./supportMailDeskSettings";
import { STAFF_ESCALATION_CATEGORY } from "./staffEscalationService";

export type TicketAutoReplyInput = {
  ticket: Ticket;
  userEmail: string;
  userName: string;
};

function normalizeCategory(category: string | null | undefined): string {
  const raw = (category || "General").trim();
  const lower = raw.toLowerCase();
  if (lower.includes("complaint") || lower === "dispute") return "complaint";
  if (lower.includes("query")) return "query";
  return "general";
}

function categoryLabel(category: string | null | undefined): string {
  const kind = normalizeCategory(category);
  if (kind === "complaint") return "complaint";
  if (kind === "query") return "query";
  return "support request";
}

function slaHoursForCategory(category: string | null | undefined, slaHours: Record<string, number>): number {
  const kind = normalizeCategory(category);
  return slaHours[kind] ?? slaHours.general ?? 48;
}

function defaultSubject(ticketId: number, category: string | null | undefined): string {
  const kind = normalizeCategory(category);
  if (kind === "complaint") return `We've received your complaint — Ticket #${ticketId}`;
  if (kind === "query") return `Your query has been received — Ticket #${ticketId}`;
  return `Support ticket received — #${ticketId}`;
}

function buildTemplateReply(input: TicketAutoReplyInput, slaHours: number): string {
  const { ticket, userName } = input;
  const kind = normalizeCategory(ticket.category);
  const greeting = userName?.trim() ? `Hi ${userName.trim()},` : "Hello,";
  const subjectRef = ticket.subject?.trim() ? `"${ticket.subject.trim()}"` : "your message";

  if (kind === "complaint") {
    return [
      greeting,
      "",
      `Thank you for contacting Kuber Quant support. We have received your complaint regarding ${subjectRef} and registered it as ticket #${ticket.id}.`,
      "",
      "We understand how important this is and our team is reviewing the details you shared. A support specialist will follow up with you directly.",
      "",
      `Our target response time for complaints is within ${slaHours} hours. If we need any additional information, we will reach out to you at this email address.`,
      "",
      "Thank you for your patience while we work to resolve this for you.",
      "",
      "Kuber Quant Support Team",
    ].join("\n");
  }

  if (kind === "query") {
    return [
      greeting,
      "",
      `Thank you for reaching out to Kuber Quant. We have received your query about ${subjectRef} and assigned it ticket #${ticket.id}.`,
      "",
      "Our support team is reviewing your question and will respond with the information you need.",
      "",
      `We aim to reply to queries within ${slaHours} hours during business days.`,
      "",
      "If your matter is urgent, please mention it in a reply to this ticket and we will prioritize accordingly.",
      "",
      "Kuber Quant Support Team",
    ].join("\n");
  }

  return [
    greeting,
    "",
    `Thank you for contacting Kuber Quant support. We have received ${subjectRef} and opened ticket #${ticket.id} for you.`,
    "",
    "A member of our team will review your message and get back to you shortly.",
    "",
    `Our typical response time is within ${slaHours} hours.`,
    "",
    "Kuber Quant Support Team",
  ].join("\n");
}

async function generateAiReplyText(input: TicketAutoReplyInput, slaHours: number): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const base = process.env.OPENAI_API_BASE?.trim() || "https://api.openai.com/v1";
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const kind = categoryLabel(input.ticket.category);

  const system = [
    "You are a professional customer support agent for Kuber Quant, a wealth management and trading platform.",
    "Write a warm, concise acknowledgment email body in plain text (no HTML, no markdown).",
    "Do not invent account balances, approvals, or resolutions — only acknowledge receipt and next steps.",
    "Keep the tone empathetic for complaints and helpful for queries.",
    "Include the ticket number, reference the user's subject briefly, and mention the SLA response window.",
    "Sign off as 'Kuber Quant Support Team'.",
    "Limit to 120-180 words.",
  ].join(" ");

  const prompt = [
    `Ticket #${input.ticket.id}`,
    `Category: ${kind}`,
    `Priority: ${input.ticket.priority}`,
    `Subject: ${input.ticket.subject}`,
    `User message: ${input.ticket.message.slice(0, 1200)}`,
    `User name: ${input.userName || "Customer"}`,
    `Target response within ${slaHours} hours.`,
  ].join("\n");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
        temperature: 0.65,
        max_tokens: 450,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

async function resolveSystemReplyUserId(): Promise<number | null> {
  const [staff] = await db.select({ id: usersTable.id }).from(usersTable)
    .where(inArray(usersTable.role, ["superadmin", "support"]))
    .limit(1);
  return staff?.id ?? null;
}

export async function generateTicketAutoReplyText(input: TicketAutoReplyInput): Promise<string> {
  const desk = await getSupportMailDeskConfig();
  const slaHours = slaHoursForCategory(input.ticket.category, desk.slaHours);

  if (desk.useAiForAutoReplies) {
    const aiText = await generateAiReplyText(input, slaHours);
    if (aiText) return aiText;
  }

  return buildTemplateReply(input, slaHours);
}

export async function sendTicketAutoAcknowledgment(input: TicketAutoReplyInput): Promise<{ sent: boolean; replyText: string }> {
  const desk = await getSupportMailDeskConfig();
  if (!desk.autoReplyOnTicketCreate) {
    return { sent: false, replyText: "" };
  }

  if (input.ticket.category === STAFF_ESCALATION_CATEGORY) {
    return { sent: false, replyText: "" };
  }

  const replyText = await generateTicketAutoReplyText(input);
  const subject = defaultSubject(input.ticket.id, input.ticket.category);

  if (desk.postAutoReplyInThread) {
    const systemUserId = await resolveSystemReplyUserId();
    if (systemUserId) {
      await db.insert(ticketRepliesTable).values({
        ticketId: input.ticket.id,
        userId: systemUserId,
        message: replyText,
        isAdmin: true,
      });
    }
  }

  const sent = await sendTransactionalEmail({
    to: input.userEmail,
    purpose: "ticket_acknowledgment",
    subject,
    html: buildTicketAcknowledgmentEmail({
      name: input.userName,
      ticketId: input.ticket.id,
      category: input.ticket.category,
      subject: input.ticket.subject,
      bodyText: replyText,
    }),
    text: replyText,
  });

  return { sent, replyText };
}

export async function sendTicketReplyNotification(opts: {
  ticketId: number;
  userEmail: string;
  userName: string;
  message: string;
}): Promise<boolean> {
  return sendTransactionalEmail({
    to: opts.userEmail,
    purpose: "ticket_reply",
    subject: `Support ticket #${opts.ticketId} — new reply`,
    html: buildTicketReplyEmail({
      name: opts.userName,
      ticketId: opts.ticketId,
      message: opts.message,
    }),
    text: opts.message,
  });
}

/** Fire-and-forget wrapper so ticket APIs stay responsive if SMTP/AI is slow. */
export function queueTicketAutoAcknowledgment(input: TicketAutoReplyInput): void {
  void sendTicketAutoAcknowledgment(input).catch(() => {});
}
