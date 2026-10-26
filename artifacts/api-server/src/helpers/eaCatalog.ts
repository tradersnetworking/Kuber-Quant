import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

const CATALOG_KEY = "ea_catalog_json";

export type EACatalogItem = Record<string, unknown> & { id: number; name: string; type: string };

async function defaultCatalog(): Promise<EACatalogItem[]> {
  const { EA_CATALOG } = await import("../routes/eaStrategies");
  return [...EA_CATALOG];
}

export async function getEaCatalog(): Promise<EACatalogItem[]> {
  const defaults = await defaultCatalog();
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, CATALOG_KEY)).limit(1);
  let stored: EACatalogItem[] | null = null;
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) stored = parsed;
    } catch { /* fall through */ }
  }
  if (!stored) return defaults;

  const names = new Set(stored.map((item) => String(item.name || "").trim().toLowerCase()));
  const missing = defaults.filter((item) => String(item.name).startsWith("FTA ") && !names.has(String(item.name).trim().toLowerCase()));
  if (!missing.length) return stored;

  const merged = [...stored, ...missing];
  await saveEaCatalog(merged);
  return merged;
}

export async function saveEaCatalog(catalog: EACatalogItem[]): Promise<void> {
  const value = JSON.stringify(catalog);
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, CATALOG_KEY)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, CATALOG_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: CATALOG_KEY,
      value,
      label: "EA Strategy Catalog",
      category: "trading",
      description: "JSON catalog of EA strategies for the platform",
    });
  }
}

export async function findCatalogStrategy(catalogId: number): Promise<EACatalogItem | undefined> {
  const catalog = await getEaCatalog();
  return catalog.find(s => s.id === catalogId);
}
