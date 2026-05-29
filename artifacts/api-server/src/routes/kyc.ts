import { Router } from "express";
import { db, kycRecordsTable, usersTable, kycDocumentsTable } from "@workspace/db";
import { eq, and, desc } from "@workspace/db/orm";
import { requireAuth } from "../middlewares/auth";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { sendTransactionalEmail, buildKycEmail } from "../helpers/mailer";
import { emitN8nEvent } from "../helpers/n8nWebhookService";
import { validateKycDocumentsAsync } from "../helpers/documentOcrService";
import { syncPassportPhotoUrl } from "../helpers/passportPhotoService";
import {
  KYC_DOC_TYPES,
  deleteKycDocumentFile,
  isValidKycDocType,
  labelForKycDocType,
  mapKycDocument,
} from "../helpers/kycDocumentService";

async function notifyKycSubmitted(userId: number) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) return;
  await sendTransactionalEmail({
    to: user.email,
    purpose: "kyc_submitted",
    subject: "KYC documents received",
    html: buildKycEmail({ name: user.fullName, status: "submitted" }),
  });
}

const router = Router();
const upload = createUploadMiddleware("kyc_documents");

function mapKyc(k: any, userEmail?: string, userName?: string) {
  return {
    id: k.id,
    userId: k.userId,
    userEmail: userEmail || null,
    userName: userName || null,
    fullName: k.fullName || null,
    address: k.address || null,
    country: k.country || null,
    idType: k.idType || null,
    idNumber: k.idNumber || null,
    panCard: k.panCard || null,
    aadhaarNumber: k.aadhaarNumber || null,
    bankAccountNumber: k.bankAccountNumber || null,
    bankName: k.bankName || null,
    ifscCode: k.ifscCode || null,
    idDocumentUrl: k.idDocumentUrl || null,
    panDocumentUrl: k.panDocumentUrl || null,
    aadhaarFrontUrl: k.aadhaarFrontUrl || null,
    aadhaarBackUrl: k.aadhaarBackUrl || null,
    passportDocumentUrl: k.passportDocumentUrl || null,
    passportPhotoUrl: k.passportPhotoUrl || null,
    addressProofUrl: k.addressProofUrl || null,
    selfieUrl: k.selfieUrl || null,
    signatureUrl: k.signatureUrl || null,
    cancelledChequeUrl: k.cancelledChequeUrl || null,
    status: k.status,
    rejectionReason: k.rejectionReason || null,
    verifiedAt: k.verifiedAt?.toISOString() || null,
    createdAt: k.createdAt.toISOString(),
    updatedAt: k.updatedAt?.toISOString() || null,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .limit(1);
  if (!kyc) {
    res.json({ id: null, userId, status: "pending", createdAt: new Date().toISOString(), updatedAt: null });
    return;
  }
  res.json(mapKyc(kyc));
});

router.post("/", requireAuth, upload.fields([
  { name: "idDocument", maxCount: 1 },
  { name: "addressProof", maxCount: 1 },
  { name: "selfie", maxCount: 1 },
  { name: "passportPhoto", maxCount: 1 },
]), async (req, res) => {
  const { userId } = (req as any).user;
  const {
    fullName, address, country, idType, idNumber,
    panCard, aadhaarNumber, bankAccountNumber, bankName, ifscCode,
  } = req.body;

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const idDocumentUrl = files?.idDocument?.[0] ? getUploadUrl("kyc_documents", files.idDocument[0].filename) : undefined;
  const addressProofUrl = files?.addressProof?.[0] ? getUploadUrl("kyc_documents", files.addressProof[0].filename) : undefined;
  const selfieUrl = files?.selfie?.[0] ? getUploadUrl("kyc_documents", files.selfie[0].filename) : undefined;

  const passportPhotoUrl = files?.passportPhoto?.[0] ? getUploadUrl("kyc_documents", files.passportPhoto[0].filename) : undefined;

  if (!fullName || !address || !country) {
    res.status(400).json({ error: "fullName, address, country are required" });
    return;
  }

  const existing = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId)).limit(1);

  const hasPassportPhoto = !!(passportPhotoUrl || existing[0]?.passportPhotoUrl);
  if (!hasPassportPhoto) {
    res.status(400).json({ error: "Passport size photo is required" });
    return;
  }

  const docFields = {
    idDocumentUrl: idDocumentUrl || existing[0]?.idDocumentUrl || null,
    addressProofUrl: addressProofUrl || existing[0]?.addressProofUrl || null,
    selfieUrl: selfieUrl || existing[0]?.selfieUrl || null,
    passportPhotoUrl: passportPhotoUrl || existing[0]?.passportPhotoUrl || null,
  };

  const runOcr = (kycId: number) => {
    void validateKycDocumentsAsync({
      userId,
      kycId,
      fullName,
      documents: [
        { type: "id_document", url: docFields.idDocumentUrl },
        { type: "address_proof", url: docFields.addressProofUrl },
        { type: "selfie", url: docFields.selfieUrl },
        { type: "passport_photo", url: docFields.passportPhotoUrl },
      ],
    });
  };

  if (existing.length > 0) {
    const [kyc] = await db.update(kycRecordsTable)
      .set({ fullName, address, country, idType: idType || null, idNumber: idNumber || null,
             panCard: panCard || null, aadhaarNumber: aadhaarNumber || null,
             bankAccountNumber: bankAccountNumber || null, bankName: bankName || null,
             ifscCode: ifscCode || null, status: "submitted", rejectionReason: null, ...docFields })
      .where(eq(kycRecordsTable.userId, userId))
      .returning();
    await db.update(usersTable).set({ kycStatus: "submitted" }).where(eq(usersTable.id, userId));
    await notifyKycSubmitted(userId);
    emitN8nEvent("kyc.submitted", { userId, kycId: kyc.id, fullName });
    runOcr(kyc.id);
    res.status(201).json(mapKyc(kyc));
    return;
  }

  const [kyc] = await db.insert(kycRecordsTable).values({
    userId, fullName, address, country,
    idType: idType || null, idNumber: idNumber || null,
    panCard: panCard || null, aadhaarNumber: aadhaarNumber || null,
    bankAccountNumber: bankAccountNumber || null, bankName: bankName || null,
    ifscCode: ifscCode || null, status: "submitted", ...docFields,
  }).returning();
  await db.update(usersTable).set({ kycStatus: "submitted" }).where(eq(usersTable.id, userId));
  await notifyKycSubmitted(userId);
  emitN8nEvent("kyc.submitted", { userId, kycId: kyc.id, fullName });
  runOcr(kyc.id);
  res.status(201).json(mapKyc(kyc));
});

router.post("/passport-photo", requireAuth, upload.single("passportPhoto"), async (req, res) => {
  const { userId } = (req as any).user;
  if (!req.file) {
    res.status(400).json({ error: "passportPhoto image file is required" });
    return;
  }
  const passportPhotoUrl = getUploadUrl("kyc_documents", req.file.filename);
  await syncPassportPhotoUrl(userId, passportPhotoUrl);
  const [kyc] = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId))
    .limit(1);
  if (!kyc) {
    res.status(500).json({ error: "Failed to save passport photo" });
    return;
  }
  res.json(mapKyc(kyc));
});

// ── Per-document KYC management ──────────────────────────────────────────────
// Each document has its own approval lifecycle. Approved documents are locked
// from edit/delete until a super admin approves an uploaded replacement.

router.get("/documents", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const docs = await db.select().from(kycDocumentsTable)
    .where(eq(kycDocumentsTable.userId, userId))
    .orderBy(desc(kycDocumentsTable.createdAt));
  res.json({ documents: docs.map(mapKycDocument), catalog: KYC_DOC_TYPES });
});

router.post("/documents", requireAuth, upload.single("file"), async (req, res) => {
  const { userId } = (req as any).user;
  const docType = String(req.body.docType || "");
  if (!isValidKycDocType(docType)) {
    res.status(400).json({ error: "Invalid or missing document type" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ error: "A document file is required" });
    return;
  }

  const fileUrl = getUploadUrl("kyc_documents", req.file.filename);
  const originalFilename = req.file.originalname || null;
  const mimeType = req.file.mimetype || null;

  const [record] = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, userId)).limit(1);
  const existing = await db.select().from(kycDocumentsTable)
    .where(and(eq(kycDocumentsTable.userId, userId), eq(kycDocumentsTable.docType, docType)));

  const pending = existing.find(d => d.status === "pending");
  if (pending) {
    // Replace the in-flight pending upload instead of creating duplicates.
    await deleteKycDocumentFile(pending.fileUrl);
    const [updated] = await db.update(kycDocumentsTable)
      .set({ fileUrl, originalFilename, mimeType, status: "pending", rejectionReason: null, reviewedBy: null, reviewedAt: null })
      .where(eq(kycDocumentsTable.id, pending.id))
      .returning();
    res.json(mapKycDocument(updated));
    return;
  }

  const approved = existing.find(d => d.status === "approved");
  const [created] = await db.insert(kycDocumentsTable).values({
    userId,
    kycRecordId: record?.id ?? null,
    docType,
    label: labelForKycDocType(docType),
    fileUrl,
    originalFilename,
    mimeType,
    status: "pending",
    supersedesId: approved ? approved.id : null,
  }).returning();
  emitN8nEvent("kyc.document.uploaded", { userId, documentId: created.id, docType });
  res.status(201).json(mapKycDocument(created));
});

router.patch("/documents/:id", requireAuth, upload.single("file"), async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id), 10);
  const [doc] = await db.select().from(kycDocumentsTable)
    .where(and(eq(kycDocumentsTable.id, id), eq(kycDocumentsTable.userId, userId))).limit(1);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (doc.status === "approved") {
    res.status(403).json({ error: "Approved documents are locked. Upload a replacement for super-admin approval.", code: "DOC_LOCKED" });
    return;
  }
  if (doc.status === "superseded") {
    res.status(400).json({ error: "This document has already been replaced." });
    return;
  }
  if (!req.file) { res.status(400).json({ error: "A document file is required" }); return; }

  await deleteKycDocumentFile(doc.fileUrl);
  const [updated] = await db.update(kycDocumentsTable)
    .set({
      fileUrl: getUploadUrl("kyc_documents", req.file.filename),
      originalFilename: req.file.originalname || null,
      mimeType: req.file.mimetype || null,
      status: "pending",
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
    })
    .where(eq(kycDocumentsTable.id, id))
    .returning();
  res.json(mapKycDocument(updated));
});

router.delete("/documents/:id", requireAuth, async (req, res) => {
  const { userId } = (req as any).user;
  const id = parseInt(String(req.params.id), 10);
  const [doc] = await db.select().from(kycDocumentsTable)
    .where(and(eq(kycDocumentsTable.id, id), eq(kycDocumentsTable.userId, userId))).limit(1);
  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }
  if (doc.status === "approved") {
    res.status(403).json({ error: "Approved documents can't be deleted until a super admin approves a replacement.", code: "DOC_LOCKED" });
    return;
  }
  await db.delete(kycDocumentsTable).where(eq(kycDocumentsTable.id, id));
  await deleteKycDocumentFile(doc.fileUrl);
  res.json({ ok: true });
});

export default router;
export { mapKyc };
