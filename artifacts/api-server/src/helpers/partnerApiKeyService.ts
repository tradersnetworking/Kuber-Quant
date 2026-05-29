import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db, partnerApiKeysTable } from "@workspace/db";
import { eq, desc } from "@workspace/db/orm";

export const PARTNER_SCOPES = [
  "users.read",
  "transactions.read",
  "kyc.read",
  "deposits.read",
  "withdrawals.read",
] as const;

export type PartnerScope = typeof PARTNER_SCOPES[number];

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function mapPartnerKey(row: typeof partnerApiKeysTable.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    scopes: parseJsonArray(row.scopes),
    webhookUrl: row.webhookUrl || null,
    webhookEvents: parseJsonArray(row.webhookEvents),
    hasWebhookSecret: !!row.webhookSecret,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() || null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listPartnerApiKeys() {
  const rows = await db.select().from(partnerApiKeysTable).orderBy(desc(partnerApiKeysTable.createdAt));
  return rows.map(mapPartnerKey);
}

export async function createPartnerApiKey(opts: {
  name: string;
  scopes: string[];
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEvents?: string[];
  createdBy?: number;
}): Promise<{ key: string; record: ReturnType<typeof mapPartnerKey> }> {
  const rawKey = `kqpk_${randomBytes(24).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 12);
  const keyHash = await bcrypt.hash(rawKey, 10);

  const [row] = await db.insert(partnerApiKeysTable).values({
    name: opts.name.trim(),
    keyPrefix,
    keyHash,
    scopes: JSON.stringify(opts.scopes),
    webhookUrl: opts.webhookUrl?.trim() || null,
    webhookSecret: opts.webhookSecret?.trim() || null,
    webhookEvents: JSON.stringify(opts.webhookEvents || []),
    createdBy: opts.createdBy || null,
  }).returning();

  return { key: rawKey, record: mapPartnerKey(row) };
}

export async function updatePartnerApiKey(id: number, patch: {
  name?: string;
  scopes?: string[];
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  webhookEvents?: string[];
  isActive?: boolean;
}) {
  const updates: Partial<typeof partnerApiKeysTable.$inferInsert> = {};
  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.scopes !== undefined) updates.scopes = JSON.stringify(patch.scopes);
  if (patch.webhookUrl !== undefined) updates.webhookUrl = patch.webhookUrl?.trim() || null;
  if (patch.webhookSecret !== undefined) updates.webhookSecret = patch.webhookSecret?.trim() || null;
  if (patch.webhookEvents !== undefined) updates.webhookEvents = JSON.stringify(patch.webhookEvents);
  if (patch.isActive !== undefined) updates.isActive = patch.isActive;

  const [row] = await db.update(partnerApiKeysTable)
    .set(updates)
    .where(eq(partnerApiKeysTable.id, id))
    .returning();
  return row ? mapPartnerKey(row) : null;
}

export async function deletePartnerApiKey(id: number) {
  await db.delete(partnerApiKeysTable).where(eq(partnerApiKeysTable.id, id));
}

export type VerifiedPartnerKey = {
  id: number;
  name: string;
  scopes: string[];
  webhookUrl: string | null;
  webhookSecret: string | null;
  webhookEvents: string[];
};

export async function verifyPartnerApiKey(rawKey: string): Promise<VerifiedPartnerKey | null> {
  if (!rawKey?.startsWith("kqpk_") || rawKey.length < 20) return null;

  const prefix = rawKey.slice(0, 12);
  const [row] = await db.select().from(partnerApiKeysTable)
    .where(eq(partnerApiKeysTable.keyPrefix, prefix))
    .limit(1);

  if (!row?.isActive) return null;
  const valid = await bcrypt.compare(rawKey, row.keyHash);
  if (!valid) return null;

  void db.update(partnerApiKeysTable)
    .set({ lastUsedAt: new Date() })
    .where(eq(partnerApiKeysTable.id, row.id));

  return {
    id: row.id,
    name: row.name,
    scopes: parseJsonArray(row.scopes),
    webhookUrl: row.webhookUrl,
    webhookSecret: row.webhookSecret,
    webhookEvents: parseJsonArray(row.webhookEvents),
  };
}

export function partnerHasScope(partner: VerifiedPartnerKey, scope: PartnerScope): boolean {
  return partner.scopes.includes(scope);
}
