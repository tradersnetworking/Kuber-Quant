import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const planCategoryEnum = pgEnum("plan_category", ["starter", "growth", "premium", "elite"]);
export const planTypeEnum = pgEnum("plan_type", ["weekly", "monthly", "quarterly", "half_yearly", "annual"]);
export const profitFrequencyEnum = pgEnum("profit_frequency", ["daily", "weekly", "monthly", "at_maturity"]);
export const capitalReturnEnum = pgEnum("capital_return", ["yes", "no", "partial"]);

export const investmentPlansTable = pgTable("investment_plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  minAmount: numeric("min_amount", { precision: 18, scale: 2 }).notNull(),
  maxAmount: numeric("max_amount", { precision: 18, scale: 2 }).notNull(),
  roiPercent: numeric("roi_percent", { precision: 6, scale: 2 }).notNull(),
  durationDays: integer("duration_days").notNull(),
  currency: text("currency").notNull().default("USD"),
  isActive: boolean("is_active").notNull().default(true),
  totalInvestors: integer("total_investors").notNull().default(0),
  category: planCategoryEnum("category").notNull().default("starter"),
  // New fields
  planType: planTypeEnum("plan_type").notNull().default("monthly"),
  profitFrequency: profitFrequencyEnum("profit_frequency").notNull().default("monthly"),
  capitalReturn: capitalReturnEnum("capital_return").notNull().default("yes"),
  autoRenewal: boolean("auto_renewal").notNull().default(false),
  earlyWithdrawalPenalty: numeric("early_withdrawal_penalty", { precision: 5, scale: 2 }).notNull().default("0"),
  features: text("features"), // JSON array of feature strings
  maxInvestors: integer("max_investors"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestmentPlanSchema = createInsertSchema(investmentPlansTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestmentPlan = z.infer<typeof insertInvestmentPlanSchema>;
export type InvestmentPlan = typeof investmentPlansTable.$inferSelect;
