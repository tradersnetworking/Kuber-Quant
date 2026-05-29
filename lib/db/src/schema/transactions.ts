import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionTypeEnum = pgEnum("transaction_type", ["deposit", "withdrawal"]);
export const transactionCurrencyEnum = pgEnum("transaction_currency", ["USD", "EUR", "INR", "BTC", "ETH", "USDT", "TRX", "BNB"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "approved", "rejected"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: transactionCurrencyEnum("currency").notNull().default("USD"),
  status: transactionStatusEnum("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  txHash: text("tx_hash"),
  notes: text("notes"),
  proofUrl: text("proof_url"),
  utrReference: text("utr_reference"),
  gatewayProvider: text("gateway_provider"),
  gatewayOrderId: text("gateway_order_id"),
  gatewayPaymentId: text("gateway_payment_id"),
  paymentAccountId: integer("payment_account_id"),
  adminNotes: text("admin_notes"),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  /** First approver when dual approval is required (amount above threshold). */
  firstReviewedByUserId: integer("first_reviewed_by_user_id"),
  firstReviewedAt: timestamp("first_reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
