import { Router } from "express";
import rateLimit from "express-rate-limit";
import { requireAuth, requireSuperAdmin } from "../middlewares/auth";
import { logAudit } from "../helpers/audit";
import {
  BACKUP_CATEGORIES,
  buildBackupExport,
  type BackupCategory,
  type BackupFormat,
} from "../helpers/backupExportService";

const router = Router();

const backupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many backup downloads. Please wait before trying again." },
});

router.use(requireAuth, requireSuperAdmin, backupLimiter);

router.get("/categories", (_req, res) => {
  res.json(BACKUP_CATEGORIES);
});

router.get("/export/:category", async (req, res) => {
  const category = String(req.params.category) as BackupCategory;
  const format = (String(req.query.format || "xlsx").toLowerCase()) as BackupFormat;
  const validCategories = BACKUP_CATEGORIES.map(c => c.id);
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: "Invalid backup category" });
    return;
  }
  if (!["csv", "json", "xlsx", "zip"].includes(format)) {
    res.status(400).json({ error: "Invalid format. Use csv, json, xlsx, or zip" });
    return;
  }

  const exportFormat = format;

  try {
    const { buffer, filename, contentType } = await buildBackupExport(category, exportFormat);
    const actor = (req as any).user;

    await logAudit({
      req,
      userId: actor.userId,
      role: actor.role,
      action: "backup_export",
      entity: "backup",
      details: { category, format: exportFormat, bytes: buffer.length, filename },
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.send(buffer);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Backup export failed" });
  }
});

export default router;
