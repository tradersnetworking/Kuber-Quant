import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import type { Request } from "express";
import {
  putUploadObject,
  getObjectPublicUrl,
} from "../helpers/objectStorage";
import { validateUploadMagicBytes } from "../helpers/fileMagicBytes";

const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.resolve(process.cwd(), "uploads");

const ALLOWED_MIMES: Record<string, string[]> = {
  payment_proofs: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  kyc_documents: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  mail_attachments: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
  profile_images: ["image/jpeg", "image/png", "image/webp"],
  qr_codes: ["image/jpeg", "image/png", "image/webp"],
  branding: ["image/jpeg", "image/png", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"],
};

const MAX_SIZES: Record<string, number> = {
  payment_proofs: 5 * 1024 * 1024,
  kyc_documents: 10 * 1024 * 1024,
  mail_attachments: 10 * 1024 * 1024,
  profile_images: 2 * 1024 * 1024,
  qr_codes: 2 * 1024 * 1024,
  branding: 2 * 1024 * 1024,
};

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const ALLOWED_EXTENSIONS: Record<string, Set<string>> = {
  payment_proofs: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  kyc_documents: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  mail_attachments: new Set([".jpg", ".jpeg", ".png", ".webp", ".pdf"]),
  profile_images: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  qr_codes: new Set([".jpg", ".jpeg", ".png", ".webp"]),
  branding: new Set([".jpg", ".jpeg", ".png", ".webp", ".ico"]),
};

function safeExtension(subdir: keyof typeof ALLOWED_MIMES, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const allowed = ALLOWED_EXTENSIONS[subdir];
  if (allowed.has(ext)) return ext;
  return ".bin";
}

function persistBuffer(subdir: keyof typeof ALLOWED_MIMES, filename: string, buffer: Buffer, mimetype: string): Promise<void> {
  if (!validateUploadMagicBytes(buffer, mimetype)) {
    return Promise.reject(new Error("File content does not match declared type"));
  }
  return putUploadObject(UPLOAD_ROOT, subdir, filename, buffer, mimetype);
}

function createHybridStorage(subdir: keyof typeof ALLOWED_MIMES): multer.StorageEngine {
  return {
    _handleFile(_req, file, cb) {
      const ext = safeExtension(subdir, file.originalname);
      const filename = `${Date.now()}-${randomBytes(8).toString("hex")}${ext}`;
      const chunks: Buffer[] = [];

      file.stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      file.stream.on("error", (err) => cb(err));
      file.stream.on("end", () => {
        void (async () => {
          try {
            const buffer = Buffer.concat(chunks);
            await persistBuffer(subdir, filename, buffer, file.mimetype);
            cb(null, { filename, size: buffer.length });
          } catch (err) {
            cb(err as Error);
          }
        })();
      });
    },
    _removeFile(_req, file, cb) {
      if (!file.filename) {
        cb(null);
        return;
      }
      const localPath = path.join(UPLOAD_ROOT, subdir, file.filename);
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
      cb(null);
    },
  };
}

function createStorage(subdir: keyof typeof ALLOWED_MIMES) {
  return createHybridStorage(subdir);
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
  const publicUrl = getObjectPublicUrl(subdir, filename);
  const isProtected = subdir === "kyc_documents" || subdir === "payment_proofs" || subdir === "mail_attachments";

  if (publicUrl && !isProtected) {
    return publicUrl;
  }
  if (isProtected) {
    return `/api/uploads-secure/${subdir}/${filename}`;
  }
  return `/uploads/${subdir}/${filename}`;
}

export function getUploadRoot(): string {
  return UPLOAD_ROOT;
}

export { ensureDir, UPLOAD_ROOT };
