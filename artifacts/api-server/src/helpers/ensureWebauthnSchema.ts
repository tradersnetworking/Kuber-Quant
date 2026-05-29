import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const WEBAUTHN_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  device_type text,
  device_name text NOT NULL DEFAULT 'Passkey',
  transports jsonb,
  aaguid text,
  backed_up boolean DEFAULT false,
  user_agent text,
  ip_address text,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS biometric_login_logs (
  id serial PRIMARY KEY,
  user_id integer,
  credential_id integer,
  event_type text NOT NULL,
  success boolean NOT NULL,
  fail_reason text,
  ip_address text,
  user_agent text,
  device_label text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_biometric_prefs (
  user_id integer PRIMARY KEY,
  quick_login_enabled boolean NOT NULL DEFAULT true,
  biometric_withdrawals_enabled boolean NOT NULL DEFAULT false,
  withdrawal_threshold_inr numeric(18,2) NOT NULL DEFAULT 10000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx ON webauthn_credentials (user_id);
CREATE INDEX IF NOT EXISTS webauthn_credentials_active_idx ON webauthn_credentials (user_id, is_active);
CREATE INDEX IF NOT EXISTS biometric_login_logs_user_idx ON biometric_login_logs (user_id);
CREATE INDEX IF NOT EXISTS biometric_login_logs_created_idx ON biometric_login_logs (created_at);
CREATE INDEX IF NOT EXISTS biometric_login_logs_success_idx ON biometric_login_logs (success);
`;

let ready = false;

export async function ensureWebauthnSchema(): Promise<void> {
  if (ready) return;
  try {
    await pool.query(WEBAUTHN_SCHEMA_SQL);
    ready = true;
    logger.info("WebAuthn schema verified");
  } catch (err) {
    logger.error({ err }, "WebAuthn schema bootstrap failed");
    throw err;
  }
}
