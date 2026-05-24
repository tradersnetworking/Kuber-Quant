import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mt5RequestTypeEnum = pgEnum("mt5_request_type", ["copy_trading", "account_handling"]);
export const mt5RequestStatusEnum = pgEnum("mt5_request_status", ["pending", "forwarded", "accepted", "rejected", "completed"]);

export const mt5RequestsTable = pgTable("mt5_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  mt5AccountId: integer("mt5_account_id"),
  type: mt5RequestTypeEnum("type").notNull(),
  profitSharingPercent: integer("profit_sharing_percent").notNull().default(30),
  details: text("details"),
  status: mt5RequestStatusEnum("status").notNull().default("pending"),
  externalResponse: text("external_response"),
  forwardedAt: timestamp("forwarded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMt5RequestSchema = createInsertSchema(mt5RequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMt5Request = z.infer<typeof insertMt5RequestSchema>;
export type Mt5Request = typeof mt5RequestsTable.$inferSelect;
