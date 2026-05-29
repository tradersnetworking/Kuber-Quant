import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { eaSubscriptionPlanEnum } from "./eaSubscriptions";

export const riskLevelEnum = pgEnum("risk_level", ["low", "medium", "high"]);
export const algoStatusEnum = pgEnum("algo_status", ["active", "paused"]);

export const algoStrategiesTable = pgTable("algo_strategies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  roi: numeric("roi", { precision: 10, scale: 4 }).notNull().default("0"),
  riskLevel: riskLevelEnum("risk_level").notNull().default("medium"),
  subscribers: integer("subscribers").notNull().default(0),
  status: algoStatusEnum("status").notNull().default("active"),
  minInvestment: numeric("min_investment", { precision: 18, scale: 2 }).notNull().default("100"),
  currency: text("currency").notNull().default("USD"),
  priceMonthly: numeric("price_monthly", { precision: 18, scale: 2 }).notNull().default("99"),
  priceQuarterly: numeric("price_quarterly", { precision: 18, scale: 2 }).notNull().default("249"),
  priceBiannual: numeric("price_biannual", { precision: 18, scale: 2 }).notNull().default("449"),
  priceAnnual: numeric("price_annual", { precision: 18, scale: 2 }).notNull().default("799"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAlgoStrategySchema = createInsertSchema(algoStrategiesTable).omit({ id: true, createdAt: true });
export type InsertAlgoStrategy = z.infer<typeof insertAlgoStrategySchema>;
export type AlgoStrategy = typeof algoStrategiesTable.$inferSelect;

export const algoSubscriptionsTable = pgTable("algo_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  strategyId: integer("strategy_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  plan: eaSubscriptionPlanEnum("plan").notNull().default("monthly"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
