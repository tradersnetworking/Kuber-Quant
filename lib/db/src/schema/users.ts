import { pgTable, text, serial, timestamp, numeric, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "manager", "support", "superadmin"]);
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "submitted", "verified", "rejected"]);
export const promoterCommissionEnum = pgEnum("promoter_commission_type", ["cpa", "revenue_share", "hybrid", "multi_level"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default("user"),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
  balanceFiat: numeric("balance_fiat", { precision: 18, scale: 2 }).notNull().default("0"),
  balanceCrypto: numeric("balance_crypto", { precision: 18, scale: 8 }).notNull().default("0"),
  totalProfit: numeric("total_profit", { precision: 18, scale: 2 }).notNull().default("0"),
  avatarUrl: text("avatar_url"),
  referralCode: text("referral_code").unique(),
  referralCount: integer("referral_count").notNull().default(0),
  referralEarnings: numeric("referral_earnings", { precision: 18, scale: 2 }).notNull().default("0"),
  referredBy: integer("referred_by"),
  managerId: integer("manager_id"),
  isActive: boolean("is_active").notNull().default(true),
  isPromoter: boolean("is_promoter").notNull().default(false),
  promoterCommissionType: promoterCommissionEnum("promoter_commission_type"),
  promoterEnabledAt: timestamp("promoter_enabled_at", { withTimezone: true }),
  suspendReason: text("suspend_reason"),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorTempSecret: text("two_factor_temp_secret"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
