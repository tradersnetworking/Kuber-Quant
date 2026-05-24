import { pgTable, serial, text, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const agreementTypeEnum = pgEnum("agreement_type", [
  "investment",
  "profit_sharing",
  "ea_subscription",
  "copy_trading",
  "account_handling",
  "risk_disclosure",
  "aml_kyc",
  "privacy_policy",
  "terms_conditions",
  "withdrawal_policy",
]);

export const agreementStatusEnum = pgEnum("agreement_status", [
  "pending_signature",
  "signed",
  "expired",
  "revoked",
]);

export const signatureMethodEnum = pgEnum("signature_method", [
  "draw",
  "otp",
  "checkbox",
]);

// ── Agreement Templates ────────────────────────────────────────────────────────
export const agreementTemplatesTable = pgTable("agreement_templates", {
  id: serial("id").primaryKey(),
  type: agreementTypeEnum("type").notNull(),
  title: text("title").notNull(),
  version: text("version").notNull().default("1.0"),
  content: text("content").notNull(), // Markdown with {{PLACEHOLDERS}}
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgreementTemplate = typeof agreementTemplatesTable.$inferSelect;

// ── Generated Agreements ───────────────────────────────────────────────────────
export const agreementsTable = pgTable("agreements", {
  id: serial("id").primaryKey(),
  agreementUid: text("agreement_uid").notNull().unique(), // KQ-AGR-2026-00001
  userId: integer("user_id").references(() => usersTable.id).notNull(),
  templateId: integer("template_id").references(() => agreementTemplatesTable.id),
  type: agreementTypeEnum("type").notNull(),
  status: agreementStatusEnum("status").notNull().default("pending_signature"),
  filledData: jsonb("filled_data"), // all placeholder values used
  pdfHash: text("pdf_hash"), // SHA-256 of PDF content
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  deviceInfo: text("device_info"),
  agreementDate: text("agreement_date"),
  signedAt: timestamp("signed_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  triggerEvent: text("trigger_event"), // e.g. "investment_created", "ea_subscription", "kyc_verified"
  triggerEntityId: integer("trigger_entity_id"), // id of the investment/subscription
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Agreement = typeof agreementsTable.$inferSelect;

// ── Signatures ─────────────────────────────────────────────────────────────────
export const agreementSignaturesTable = pgTable("agreement_signatures", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").references(() => agreementsTable.id).notNull(),
  signatureData: text("signature_data"), // base64 PNG of drawn signature
  method: signatureMethodEnum("method").notNull().default("draw"),
  signerName: text("signer_name"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  verificationHash: text("verification_hash"), // SHA-256 of (agreementUid + userId + timestamp)
  signedAt: timestamp("signed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgreementSignature = typeof agreementSignaturesTable.$inferSelect;

// ── Agreement Events / Audit ────────────────────────────────────────────────────
export const agreementEventsTable = pgTable("agreement_events", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").references(() => agreementsTable.id).notNull(),
  event: text("event").notNull(), // generated | viewed | signed | downloaded | revoked
  userId: integer("user_id").references(() => usersTable.id),
  ipAddress: text("ip_address"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AgreementEvent = typeof agreementEventsTable.$inferSelect;
