import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const CATALOG_KEY = "ea_catalog_json";

export type EACatalogItem = Record<string, unknown> & { id: number; name: string; type: string };

async function defaultCatalog(): Promise<EACatalogItem[]> {
  const { EA_CATALOG } = await import("../routes/eaStrategies");
  return [...EA_CATALOG];
}

export async function getEaCatalog(): Promise<EACatalogItem[]> {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, CATALOG_KEY)).limit(1);
  if (setting?.value) {
    try {
      const parsed = JSON.parse(setting.value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { /* fall through */ }
  }
  return defaultCatalog();
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
