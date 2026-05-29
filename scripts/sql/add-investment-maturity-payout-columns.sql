-- Run once if columns are missing (PostgreSQL)
ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_destination text;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_account_id integer;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_method text;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_consent_at timestamptz;
ALTER TABLE investments ADD COLUMN IF NOT EXISTS maturity_payout_acknowledged_at timestamptz;
