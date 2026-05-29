import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { logger } from "../lib/logger";

const execFileAsync = promisify(execFile);

export type BackupResult = { ok: boolean; file?: string; message?: string };

/**
 * Runs pg_dump when BACKUP_DIR and DATABASE_URL are configured.
 * Requires pg_dump on PATH (installed on VPS / Docker postgres client).
 */
export async function runDatabaseBackup(): Promise<BackupResult> {
  const backupDir = process.env.BACKUP_DIR?.trim();
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!backupDir || !databaseUrl) {
    return { ok: false, message: "BACKUP_DIR or DATABASE_URL not configured" };
  }

  await mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(backupDir, `kuber-quant-${stamp}.sql.gz`);

  try {
    await execFileAsync("pg_dump", [databaseUrl, "--no-owner", "--no-acl"], {
      env: process.env,
      maxBuffer: 50 * 1024 * 1024,
    }).then(async ({ stdout }) => {
      const { gzip } = await import("node:zlib");
      const { promisify: p } = await import("node:util");
      const gzipAsync = p(gzip);
      const compressed = await gzipAsync(Buffer.from(stdout, "utf8"));
      const { writeFile } = await import("node:fs/promises");
      await writeFile(file, compressed);
    });

    const info = await stat(file);
    if (info.size < 100) {
      return { ok: false, message: "Backup file too small — pg_dump may have failed" };
    }

    logger.info({ file, bytes: info.size }, "Database backup written");
    return { ok: true, file };
  } catch (err) {
    logger.error({ err }, "pg_dump backup failed");
    return { ok: false, message: err instanceof Error ? err.message : "Backup failed" };
  }
}
