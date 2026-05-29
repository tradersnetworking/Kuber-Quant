import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

export const userPaymentAccountsTable = pgTable("user_payment_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  label: text("label").notNull(),
  accountType: text("account_type").notNull(),
  accountHolderName: text("account_holder_name"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  ifscCode: text("ifsc_code"),
  branchName: text("branch_name"),
  upiId: text("upi_id"),
  cryptoSymbol: text("crypto_symbol"),
  cryptoNetwork: text("crypto_network"),
  walletAddress: text("wallet_address"),
  upiQrUrl: text("upi_qr_url"),
  walletQrUrl: text("wallet_qr_url"),
  isDefault: boolean("is_default").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserPaymentAccount = typeof userPaymentAccountsTable.$inferSelect;
