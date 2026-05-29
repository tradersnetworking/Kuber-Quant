import { Router } from "express";
import path from "path";
import { pipeline } from "stream/promises";
import { requireAuth } from "../middlewares/auth";
import { getUploadRoot } from "../middlewares/upload";
import { objectExists, readUploadObject } from "../helpers/objectStorage";
import { db, kycRecordsTable, transactionsTable } from "@workspace/db";
import { eq, and, like } from "@workspace/db/orm";

const router = Router();

const PROTECTED_FOLDERS = new Set(["kyc_documents", "payment_proofs", "mail_attachments"]);

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

router.get("/:folder/:filename", requireAuth, async (req, res) => {
  const folder = String(req.params.folder);
  const filename = String(req.params.filename);
  const user = (req as any).user;

  if (!PROTECTED_FOLDERS.has(folder)) {
    res.status(403).json({ error: "Use public upload path for this folder" });
    return;
  }

  const safeName = path.basename(filename);
  const uploadRoot = getUploadRoot();
  const filePath = path.join(uploadRoot, folder, safeName);
  if (!filePath.startsWith(path.join(uploadRoot, folder))) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }

  const exists = await objectExists(uploadRoot, folder, safeName);
  if (!exists) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const isStaff = ["superadmin", "admin", "manager", "support"].includes(user.role);
  if (!isStaff) {
    const urlFragment = `/uploads/${folder}/${safeName}`;
    const secureFragment = `/uploads-secure/${folder}/${safeName}`;
    const [kyc] = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, user.userId)).limit(1);
    const kycOwned = kyc && Object.values(kyc).some(v => typeof v === "string" && (v.includes(safeName) || v.includes(urlFragment) || v.includes(secureFragment)));

    let txnOwned = false;
    if (folder === "payment_proofs") {
      const [txn] = await db.select({ id: transactionsTable.id }).from(transactionsTable).where(and(
        eq(transactionsTable.userId, user.userId),
        like(transactionsTable.proofUrl, `%${safeName}%`),
      )).limit(1);
      txnOwned = !!txn;
    }

    if (!kycOwned && !txnOwned) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  const ext = path.extname(safeName).toLowerCase();
  const mime = MIME_BY_EXT[ext] || "application/octet-stream";
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);

  const file = await readUploadObject(uploadRoot, folder, safeName);
  if (!file) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  if ("localPath" in file) {
    res.sendFile(file.localPath);
    return;
  }
  if (file.contentType) {
    res.setHeader("Content-Type", file.contentType);
  }
  await pipeline(file.stream, res);
});

export default router;
