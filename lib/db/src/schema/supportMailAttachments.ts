import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { supportInboxTable } from "./supportInbox";

export const supportMailAttachmentsTable = pgTable("support_mail_attachments", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => supportInboxTable.id, { onDelete: "cascade" }),
  uploadedByUserId: integer("uploaded_by_user_id").notNull(),
  filename: text("filename").notNull(),
  storedFilename: text("stored_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSupportMailAttachmentSchema = createInsertSchema(supportMailAttachmentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertSupportMailAttachment = z.infer<typeof insertSupportMailAttachmentSchema>;
export type SupportMailAttachment = typeof supportMailAttachmentsTable.$inferSelect;
