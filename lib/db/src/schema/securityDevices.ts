import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/** Trusted devices — skip 2FA for 30 days when valid. */
export const trustedDevicesTable = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  deviceLabel: text("device_label").notNull(),
  browser: text("browser"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Pending withdrawal awaiting email confirmation. */
export const withdrawalConfirmationsTable = pgTable("withdrawal_confirmations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  paymentAccountId: integer("payment_account_id").notNull(),
  amount: text("amount").notNull(),
  currency: text("currency").notNull(),
  paymentMethod: text("payment_method").notNull(),
  notes: text("notes"),
  clientIp: text("client_ip"),
  totpVerifiedAt: timestamp("totp_verified_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TrustedDevice = typeof trustedDevicesTable.$inferSelect;
export type WithdrawalConfirmation = typeof withdrawalConfirmationsTable.$inferSelect;
