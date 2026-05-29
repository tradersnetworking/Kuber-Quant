import { db, kycDocumentsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { deleteUploadObject } from "./objectStorage";
import { getUploadRoot } from "../middlewares/upload";
import { logger } from "../lib/logger";

/** Canonical KYC document types the user can manage individually. */
export const KYC_DOC_TYPES: { key: string; label: string }[] = [
  { key: "passport_photo", label: "Passport Size Photo" },
  { key: "id_document", label: "ID Document" },
  { key: "pan", label: "PAN Document" },
  { key: "aadhaar_front", label: "Aadhaar Front" },
  { key: "aadhaar_back", label: "Aadhaar Back" },
  { key: "passport_document", label: "Passport Document" },
  { key: "drivers_license", label: "Driver's License" },
  { key: "address_proof", label: "Address Proof" },
  { key: "selfie", label: "Selfie Verification" },
  { key: "signature", label: "Signature" },
  { key: "cancelled_cheque", label: "Cancelled Cheque / Bank Proof" },
];

const DOC_TYPE_LABELS = new Map(KYC_DOC_TYPES.map(d => [d.key, d.label]));

export function isValidKycDocType(docType: string): boolean {
  return DOC_TYPE_LABELS.has(docType);
}

export function labelForKycDocType(docType: string): string {
  return DOC_TYPE_LABELS.get(docType) || docType.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

export type KycDocumentRow = typeof kycDocumentsTable.$inferSelect;

export function mapKycDocument(d: KycDocumentRow) {
  return {
    id: d.id,
    userId: d.userId,
    kycRecordId: d.kycRecordId,
    docType: d.docType,
    label: d.label,
    fileUrl: d.fileUrl,
    originalFilename: d.originalFilename,
    mimeType: d.mimeType,
    status: d.status,
    supersedesId: d.supersedesId,
    rejectionReason: d.rejectionReason,
    reviewedBy: d.reviewedBy,
    reviewedAt: d.reviewedAt?.toISOString() || null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt?.toISOString() || null,
    /** Approved docs are locked from edit/delete until a super admin approves a replacement. */
    locked: d.status === "approved",
  };
}

/** Best-effort physical file removal for a stored kyc_documents URL. */
export async function deleteKycDocumentFile(fileUrl: string | null | undefined): Promise<void> {
  if (!fileUrl) return;
  const clean = fileUrl.split("?")[0] || "";
  const filename = clean.slice(clean.lastIndexOf("/") + 1);
  if (!filename) return;
  try {
    await deleteUploadObject(getUploadRoot(), "kyc_documents", filename);
  } catch (err) {
    logger.warn({ err, fileUrl }, "Failed to delete KYC document file");
  }
}

/**
 * Approve a document. If it is a pending replacement of an approved doc,
 * mark the old approved doc superseded and remove its file.
 */
export async function approveKycDocumentRow(docId: number, reviewerId: number): Promise<KycDocumentRow | null> {
  const [doc] = await db.select().from(kycDocumentsTable).where(eq(kycDocumentsTable.id, docId)).limit(1);
  if (!doc) return null;

  if (doc.supersedesId) {
    const [old] = await db.select().from(kycDocumentsTable).where(eq(kycDocumentsTable.id, doc.supersedesId)).limit(1);
    if (old) {
      await db.update(kycDocumentsTable)
        .set({ status: "superseded", reviewedBy: reviewerId, reviewedAt: new Date() })
        .where(eq(kycDocumentsTable.id, old.id));
      await deleteKycDocumentFile(old.fileUrl);
    }
  }

  const [updated] = await db.update(kycDocumentsTable)
    .set({ status: "approved", reviewedBy: reviewerId, reviewedAt: new Date(), rejectionReason: null })
    .where(eq(kycDocumentsTable.id, docId))
    .returning();
  return updated || null;
}
