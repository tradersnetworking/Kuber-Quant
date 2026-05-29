import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
  numeric,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

/** WebAuthn / passkey credentials (public key only — never biometric secrets). */
export const webauthnCredentialsTable = pgTable(
  "webauthn_credentials",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    deviceType: text("device_type"),
    deviceName: text("device_name").notNull().default("Passkey"),
    transports: jsonb("transports").$type<string[]>(),
    aaguid: text("aaguid"),
    backedUp: boolean("backed_up").default(false),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    isActive: boolean("is_active").notNull().default(true),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("webauthn_credentials_user_idx").on(table.userId),
    index("webauthn_credentials_active_idx").on(table.userId, table.isActive),
  ],
);

/** Audit log for biometric / passkey authentication events. */
export const biometricLoginLogsTable = pgTable(
  "biometric_login_logs",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    credentialId: integer("credential_id"),
    eventType: text("event_type").notNull(),
    success: boolean("success").notNull(),
    failReason: text("fail_reason"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceLabel: text("device_label"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("biometric_login_logs_user_idx").on(table.userId),
    index("biometric_login_logs_created_idx").on(table.createdAt),
    index("biometric_login_logs_success_idx").on(table.success),
  ],
);

/** Per-user biometric security preferences. */
export const userBiometricPrefsTable = pgTable("user_biometric_prefs", {
  userId: integer("user_id").primaryKey(),
  quickLoginEnabled: boolean("quick_login_enabled").notNull().default(true),
  biometricWithdrawalsEnabled: boolean("biometric_withdrawals_enabled").notNull().default(false),
  withdrawalThresholdInr: numeric("withdrawal_threshold_inr", { precision: 18, scale: 2 })
    .notNull()
    .default("10000"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type WebauthnCredential = typeof webauthnCredentialsTable.$inferSelect;
export type BiometricLoginLog = typeof biometricLoginLogsTable.$inferSelect;
export type UserBiometricPrefs = typeof userBiometricPrefsTable.$inferSelect;
