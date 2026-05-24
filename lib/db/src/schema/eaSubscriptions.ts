import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eaSubscriptionPlanEnum = pgEnum("ea_subscription_plan", ["monthly", "quarterly", "biannual", "annual"]);
export const eaSubscriptionStatusEnum = pgEnum("ea_subscription_status", ["active", "expired", "cancelled"]);

export const eaSubscriptionsTable = pgTable("ea_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  strategyId: integer("strategy_id").notNull(),
  mtAccountNumber: text("mt_account_number").notNull(),
  mtPlatform: text("mt_platform").notNull().default("mt5"),
  plan: eaSubscriptionPlanEnum("plan").notNull().default("monthly"),
  licenseKey: text("license_key").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  downloadCount: integer("download_count").notNull().default(0),
  status: eaSubscriptionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEASubscriptionSchema = createInsertSchema(eaSubscriptionsTable).omit({ id: true, createdAt: true });
export type InsertEASubscription = z.infer<typeof insertEASubscriptionSchema>;
export type EASubscription = typeof eaSubscriptionsTable.$inferSelect;
