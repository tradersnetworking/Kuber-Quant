import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/** OCR / vision validation results for KYC and deposit proofs */
export const documentValidationsTable = pgTable("document_validations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  category: text("category").notNull(),
  referenceId: integer("reference_id"),
  documentType: text("document_type").notNull(),
  documentUrl: text("document_url").notNull(),
  passed: boolean("passed").notNull().default(false),
  riskScore: integer("risk_score").notNull().default(0),
  /** JSON array of flag strings */
  flags: text("flags").notNull().default("[]"),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DocumentValidation = typeof documentValidationsTable.$inferSelect;
