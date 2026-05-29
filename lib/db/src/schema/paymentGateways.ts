import { pgTable, text, serial, timestamp, numeric, integer, boolean, jsonb } from "drizzle-orm/pg-core";

export const paymentGatewaysTable = pgTable("payment_gateways", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  symbol: text("symbol"),
  network: text("network"),
  description: text("description"),
  walletAddress: text("wallet_address"),
  upiId: text("upi_id"),
  digitalRupeeId: text("digital_rupee_id"),
  qrCodeUrl: text("qr_code_url"),
  minAmount: numeric("min_amount", { precision: 18, scale: 2 }).default("10"),
  maxAmount: numeric("max_amount", { precision: 18, scale: 2 }),
  isEnabled: boolean("is_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  extraConfig: jsonb("extra_config").$type<Record<string, string>>().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PaymentGateway = typeof paymentGatewaysTable.$inferSelect;
