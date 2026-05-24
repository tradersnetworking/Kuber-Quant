import { pgTable, text, serial, timestamp, integer, numeric, pgEnum } from "drizzle-orm/pg-core";

export const roiPayoutStatusEnum = pgEnum("roi_payout_status", ["pending", "processed", "failed", "skipped"]);

export const roiPayoutsTable = pgTable("roi_payouts", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").notNull(),
  userId: integer("user_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  roiPercent: numeric("roi_percent", { precision: 10, scale: 4 }).notNull(),
  status: roiPayoutStatusEnum("status").notNull().default("pending"),
  planName: text("plan_name"),
  note: text("note"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RoiPayout = typeof roiPayoutsTable.$inferSelect;
