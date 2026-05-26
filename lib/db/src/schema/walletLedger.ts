import { pgTable, text, serial, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";

export const ledgerTypeEnum = pgEnum("ledger_type", [
  "deposit", "withdrawal", "profit", "referral", "investment", "bonus", "adjustment", "transfer",
]);
export const ledgerWalletEnum = pgEnum("ledger_wallet", ["fiat", "crypto"]);

export const walletLedgerTable = pgTable("wallet_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: ledgerTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  walletType: ledgerWalletEnum("wallet_type").notNull(),
  balanceBefore: numeric("balance_before", { precision: 18, scale: 8 }).notNull(),
  balanceAfter: numeric("balance_after", { precision: 18, scale: 8 }).notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type WalletLedgerEntry = typeof walletLedgerTable.$inferSelect;
