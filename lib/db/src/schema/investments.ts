import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const investmentTypeEnum = pgEnum("investment_type", ["algo", "copy", "ea", "manual"]);
export const investmentCurrencyEnum = pgEnum("investment_currency", ["USD", "EUR", "BTC", "ETH", "USDT"]);
export const investmentStatusEnum = pgEnum("investment_status", ["active", "completed", "pending", "withdrawn"]);

export const investmentsTable = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: investmentTypeEnum("type").notNull(),
  planName: text("plan_name"),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: investmentCurrencyEnum("currency").notNull().default("USD"),
  profit: numeric("profit", { precision: 18, scale: 8 }).notNull().default("0"),
  profitPercent: numeric("profit_percent", { precision: 10, scale: 4 }).notNull().default("0"),
  status: investmentStatusEnum("status").notNull().default("pending"),
  maturityDate: timestamp("maturity_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInvestmentSchema = createInsertSchema(investmentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investmentsTable.$inferSelect;
