import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const cache = new Map<string, { values: Record<string, string>; expiry: number }>();
const TTL_MS = 30_000;

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  const cacheKey = keys.slice().sort().join(",");
  const hit = cache.get(cacheKey);
  if (hit && hit.expiry > Date.now()) return hit.values;

  const rows = keys.length
    ? await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys))
    : await db.select().from(siteSettingsTable);

  const values: Record<string, string> = {};
  for (const row of rows) values[row.key] = row.value;

  cache.set(cacheKey, { values, expiry: Date.now() + TTL_MS });
  return values;
}

export async function getSiteSetting(key: string, defaultValue = ""): Promise<string> {
  const values = await getSiteSettings([key]);
  return values[key] ?? defaultValue;
}

export function invalidateSiteSettingsCache() {
  cache.clear();
}
