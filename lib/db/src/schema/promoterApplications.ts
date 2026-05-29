import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const promoterApplicationsTable = pgTable("promoter_applications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  reviewedBy: integer("reviewed_by"),
  reviewNotes: text("review_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PromoterApplication = typeof promoterApplicationsTable.$inferSelect;
