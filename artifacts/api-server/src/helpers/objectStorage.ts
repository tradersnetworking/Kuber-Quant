import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { logger } from "../lib/logger";

let s3Client: S3Client | null = null;

export function isObjectStorageEnabled(): boolean {
  return !!(process.env.S3_BUCKET?.trim() && process.env.S3_ACCESS_KEY_ID?.trim() && process.env.S3_SECRET_ACCESS_KEY?.trim());
}

function getS3Client(): S3Client {
  if (!s3Client) {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    s3Client = new S3Client({
      region: process.env.S3_REGION?.trim() || "auto",
      endpoint: endpoint || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!.trim(),
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!.trim(),
      },
    });
  }
  return s3Client;
}

export function buildObjectKey(subdir: string, filename: string): string {
  const prefix = process.env.S3_KEY_PREFIX?.trim().replace(/^\/+|\/+$/g, "");
  const parts = [prefix, subdir, filename].filter(Boolean);
  return parts.join("/");
}

export function getObjectPublicUrl(subdir: string, filename: string): string | null {
  const base = process.env.S3_PUBLIC_BASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  return `${base}/${buildObjectKey(subdir, filename)}`;
}

function localFilePath(uploadRoot: string, subdir: string, filename: string): string {
  return path.join(uploadRoot, subdir, filename);
}

export async function putUploadObject(
  uploadRoot: string,
  subdir: string,
  filename: string,
  body: Buffer,
  contentType: string,
): Promise<void> {
  const localPath = localFilePath(uploadRoot, subdir, filename);
  fs.mkdirSync(path.dirname(localPath), { recursive: true });
  fs.writeFileSync(localPath, body);

  if (!isObjectStorageEnabled()) return;

  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET!.trim(),
        Key: buildObjectKey(subdir, filename),
        Body: body,
        ContentType: contentType,
      }),
    );
  } catch (err) {
    logger.error({ err, subdir, filename }, "S3 upload failed — file kept on local disk");
  }
}

export async function objectExists(
  uploadRoot: string,
  subdir: string,
  filename: string,
): Promise<boolean> {
  const localPath = localFilePath(uploadRoot, subdir, filename);
  if (fs.existsSync(localPath)) return true;

  if (!isObjectStorageEnabled()) return false;

  try {
    await getS3Client().send(
      new HeadObjectCommand({
        Bucket: process.env.S3_BUCKET!.trim(),
        Key: buildObjectKey(subdir, filename),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function readUploadObject(
  uploadRoot: string,
  subdir: string,
  filename: string,
): Promise<{ stream: Readable; contentType?: string } | { localPath: string } | null> {
  const localPath = localFilePath(uploadRoot, subdir, filename);
  if (fs.existsSync(localPath)) {
    return { localPath };
  }

  if (!isObjectStorageEnabled()) return null;

  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: process.env.S3_BUCKET!.trim(),
        Key: buildObjectKey(subdir, filename),
      }),
    );
    if (!response.Body) return null;
    return {
      stream: response.Body as Readable,
      contentType: response.ContentType,
    };
  } catch {
    return null;
  }
}

export async function deleteUploadObject(
  uploadRoot: string,
  subdir: string,
  filename: string,
): Promise<void> {
  const localPath = localFilePath(uploadRoot, subdir, filename);
  if (fs.existsSync(localPath)) fs.unlinkSync(localPath);

  if (!isObjectStorageEnabled()) return;

  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET!.trim(),
        Key: buildObjectKey(subdir, filename),
      }),
    );
  } catch (err) {
    logger.warn({ err, subdir, filename }, "S3 delete failed");
  }
}
