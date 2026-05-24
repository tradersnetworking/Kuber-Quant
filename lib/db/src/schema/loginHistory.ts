import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const loginHistoryTable = pgTable("login_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  country: text("country"),
  device: text("device"),
  browser: text("browser"),
  success: boolean("success").notNull().default(true),
  failReason: text("fail_reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LoginHistory = typeof loginHistoryTable.$inferSelect;
