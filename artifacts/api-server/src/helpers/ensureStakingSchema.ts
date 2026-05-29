import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

const STAKING_SCHEMA_SQL = `
DO $$ BEGIN
  CREATE TYPE staking_plan_type AS ENUM ('flexible','fixed','vip','compound','promotional');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staking_reward_frequency AS ENUM ('hourly','daily','weekly','monthly','at_maturity');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE staking_risk_level AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_stake_status AS ENUM ('pending','active','matured','claimed','withdrawn','cancelled','frozen');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stake_claim_status AS ENUM ('pending','approved','rejected','processed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS staking_plans (
  id serial PRIMARY KEY,
  name text NOT NULL,
  description text,
  plan_type staking_plan_type NOT NULL DEFAULT 'fixed',
  currency text NOT NULL DEFAULT 'USDT',
  min_amount numeric(18,8) NOT NULL,
  max_amount numeric(18,8) NOT NULL,
  apr_percent numeric(8,4) NOT NULL,
  apy_percent numeric(8,4) NOT NULL,
  roi_percent numeric(8,4) NOT NULL,
  lock_duration_days integer NOT NULL DEFAULT 0,
  is_flexible boolean NOT NULL DEFAULT false,
  reward_frequency staking_reward_frequency NOT NULL DEFAULT 'daily',
  compound_enabled boolean NOT NULL DEFAULT false,
  auto_renew boolean NOT NULL DEFAULT false,
  early_withdrawal_penalty numeric(5,2) NOT NULL DEFAULT 0,
  promotional_bonus_percent numeric(6,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_featured boolean NOT NULL DEFAULT false,
  is_popular boolean NOT NULL DEFAULT false,
  is_recommended boolean NOT NULL DEFAULT false,
  risk_level staking_risk_level NOT NULL DEFAULT 'medium',
  max_users integer,
  total_pool_limit numeric(18,8),
  total_staked numeric(18,8) NOT NULL DEFAULT 0,
  active_stakers integer NOT NULL DEFAULT 0,
  theme_color text DEFAULT '#f59e0b',
  icon_key text DEFAULT 'coins',
  sort_order integer NOT NULL DEFAULT 0,
  promo_ends_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_stakes (
  id serial PRIMARY KEY,
  user_id integer NOT NULL,
  plan_id integer NOT NULL,
  plan_name text NOT NULL,
  principal numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDT',
  apr_percent numeric(8,4) NOT NULL,
  apy_percent numeric(8,4) NOT NULL,
  roi_percent numeric(8,4) NOT NULL,
  accrued_rewards numeric(18,8) NOT NULL DEFAULT 0,
  claimed_rewards numeric(18,8) NOT NULL DEFAULT 0,
  pending_rewards numeric(18,8) NOT NULL DEFAULT 0,
  auto_reinvest boolean NOT NULL DEFAULT false,
  compound_enabled boolean NOT NULL DEFAULT false,
  status user_stake_status NOT NULL DEFAULT 'pending',
  started_at timestamptz,
  matures_at timestamptz,
  last_reward_at timestamptz,
  agreement_accepted_at timestamptz,
  agreement_ip text,
  client_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staking_reward_logs (
  id serial PRIMARY KEY,
  stake_id integer NOT NULL,
  user_id integer NOT NULL,
  plan_id integer NOT NULL,
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDT',
  reward_type text NOT NULL DEFAULT 'periodic',
  apr_applied numeric(8,4),
  note text,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stake_claims (
  id serial PRIMARY KEY,
  stake_id integer NOT NULL,
  user_id integer NOT NULL,
  amount numeric(18,8) NOT NULL,
  currency text NOT NULL DEFAULT 'USDT',
  claim_type text NOT NULL DEFAULT 'reward',
  status stake_claim_status NOT NULL DEFAULT 'pending',
  admin_remarks text,
  processed_by integer,
  processed_at timestamptz,
  client_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staking_settings (
  id serial PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  updated_by integer,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staking_admin_actions (
  id serial PRIMARY KEY,
  admin_id integer NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id integer,
  payload jsonb,
  remarks text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS staking_roi_history (
  id serial PRIMARY KEY,
  plan_id integer NOT NULL,
  previous_apr numeric(8,4),
  new_apr numeric(8,4),
  previous_apy numeric(8,4),
  new_apy numeric(8,4),
  previous_roi numeric(8,4),
  new_roi numeric(8,4),
  changed_by integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS staking_plans_active_idx ON staking_plans (is_active);
CREATE INDEX IF NOT EXISTS staking_plans_type_idx ON staking_plans (plan_type);
CREATE INDEX IF NOT EXISTS user_stakes_user_idx ON user_stakes (user_id);
CREATE INDEX IF NOT EXISTS user_stakes_plan_idx ON user_stakes (plan_id);
CREATE INDEX IF NOT EXISTS user_stakes_status_idx ON user_stakes (status);
CREATE INDEX IF NOT EXISTS user_stakes_matures_idx ON user_stakes (matures_at);
CREATE INDEX IF NOT EXISTS staking_reward_logs_stake_idx ON staking_reward_logs (stake_id);
CREATE INDEX IF NOT EXISTS staking_reward_logs_user_idx ON staking_reward_logs (user_id);
CREATE INDEX IF NOT EXISTS stake_claims_user_idx ON stake_claims (user_id);
CREATE INDEX IF NOT EXISTS stake_claims_status_idx ON stake_claims (status);
CREATE INDEX IF NOT EXISTS staking_admin_actions_created_idx ON staking_admin_actions (created_at);
CREATE INDEX IF NOT EXISTS staking_roi_history_plan_idx ON staking_roi_history (plan_id);

INSERT INTO staking_settings (key, value)
VALUES ('global', '{"stakingEnabled":true,"rewardsPaused":false,"autoPayoutEnabled":true,"manualApprovalRequired":false,"defaultCurrency":"USDT"}'::jsonb)
ON CONFLICT (key) DO NOTHING;
`;

let stakingSchemaReady = false;

export async function ensureStakingSchema(): Promise<void> {
  if (stakingSchemaReady) return;
  try {
    await pool.query(STAKING_SCHEMA_SQL);
    stakingSchemaReady = true;
    logger.info("Staking schema verified");
  } catch (err) {
    logger.error({ err }, "Staking schema bootstrap failed");
    throw err;
  }
}

export const DEFAULT_STAKING_PLANS = [
  {
    name: "Flexible USDT Earn",
    description: "Withdraw anytime. Lower yield, maximum liquidity.",
    planType: "flexible" as const,
    currency: "USDT",
    minAmount: "50",
    maxAmount: "50000",
    aprPercent: "8",
    apyPercent: "8.3",
    roiPercent: "8",
    lockDurationDays: 0,
    isFlexible: true,
    rewardFrequency: "daily" as const,
    isFeatured: true,
    themeColor: "#10b981",
    iconKey: "wallet",
    sortOrder: 1,
  },
  {
    name: "Fixed 30-Day Stake",
    description: "Lock for 30 days and earn boosted daily rewards.",
    planType: "fixed" as const,
    currency: "USDT",
    minAmount: "100",
    maxAmount: "100000",
    aprPercent: "18",
    apyPercent: "19.56",
    roiPercent: "18",
    lockDurationDays: 30,
    rewardFrequency: "daily" as const,
    isPopular: true,
    themeColor: "#f59e0b",
    sortOrder: 2,
  },
  {
    name: "Fixed 90-Day Stake",
    description: "Premium 90-day lock with compound-ready rewards.",
    planType: "fixed" as const,
    currency: "USDT",
    minAmount: "500",
    maxAmount: "250000",
    aprPercent: "24",
    apyPercent: "27.12",
    roiPercent: "24",
    lockDurationDays: 90,
    rewardFrequency: "daily" as const,
    compoundEnabled: true,
    isRecommended: true,
    themeColor: "#6366f1",
    sortOrder: 3,
  },
  {
    name: "VIP 365-Day Stake",
    description: "High minimum, institutional-grade APR for VIP members.",
    planType: "vip" as const,
    currency: "USDT",
    minAmount: "10000",
    maxAmount: "1000000",
    aprPercent: "36",
    apyPercent: "43.32",
    roiPercent: "36",
    lockDurationDays: 365,
    rewardFrequency: "weekly" as const,
    riskLevel: "medium" as const,
    earlyWithdrawalPenalty: "5",
    themeColor: "#a855f7",
    iconKey: "crown",
    sortOrder: 4,
  },
  {
    name: "Compound BTC Growth",
    description: "Auto-compound daily rewards into principal.",
    planType: "compound" as const,
    currency: "BTC",
    minAmount: "0.01",
    maxAmount: "10",
    aprPercent: "12",
    apyPercent: "12.75",
    roiPercent: "12",
    lockDurationDays: 180,
    compoundEnabled: true,
    autoRenew: true,
    rewardFrequency: "daily" as const,
    themeColor: "#f97316",
    iconKey: "bitcoin",
    sortOrder: 5,
  },
];

export async function seedDefaultStakingPlansIfEmpty(): Promise<void> {
  const { rows } = await pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM staking_plans");
  if (Number(rows[0]?.count) > 0) return;

  for (const plan of DEFAULT_STAKING_PLANS) {
    await pool.query(
      `INSERT INTO staking_plans (
        name, description, plan_type, currency, min_amount, max_amount,
        apr_percent, apy_percent, roi_percent, lock_duration_days, is_flexible,
        reward_frequency, compound_enabled, auto_renew, early_withdrawal_penalty,
        is_featured, is_popular, is_recommended, risk_level, theme_color, icon_key, sort_order
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)`,
      [
        plan.name,
        plan.description,
        plan.planType,
        plan.currency,
        plan.minAmount,
        plan.maxAmount,
        plan.aprPercent,
        plan.apyPercent,
        plan.roiPercent,
        plan.lockDurationDays,
        plan.isFlexible ?? false,
        plan.rewardFrequency,
        plan.compoundEnabled ?? false,
        plan.autoRenew ?? false,
        plan.earlyWithdrawalPenalty ?? "0",
        plan.isFeatured ?? false,
        plan.isPopular ?? false,
        plan.isRecommended ?? false,
        plan.riskLevel ?? "medium",
        plan.themeColor ?? "#f59e0b",
        plan.iconKey ?? "coins",
        plan.sortOrder ?? 0,
      ],
    );
  }
  logger.info({ count: DEFAULT_STAKING_PLANS.length }, "Default staking plans seeded");
}
