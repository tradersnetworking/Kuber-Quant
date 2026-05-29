import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

const readUrl = process.env.DATABASE_READ_URL?.trim();
export const readPool = readUrl ? new Pool({ connectionString: readUrl }) : pool;
/** Use for read-heavy reporting routes; falls back to primary when no replica is configured. */
export const dbRead = readUrl ? drizzle(readPool, { schema }) : db;

export * from "./schema";
