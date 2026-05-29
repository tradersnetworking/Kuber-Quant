import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

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
];

let patchesApplied = false;

/**
 * Applies lightweight schema patches so Drizzle queries match the live PostgreSQL schema.
 * Safe to run on every startup — each statement uses IF NOT EXISTS.
 */
export async function ensureDatabaseSchemaPatches(): Promise<void> {
  if (patchesApplied) return;

  let applied = 0;
  for (const sql of SCHEMA_PATCHES) {
    try {
      await pool.query(sql);
      applied += 1;
    } catch (err) {
      logger.error({ err, sql }, "Database schema patch failed");
      throw err;
    }
  }

  patchesApplied = true;
  if (applied > 0) {
    logger.info({ patchCount: applied }, "Database schema patches verified");
  }
}
