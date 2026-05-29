import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "@workspace/db/orm";
import { getCachedJson, invalidateRedisCacheByPrefix } from "./redisCache";

const memoryCache = new Map<string, { values: Record<string, string>; expiry: number }>();
const TTL_MS = 30_000;
const REDIS_TTL_SEC = 60;
const REDIS_PREFIX = "cache:site-settings:";

export async function getSiteSettings(keys: string[]): Promise<Record<string, string>> {
  const cacheKey = keys.slice().sort().join(",");
  const hit = memoryCache.get(cacheKey);
  if (hit && hit.expiry > Date.now()) return hit.values;

  const values = await getCachedJson(`${REDIS_PREFIX}${cacheKey}`, REDIS_TTL_SEC, async () => {
    const rows = keys.length
      ? await db.select().from(siteSettingsTable).where(inArray(siteSettingsTable.key, keys))
      : await db.select().from(siteSettingsTable);

    const out: Record<string, string> = {};
    for (const row of rows) out[row.key] = row.value;
    return out;
  });

  memoryCache.set(cacheKey, { values, expiry: Date.now() + TTL_MS });
  return values;
}

export async function getSiteSetting(key: string, defaultValue = ""): Promise<string> {
  const values = await getSiteSettings([key]);
  return values[key] ?? defaultValue;
}

export function invalidateSiteSettingsCache() {
  memoryCache.clear();
  void invalidateRedisCacheByPrefix(REDIS_PREFIX);
}
