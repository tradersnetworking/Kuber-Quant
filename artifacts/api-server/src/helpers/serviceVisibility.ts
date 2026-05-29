import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { getSiteSetting, invalidateSiteSettingsCache } from "./siteSettings";

const KEY = "service_visibility";

export const SERVICE_KEYS = [
  "investment_plans",
  "staking",
  "copy_trading",
  "account_handling",
  "link_accounts",
  "algo_trading",
  "ea_strategies",
] as const;

export type ServiceKey = (typeof SERVICE_KEYS)[number];
export type ServiceVisibilityItem = { key: ServiceKey; enabled: boolean };

function sanitize(list: unknown): ServiceVisibilityItem[] {
  const known = new Set<string>(SERVICE_KEYS);
  const seen = new Set<string>();
  const out: ServiceVisibilityItem[] = [];
  if (Array.isArray(list)) {
    for (const it of list) {
      const key = (it as any)?.key;
      if (typeof key === "string" && known.has(key) && !seen.has(key)) {
        out.push({ key: key as ServiceKey, enabled: (it as any).enabled !== false });
        seen.add(key);
      }
    }
  }
  // Append any canonical services not present (enabled by default), preserving canonical order.
  for (const key of SERVICE_KEYS) {
    if (!seen.has(key)) out.push({ key, enabled: true });
  }
  return out;
}

export async function getServiceVisibility(): Promise<ServiceVisibilityItem[]> {
  const raw = await getSiteSetting(KEY, "");
  let parsed: unknown = [];
  if (raw) {
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
  }
  return sanitize(parsed);
}

export async function updateServiceVisibility(list: ServiceVisibilityItem[]): Promise<ServiceVisibilityItem[]> {
  const sanitized = sanitize(list);
  const value = JSON.stringify(sanitized);
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, KEY)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: KEY,
      value,
      label: "Service Visibility",
      category: "homepage",
      description: "Which services are shown to investors / on the homepage, and their display order",
    });
  }
  invalidateSiteSettingsCache();
  return sanitized;
}
