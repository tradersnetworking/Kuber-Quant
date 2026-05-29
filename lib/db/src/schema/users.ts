import { pgTable, text, serial, timestamp, numeric, pgEnum, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["user", "manager", "support", "admin", "superadmin"]);
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
  withdrawalsEnabled: boolean("withdrawals_enabled").notNull().default(true),
  withdrawalBlockMessage: text("withdrawal_block_message"),
  depositsEnabled: boolean("deposits_enabled").notNull().default(true),
  investmentsEnabled: boolean("investments_enabled").notNull().default(true),
  algoTradingEnabled: boolean("algo_trading_enabled").notNull().default(true),
  copyTradingEnabled: boolean("copy_trading_enabled").notNull().default(true),
  eaTradingEnabled: boolean("ea_trading_enabled").notNull().default(true),
  mt5Enabled: boolean("mt5_enabled").notNull().default(true),
  // 2FA fields
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorTempSecret: text("two_factor_temp_secret"),
  /** JSON array of bcrypt-hashed backup recovery codes. */
  twoFactorBackupCodes: text("two_factor_backup_codes"),
  /** Email login alerts on new device / IP. */
  loginAlertsEnabled: boolean("login_alerts_enabled").notNull().default(true),
  lastLoginIp: text("last_login_ip"),
  lastLoginDevice: text("last_login_device"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  /** Bumped on each new login (non–super-admin) to invalidate other devices. */
  sessionVersion: integer("session_version").notNull().default(1),
  /** Set on password change — used for withdrawal cooldown. */
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
