import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supportInboxTable = pgTable("support_inbox", {
  id: serial("id").primaryKey(),
  externalMessageId: text("external_message_id").unique(),
  threadId: text("thread_id"),
  direction: text("direction").notNull().default("inbound"),
  fromEmail: text("from_email").notNull(),
  fromName: text("from_name"),
  toEmail: text("to_email").notNull(),
  subject: text("subject").notNull(),
  bodyText: text("body_text"),
  bodyHtml: text("body_html"),
  category: text("category").notNull().default("general"),
  status: text("status").notNull().default("unread"),
  ticketId: integer("ticket_id"),
  userId: integer("user_id"),
  assignedToUserId: integer("assigned_to_user_id"),
  handledByUserId: integer("handled_by_user_id"),
  priority: text("priority").notNull().default("medium"),
  slaDueAt: timestamp("sla_due_at", { withTimezone: true }),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupportInboxSchema = createInsertSchema(supportInboxTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportInbox = z.infer<typeof insertSupportInboxSchema>;
export type SupportInboxMessage = typeof supportInboxTable.$inferSelect;
