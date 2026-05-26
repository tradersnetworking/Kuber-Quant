import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const supportMailTemplatesTable = pgTable("support_mail_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull().default("general"),
  subject: text("subject"),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSupportMailTemplateSchema = createInsertSchema(supportMailTemplatesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupportMailTemplate = z.infer<typeof insertSupportMailTemplateSchema>;
export type SupportMailTemplate = typeof supportMailTemplatesTable.$inferSelect;
