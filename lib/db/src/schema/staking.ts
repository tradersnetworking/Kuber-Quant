import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
  boolean,
  pgEnum,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stakingPlanTypeEnum = pgEnum("staking_plan_type", [
  "flexible",
  "fixed",
  "vip",
  "compound",
  "promotional",
]);

export const stakingRewardFrequencyEnum = pgEnum("staking_reward_frequency", [
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "at_maturity",
]);

export const stakingRiskLevelEnum = pgEnum("staking_risk_level", ["low", "medium", "high"]);

export const userStakeStatusEnum = pgEnum("user_stake_status", [
  "pending",
  "active",
  "matured",
  "claimed",
  "withdrawn",
  "cancelled",
  "frozen",
]);

export const stakeClaimStatusEnum = pgEnum("stake_claim_status", [
  "pending",
  "approved",
  "rejected",
  "processed",
]);

export const stakingPlansTable = pgTable(
  "staking_plans",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    planType: stakingPlanTypeEnum("plan_type").notNull().default("fixed"),
    currency: text("currency").notNull().default("USDT"),
    minAmount: numeric("min_amount", { precision: 18, scale: 8 }).notNull(),
    maxAmount: numeric("max_amount", { precision: 18, scale: 8 }).notNull(),
    aprPercent: numeric("apr_percent", { precision: 8, scale: 4 }).notNull(),
    apyPercent: numeric("apy_percent", { precision: 8, scale: 4 }).notNull(),
    roiPercent: numeric("roi_percent", { precision: 8, scale: 4 }).notNull(),
    lockDurationDays: integer("lock_duration_days").notNull().default(0),
    isFlexible: boolean("is_flexible").notNull().default(false),
    rewardFrequency: stakingRewardFrequencyEnum("reward_frequency").notNull().default("daily"),
    compoundEnabled: boolean("compound_enabled").notNull().default(false),
    autoRenew: boolean("auto_renew").notNull().default(false),
    earlyWithdrawalPenalty: numeric("early_withdrawal_penalty", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    promotionalBonusPercent: numeric("promotional_bonus_percent", { precision: 6, scale: 2 })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    isFeatured: boolean("is_featured").notNull().default(false),
    isPopular: boolean("is_popular").notNull().default(false),
    isRecommended: boolean("is_recommended").notNull().default(false),
    riskLevel: stakingRiskLevelEnum("risk_level").notNull().default("medium"),
    maxUsers: integer("max_users"),
    totalPoolLimit: numeric("total_pool_limit", { precision: 18, scale: 8 }),
    totalStaked: numeric("total_staked", { precision: 18, scale: 8 }).notNull().default("0"),
    activeStakers: integer("active_stakers").notNull().default(0),
    themeColor: text("theme_color").default("#f59e0b"),
    iconKey: text("icon_key").default("coins"),
    sortOrder: integer("sort_order").notNull().default(0),
    promoEndsAt: timestamp("promo_ends_at", { withTimezone: true }),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("staking_plans_active_idx").on(table.isActive),
    index("staking_plans_type_idx").on(table.planType),
  ],
);

export const userStakesTable = pgTable(
  "user_stakes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    planId: integer("plan_id").notNull(),
    planName: text("plan_name").notNull(),
    principal: numeric("principal", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull().default("USDT"),
    aprPercent: numeric("apr_percent", { precision: 8, scale: 4 }).notNull(),
    apyPercent: numeric("apy_percent", { precision: 8, scale: 4 }).notNull(),
    roiPercent: numeric("roi_percent", { precision: 8, scale: 4 }).notNull(),
    accruedRewards: numeric("accrued_rewards", { precision: 18, scale: 8 }).notNull().default("0"),
    claimedRewards: numeric("claimed_rewards", { precision: 18, scale: 8 }).notNull().default("0"),
    pendingRewards: numeric("pending_rewards", { precision: 18, scale: 8 }).notNull().default("0"),
    autoReinvest: boolean("auto_reinvest").notNull().default(false),
    compoundEnabled: boolean("compound_enabled").notNull().default(false),
    status: userStakeStatusEnum("status").notNull().default("pending"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    maturesAt: timestamp("matures_at", { withTimezone: true }),
    lastRewardAt: timestamp("last_reward_at", { withTimezone: true }),
    agreementAcceptedAt: timestamp("agreement_accepted_at", { withTimezone: true }),
    agreementIp: text("agreement_ip"),
    clientMeta: jsonb("client_meta"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("user_stakes_user_idx").on(table.userId),
    index("user_stakes_plan_idx").on(table.planId),
    index("user_stakes_status_idx").on(table.status),
    index("user_stakes_matures_idx").on(table.maturesAt),
  ],
);

export const stakingRewardLogsTable = pgTable(
  "staking_reward_logs",
  {
    id: serial("id").primaryKey(),
    stakeId: integer("stake_id").notNull(),
    userId: integer("user_id").notNull(),
    planId: integer("plan_id").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull().default("USDT"),
    rewardType: text("reward_type").notNull().default("periodic"),
    aprApplied: numeric("apr_applied", { precision: 8, scale: 4 }),
    note: text("note"),
    processedAt: timestamp("processed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("staking_reward_logs_stake_idx").on(table.stakeId),
    index("staking_reward_logs_user_idx").on(table.userId),
  ],
);

export const stakeClaimsTable = pgTable(
  "stake_claims",
  {
    id: serial("id").primaryKey(),
    stakeId: integer("stake_id").notNull(),
    userId: integer("user_id").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    currency: text("currency").notNull().default("USDT"),
    claimType: text("claim_type").notNull().default("reward"),
    status: stakeClaimStatusEnum("status").notNull().default("pending"),
    adminRemarks: text("admin_remarks"),
    processedBy: integer("processed_by"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("stake_claims_user_idx").on(table.userId),
    index("stake_claims_status_idx").on(table.status),
  ],
);

export const stakingSettingsTable = pgTable("staking_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedBy: integer("updated_by"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stakingAdminActionsTable = pgTable(
  "staking_admin_actions",
  {
    id: serial("id").primaryKey(),
    adminId: integer("admin_id").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: integer("target_id"),
    payload: jsonb("payload"),
    remarks: text("remarks"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staking_admin_actions_created_idx").on(table.createdAt)],
);

export const stakingRoiHistoryTable = pgTable(
  "staking_roi_history",
  {
    id: serial("id").primaryKey(),
    planId: integer("plan_id").notNull(),
    previousApr: numeric("previous_apr", { precision: 8, scale: 4 }),
    newApr: numeric("new_apr", { precision: 8, scale: 4 }),
    previousApy: numeric("previous_apy", { precision: 8, scale: 4 }),
    newApy: numeric("new_apy", { precision: 8, scale: 4 }),
    previousRoi: numeric("previous_roi", { precision: 8, scale: 4 }),
    newRoi: numeric("new_roi", { precision: 8, scale: 4 }),
    changedBy: integer("changed_by").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("staking_roi_history_plan_idx").on(table.planId)],
);

export const insertStakingPlanSchema = createInsertSchema(stakingPlansTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalStaked: true,
  activeStakers: true,
});
export type InsertStakingPlan = z.infer<typeof insertStakingPlanSchema>;
export type StakingPlan = typeof stakingPlansTable.$inferSelect;
export type UserStake = typeof userStakesTable.$inferSelect;
export type StakingRewardLog = typeof stakingRewardLogsTable.$inferSelect;
