import { pgTable, text, serial, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const onboardingDraftsTable = pgTable("onboarding_drafts", {
  id: serial("id").primaryKey(),
  draftToken: text("draft_token").notNull().unique(),
  email: text("email"),
  onboardingType: text("onboarding_type").notNull(),
  currentStep: integer("current_step").notNull().default(1),
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type OnboardingDraft = typeof onboardingDraftsTable.$inferSelect;
