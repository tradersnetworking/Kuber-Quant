import { pgTable, text, serial, timestamp, numeric, integer, boolean, pgEnum } from "drizzle-orm/pg-core";

export const exchangeSideEnum = pgEnum("exchange_side", ["buy", "sell"]);

export const exchangeOrderStatusEnum = pgEnum("exchange_order_status", [
  "awaiting_deposit",
  "deposit_submitted",
  "processing",
  "completed",
  "cancelled",
  "rejected",
]);

export const exchangeRatesTable = pgTable("exchange_rates", {
  id: serial("id").primaryKey(),
  symbol: text("symbol").notNull(),
  network: text("network").notNull().default(""),
  label: text("label").notNull(),
  buyPriceUsd: numeric("buy_price_usd", { precision: 18, scale: 8 }).notNull(),
  sellPriceUsd: numeric("sell_price_usd", { precision: 18, scale: 8 }).notNull(),
  /** INR per 1 unit — rate user pays when buying crypto (platform sells). */
  buyPriceInr: numeric("buy_price_inr", { precision: 18, scale: 4 }),
  /** INR per 1 unit — rate user receives when selling crypto (platform buys). */
  sellPriceInr: numeric("sell_price_inr", { precision: 18, scale: 4 }),
  minBuyUsd: numeric("min_buy_usd", { precision: 18, scale: 2 }).notNull().default("10"),
  minSellUsd: numeric("min_sell_usd", { precision: 18, scale: 2 }).notNull().default("10"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  /** Show this asset on the user Buy tab. */
  buyEnabled: boolean("buy_enabled").notNull().default(true),
  /** Show this asset on the user Sell tab. */
  sellEnabled: boolean("sell_enabled").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const exchangeOrdersTable = pgTable("exchange_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  side: exchangeSideEnum("side").notNull(),
  cryptoSymbol: text("crypto_symbol").notNull(),
  cryptoNetwork: text("crypto_network").notNull().default(""),
  cryptoAmount: numeric("crypto_amount", { precision: 18, scale: 8 }).notNull(),
  fiatAmount: numeric("fiat_amount", { precision: 18, scale: 2 }).notNull(),
  fiatCurrency: text("fiat_currency").notNull().default("INR"),
  rateUsd: numeric("rate_usd", { precision: 18, scale: 8 }).notNull(),
  status: exchangeOrderStatusEnum("status").notNull().default("awaiting_deposit"),
  depositTransactionId: integer("deposit_transaction_id"),
  payoutTransactionId: integer("payout_transaction_id"),
  paymentGatewayId: integer("payment_gateway_id"),
  paymentAccountId: integer("payment_account_id"),
  receiveWalletAddress: text("receive_wallet_address"),
  depositMethod: text("deposit_method"),
  proofUrl: text("proof_url"),
  txHash: text("tx_hash"),
  utrReference: text("utr_reference"),
  adminNotes: text("admin_notes"),
  reviewedByUserId: integer("reviewed_by_user_id"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ExchangeRate = typeof exchangeRatesTable.$inferSelect;
export type ExchangeOrder = typeof exchangeOrdersTable.$inferSelect;
