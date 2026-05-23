import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const copyTraderStatusEnum = pgEnum("copy_trader_status", ["active", "inactive"]);

export const copyTradersTable = pgTable("copy_traders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  roi: numeric("roi", { precision: 10, scale: 4 }).notNull().default("0"),
  monthlyRoi: numeric("monthly_roi", { precision: 10, scale: 4 }).notNull().default("0"),
  followers: integer("followers").notNull().default(0),
  winRate: numeric("win_rate", { precision: 10, scale: 4 }).notNull().default("0"),
  totalTrades: integer("total_trades").notNull().default(0),
  status: copyTraderStatusEnum("status").notNull().default("active"),
  minInvestment: numeric("min_investment", { precision: 18, scale: 2 }).notNull().default("100"),
  riskLevel: text("risk_level").notNull().default("medium"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCopyTraderSchema = createInsertSchema(copyTradersTable).omit({ id: true, createdAt: true });
export type InsertCopyTrader = z.infer<typeof insertCopyTraderSchema>;
export type CopyTrader = typeof copyTradersTable.$inferSelect;

export const copyFollowsTable = pgTable("copy_follows", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  traderId: integer("trader_id").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
