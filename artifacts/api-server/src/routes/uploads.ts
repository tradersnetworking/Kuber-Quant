import { Router } from "express";
import path from "path";
import fs from "fs";
import { requireAuth } from "../middlewares/auth";
import { getUploadRoot } from "../middlewares/upload";
import { db, kycRecordsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const PROTECTED_FOLDERS = new Set(["kyc_documents", "payment_proofs"]);

router.get("/:folder/:filename", requireAuth, async (req, res) => {
  const folder = String(req.params.folder);
  const filename = String(req.params.filename);
  const user = (req as any).user;

  if (!PROTECTED_FOLDERS.has(folder)) {
    res.status(403).json({ error: "Use public upload path for this folder" });
    return;
  }

  const safeName = path.basename(filename);
  const filePath = path.join(getUploadRoot(), folder, safeName);
  if (!filePath.startsWith(path.join(getUploadRoot(), folder))) {
    res.status(400).json({ error: "Invalid path" });
    return;
  }
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const isStaff = ["admin", "superadmin", "manager", "support"].includes(user.role);
  if (!isStaff) {
    const urlFragment = `/uploads/${folder}/${safeName}`;
    const [kyc] = await db.select().from(kycRecordsTable).where(eq(kycRecordsTable.userId, user.userId)).limit(1);
    const owned = kyc && Object.values(kyc).some(v => typeof v === "string" && v.includes(safeName));
    if (!owned) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }

  res.sendFile(filePath);
});

export default router;
