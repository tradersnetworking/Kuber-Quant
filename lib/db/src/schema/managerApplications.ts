import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const managerApplicationsTable = pgTable("manager_applications", {
  id: serial("id").primaryKey(),
  applicantEmail: text("applicant_email").notNull(),
  fullName: text("full_name").notNull(),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by"),
  reviewNotes: text("review_notes"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ManagerApplication = typeof managerApplicationsTable.$inferSelect;
