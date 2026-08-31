import { pgTable, text, serial, timestamp, numeric, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";

export const paymentProviderEnum = pgEnum("payment_provider", [
  "manual", "razorpay", "phonepe", "paypal", "payu", "crypto",
]);
export const paymentOrderStatusEnum = pgEnum("payment_order_status", [
  "created", "pending", "paid", "failed", "cancelled", "refunded",
]);

export const paymentOrdersTable = pgTable("payment_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  provider: paymentProviderEnum("provider").notNull(),
  orderId: text("order_id").notNull().unique(),
  paymentId: text("payment_id"),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: paymentOrderStatusEnum("status").notNull().default("created"),
  transactionId: integer("transaction_id"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type PaymentOrder = typeof paymentOrdersTable.$inferSelect;
