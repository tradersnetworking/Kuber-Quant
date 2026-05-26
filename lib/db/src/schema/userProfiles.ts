import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const userProfilesTable = pgTable("user_profiles", {
  userId: integer("user_id").primaryKey(),
  username: text("username").unique(),
  dateOfBirth: text("date_of_birth"),
  gender: text("gender"),
  nationality: text("nationality"),
  country: text("country"),
  state: text("state"),
  city: text("city"),
  address: text("address"),
  postalCode: text("postal_code"),
  taxId: text("tax_id"),
  occupation: text("occupation"),
  annualIncomeRange: text("annual_income_range"),
  investmentExperience: text("investment_experience"),
  riskAppetite: text("risk_appetite"),
  preferredInvestmentType: text("preferred_investment_type"),
  sourceOfFunds: text("source_of_funds"),
  tradingInterests: jsonb("trading_interests").$type<string[]>().default([]),
  cryptoWallets: jsonb("crypto_wallets").$type<Record<string, string>>().default({}),
  bankingDetailsEnc: text("banking_details_enc"),
  securitySettings: jsonb("security_settings").$type<Record<string, unknown>>().default({}),
  agreementsAccepted: jsonb("agreements_accepted").$type<Record<string, boolean>>().default({}),
  investorId: text("investor_id").unique(),
  onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserProfile = typeof userProfilesTable.$inferSelect;
