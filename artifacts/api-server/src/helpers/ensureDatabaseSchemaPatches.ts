import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { isDatabaseReachable } from "./dbConnectivity";
import { isConnectionError, isMissingRelationError } from "./pgErrors";

/** Idempotent ALTER TABLE statements for columns added after initial deploys. */
const SCHEMA_PATCHES: string[] = [
  `ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_destination text`,
  `ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_account_id integer`,
  `ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_method text`,
  `ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_consent_at timestamptz`,
  `ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_acknowledged_at timestamptz`,
  `ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS buy_price_inr numeric(18, 4)`,
  `ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS sell_price_inr numeric(18, 4)`,
  `ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS buy_enabled boolean NOT NULL DEFAULT true`,
  `ALTER TABLE exchange_rates ADD COLUMN IF NOT EXISTS sell_enabled boolean NOT NULL DEFAULT true`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history (created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications (user_id, is_read)`,
  `ALTER TABLE payment_gateways ADD COLUMN IF NOT EXISTS digital_rupee_id text`,
  `ALTER TABLE user_payment_accounts ADD COLUMN IF NOT EXISTS digital_rupee_id text`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kyc_document_status') THEN
       CREATE TYPE kyc_document_status AS ENUM ('pending', 'approved', 'rejected', 'superseded');
     END IF;
   END $$`,
  `CREATE TABLE IF NOT EXISTS kyc_documents (
     id serial PRIMARY KEY,
     user_id integer NOT NULL,
     kyc_record_id integer,
     doc_type text NOT NULL,
     label text NOT NULL,
     file_url text NOT NULL,
     original_filename text,
     mime_type text,
     status kyc_document_status NOT NULL DEFAULT 'pending',
     supersedes_id integer,
     rejection_reason text,
     reviewed_by integer,
     reviewed_at timestamptz,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents (user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents (status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders (order_id)`,
];

let patchesApplied = false;

/**
 * Applies lightweight schema patches so Drizzle queries match the live PostgreSQL schema.
 * Safe to run on every startup — each statement uses IF NOT EXISTS.
 */
export async function ensureDatabaseSchemaPatches(): Promise<void> {
  if (patchesApplied) return;

  if (!(await isDatabaseReachable())) {
    logger.warn("Database unreachable — skipping schema patches (run pnpm db:push when DB is reachable)");
    patchesApplied = true;
    return;
  }

  try {
    await pool.query("SELECT 1 FROM users LIMIT 0");
  } catch (err) {
    if (isMissingRelationError(err) || isConnectionError(err)) {
      logger.warn("Base schema missing — run pnpm db:push from a machine with database access");
      patchesApplied = true;
      return;
    }
  }

  let applied = 0;
  let skippedMissing = 0;
  for (const sql of SCHEMA_PATCHES) {
    try {
      await pool.query(sql);
      applied += 1;
    } catch (err) {
      if (isMissingRelationError(err)) {
        skippedMissing += 1;
        continue;
      }
      logger.warn({ err, sql: sql.slice(0, 80) }, "Database schema patch failed — skipping");
    }
  }

  patchesApplied = true;
  if (skippedMissing > 0) {
    logger.warn({ skippedMissing }, "Some schema patches skipped — base tables missing (run db:push)");
  }
  if (applied > 0) {
    logger.info({ patchCount: applied }, "Database schema patches verified");
  }
}
