import { db } from "@workspace/db";
import { sql } from "@workspace/db/orm";

let cached: { ok: boolean; at: number } | null = null;
const CACHE_MS = 30_000;

/** True when Postgres accepts a simple query (cached ~30s). */
export async function isDatabaseReachable(force = false): Promise<boolean> {
  if (!process.env.DATABASE_URL?.trim()) return false;
  if (!force && cached && Date.now() - cached.at < CACHE_MS) {
    return cached.ok;
  }
  try {
    await db.execute(sql`SELECT 1`);
    cached = { ok: true, at: Date.now() };
    return true;
  } catch {
    cached = { ok: false, at: Date.now() };
    return false;
  }
}

export function invalidateDatabaseReachabilityCache(): void {
  cached = null;
}
