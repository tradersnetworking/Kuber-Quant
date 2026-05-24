import { pgTable, text, serial, timestamp, integer, numeric, boolean, pgEnum } from "drizzle-orm/pg-core";

export const promoTypeEnum = pgEnum("promo_type", ["percentage", "fixed"]);
export const promoAppliesEnum = pgEnum("promo_applies", ["deposit", "investment", "ea_subscription"]);

export const promoCodesTable = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description"),
  type: promoTypeEnum("type").notNull().default("percentage"),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  appliesTo: promoAppliesEnum("applies_to").notNull().default("deposit"),
  maxUses: integer("max_uses").notNull().default(100),
  usedCount: integer("used_count").notNull().default(0),
  minAmount: numeric("min_amount", { precision: 18, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const promoUsagesTable = pgTable("promo_usages", {
  id: serial("id").primaryKey(),
  promoId: integer("promo_id").notNull(),
  userId: integer("user_id").notNull(),
  discountAmount: numeric("discount_amount", { precision: 18, scale: 2 }).notNull(),
  appliedTo: text("applied_to"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PromoCode = typeof promoCodesTable.$inferSelect;
