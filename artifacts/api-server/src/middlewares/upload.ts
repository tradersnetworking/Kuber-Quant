import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import type { Request } from "express";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

const ALLOWED_MIMES: Record<string, string[]> = {
  payment_proofs: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  kyc_documents: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  profile_images: ["image/jpeg", "image/png", "image/webp"],
  qr_codes: ["image/jpeg", "image/png", "image/webp"],
  branding: ["image/jpeg", "image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
};

const MAX_SIZES: Record<string, number> = {
  payment_proofs: 5 * 1024 * 1024,
  kyc_documents: 10 * 1024 * 1024,
  profile_images: 2 * 1024 * 1024,
  qr_codes: 2 * 1024 * 1024,
  branding: 2 * 1024 * 1024,
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function createStorage(subdir: keyof typeof ALLOWED_MIMES) {
  const dest = path.join(UPLOAD_ROOT, subdir);
  ensureDir(dest);
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".bin";
      cb(null, `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`);
    },
  });
}

function fileFilter(subdir: keyof typeof ALLOWED_MIMES) {
  return (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ALLOWED_MIMES[subdir];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error(`Invalid file type. Allowed: ${allowed.join(", ")}`));
      return;
    }
    cb(null, true);
  };
}

export function createUploadMiddleware(subdir: keyof typeof ALLOWED_MIMES) {
  return multer({
    storage: createStorage(subdir),
    limits: { fileSize: MAX_SIZES[subdir] },
    fileFilter: fileFilter(subdir),
  });
}

export function getUploadUrl(subdir: string, filename: string): string {
  if (subdir === "kyc_documents" || subdir === "payment_proofs") {
    return `/api/uploads-secure/${subdir}/${filename}`;
  }
  return `/uploads/${subdir}/${filename}`;
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}

export { ensureDir, UPLOAD_ROOT };
