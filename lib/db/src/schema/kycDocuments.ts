import { pgTable, text, serial, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";

/**
 * Per-document KYC lifecycle. Each row is a single uploaded document with its own
 * approval state, so an approved document can be locked from edit/delete until a
 * super admin approves a replacement (which supersedes the old one).
 */
export const kycDocumentStatusEnum = pgEnum("kyc_document_status", [
  "pending",
  "approved",
  "rejected",
  "superseded",
]);

export const kycDocumentsTable = pgTable("kyc_documents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  kycRecordId: integer("kyc_record_id"),
  /** Canonical document type key (e.g. id_document, address_proof, selfie). */
  docType: text("doc_type").notNull(),
  /** Human label shown in the UI. */
  label: text("label").notNull(),
  fileUrl: text("file_url").notNull(),
  originalFilename: text("original_filename"),
  mimeType: text("mime_type"),
  status: kycDocumentStatusEnum("status").notNull().default("pending"),
  /** Pending replacement points at the approved doc it intends to replace. */
  supersedesId: integer("supersedes_id"),
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type KycDocument = typeof kycDocumentsTable.$inferSelect;
export type InsertKycDocument = typeof kycDocumentsTable.$inferInsert;
