import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";

/** Scoped partner API keys for external integrations */
export const partnerApiKeysTable = pgTable("partner_api_keys", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  /** First 12 chars of the raw key for lookup (e.g. kqpk_a1b2c3) */
  keyPrefix: text("key_prefix").notNull().unique(),
  keyHash: text("key_hash").notNull(),
  /** JSON array of scope strings */
  scopes: text("scopes").notNull().default("[]"),
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),
  /** JSON array of subscribed event types */
  webhookEvents: text("webhook_events").default("[]"),
  isActive: boolean("is_active").notNull().default(true),
  createdBy: integer("created_by"),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type PartnerApiKey = typeof partnerApiKeysTable.$inferSelect;
