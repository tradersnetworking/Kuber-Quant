import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const mt5AccountStatusEnum = pgEnum("mt5_account_status", ["active", "inactive", "pending_review"]);
export const mtPlatformEnum = pgEnum("mt_platform", ["mt4", "mt5"]);

export const mt5AccountsTable = pgTable("mt5_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  platform: mtPlatformEnum("platform").notNull().default("mt5"),
  accountNumber: text("account_number").notNull(),
  broker: text("broker").notNull(),
  serverName: text("server_name"),
  passwordEnc: text("password_enc"),
  balance: numeric("balance", { precision: 18, scale: 2 }),
  equity: numeric("equity", { precision: 18, scale: 2 }),
  profit: numeric("profit", { precision: 18, scale: 2 }),
  status: mt5AccountStatusEnum("status").notNull().default("pending_review"),
  managerId: integer("manager_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMt5AccountSchema = createInsertSchema(mt5AccountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMt5Account = z.infer<typeof insertMt5AccountSchema>;
export type Mt5Account = typeof mt5AccountsTable.$inferSelect;
