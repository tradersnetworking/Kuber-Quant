import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const PARTNERS_KEY = "partners_json";

export type InstitutionalPartner = {
  id: number;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type PartnersConfig = {
  title: string;
  items: InstitutionalPartner[];
};

const DEFAULT_PARTNERS: PartnersConfig = {
  title: "Institutional Partners & Brokers",
  items: [
    { id: 1, name: "BINANCE", sortOrder: 1, isActive: true },
    { id: 2, name: "COINBASE", sortOrder: 2, isActive: true },
    { id: 3, name: "METATRADER", sortOrder: 3, isActive: true },
    { id: 4, name: "KRAKEN", sortOrder: 4, isActive: true },
    { id: 5, name: "REVOLUT", sortOrder: 5, isActive: true },
  ],
};

function normalizeConfig(raw: unknown): PartnersConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PARTNERS, items: [...DEFAULT_PARTNERS.items] };
  const data = raw as Partial<PartnersConfig>;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is InstitutionalPartner => !!item && typeof item.name === "string")
        .map((item, index) => ({
          id: Number(item.id) || index + 1,
          name: String(item.name).trim(),
          logoUrl: item.logoUrl ? String(item.logoUrl) : undefined,
          websiteUrl: item.websiteUrl ? String(item.websiteUrl) : undefined,
          sortOrder: Number(item.sortOrder) || index + 1,
          isActive: item.isActive !== false,
        }))
    : [...DEFAULT_PARTNERS.items];

  return {
    title: typeof data.title === "string" && data.title.trim() ? data.title.trim() : DEFAULT_PARTNERS.title,
    items,
  };
}

async function savePartnersConfig(config: PartnersConfig): Promise<void> {
  const value = JSON.stringify(config);
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, PARTNERS_KEY)).limit(1);
  if (existing.length > 0) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, PARTNERS_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: PARTNERS_KEY,
      value,
      label: "Institutional Partners",
      category: "general",
      description: "Home page partners and brokers section",
    });
  }
}

export async function getPartnersConfig(): Promise<PartnersConfig> {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, PARTNERS_KEY)).limit(1);
  if (setting?.value) {
    try {
      return normalizeConfig(JSON.parse(setting.value));
    } catch {
      /* fall through */
    }
  }
  return { ...DEFAULT_PARTNERS, items: [...DEFAULT_PARTNERS.items] };
}

export async function getActivePartners(): Promise<{ title: string; partners: InstitutionalPartner[] }> {
  const config = await getPartnersConfig();
  const partners = config.items
    .filter((item) => item.isActive && item.name)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  return { title: config.title, partners };
}

export async function updatePartnersTitle(title: string): Promise<PartnersConfig> {
  const config = await getPartnersConfig();
  config.title = title.trim() || DEFAULT_PARTNERS.title;
  await savePartnersConfig(config);
  return config;
}

export async function createPartner(input: Omit<InstitutionalPartner, "id">): Promise<InstitutionalPartner> {
  const config = await getPartnersConfig();
  const nextId = config.items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const partner: InstitutionalPartner = {
    id: nextId,
    name: input.name.trim(),
    logoUrl: input.logoUrl?.trim() || undefined,
    websiteUrl: input.websiteUrl?.trim() || undefined,
    sortOrder: input.sortOrder ?? nextId,
    isActive: input.isActive !== false,
  };
  config.items.push(partner);
  await savePartnersConfig(config);
  return partner;
}

export async function updatePartner(id: number, input: Partial<Omit<InstitutionalPartner, "id">>): Promise<InstitutionalPartner | null> {
  const config = await getPartnersConfig();
  const index = config.items.findIndex((item) => item.id === id);
  if (index < 0) return null;

  const current = config.items[index];
  const updated: InstitutionalPartner = {
    ...current,
    ...input,
    id,
    name: input.name !== undefined ? input.name.trim() : current.name,
    logoUrl: input.logoUrl !== undefined ? (input.logoUrl.trim() || undefined) : current.logoUrl,
    websiteUrl: input.websiteUrl !== undefined ? (input.websiteUrl.trim() || undefined) : current.websiteUrl,
    sortOrder: input.sortOrder ?? current.sortOrder,
    isActive: input.isActive ?? current.isActive,
  };
  config.items[index] = updated;
  await savePartnersConfig(config);
  return updated;
}

export async function deletePartner(id: number): Promise<boolean> {
  const config = await getPartnersConfig();
  const before = config.items.length;
  config.items = config.items.filter((item) => item.id !== id);
  if (config.items.length === before) return false;
  await savePartnersConfig(config);
  return true;
}
