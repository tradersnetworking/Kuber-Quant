import { Router } from "express";
import { db, kycRecordsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { createUploadMiddleware, getUploadUrl } from "../middlewares/upload";
import { sendTransactionalEmail, buildKycEmail } from "../helpers/mailer";

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
    addressProofUrl: k.addressProofUrl || null,
    selfieUrl: k.selfieUrl || null,
    status: k.status,
    rejectionReason: k.rejectionReason || null,
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

  if (!fullName || !address || !country) {
    res.status(400).json({ error: "fullName, address, country are required" });
    return;
  }

  const existing = await db.select().from(kycRecordsTable)
    .where(eq(kycRecordsTable.userId, userId)).limit(1);

  const docFields = {
    idDocumentUrl: idDocumentUrl || existing[0]?.idDocumentUrl || null,
    addressProofUrl: addressProofUrl || existing[0]?.addressProofUrl || null,
    selfieUrl: selfieUrl || existing[0]?.selfieUrl || null,
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
  res.status(201).json(mapKyc(kyc));
});

export default router;
export { mapKyc };
