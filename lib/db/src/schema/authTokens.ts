import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

export const otpPurposeEnum = pgEnum("otp_purpose", ["password_reset", "email_verify", "login", "registration", "mobile_verify"]);

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailOtpsTable = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  userId: integer("user_id"),
  codeHash: text("code_hash").notNull(),
  purpose: otpPurposeEnum("purpose").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
