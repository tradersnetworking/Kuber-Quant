import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eaTypeEnum = pgEnum("ea_type", ["scalping", "swing", "trend", "grid", "arbitrage"]);
export const eaStatusEnum = pgEnum("ea_status", ["active", "inactive", "backtesting"]);

export const eaStrategiesTable = pgTable("ea_strategies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: eaTypeEnum("type").notNull(),
  backtestRoi: numeric("backtest_roi", { precision: 10, scale: 4 }),
  winRate: numeric("win_rate", { precision: 10, scale: 4 }),
  status: eaStatusEnum("status").notNull().default("inactive"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertEAStrategySchema = createInsertSchema(eaStrategiesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertEAStrategy = z.infer<typeof insertEAStrategySchema>;
export type EAStrategy = typeof eaStrategiesTable.$inferSelect;
