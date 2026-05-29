import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

const ABOUT_KEY = "company_about_json";

export type AboutCategory =
  | "registration"
  | "affiliation"
  | "partner"
  | "recognition"
  | "license";

export type AboutCredentialItem = {
  id: number;
  category: AboutCategory;
  title: string;
  subtitle?: string;
  description?: string;
  referenceNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

export type CompanyAboutConfig = {
  sectionTitle: string;
  intro: string;
  footerDescription: string;
  items: AboutCredentialItem[];
};

export const ABOUT_CATEGORY_LABELS: Record<AboutCategory, string> = {
  registration: "Company Registration",
  affiliation: "Affiliations & Memberships",
  partner: "Strategic Partners",
  recognition: "Awards & Recognitions",
  license: "Licences & Regulatory",
};

const DEFAULT_ABOUT: CompanyAboutConfig = {
  sectionTitle: "About Kuber Quant",
  intro:
    "Kuber Quant is an institutional-grade wealth and trading technology platform. We combine algorithmic execution, copy trading, and regulated onboarding to serve investors worldwide.",
  footerDescription:
    "Premium algorithmic trading and wealth management platform. Institutional-grade technology for serious investors worldwide.",
  items: [
    {
      id: 1,
      category: "registration",
      title: "Corporate Registration",
      subtitle: "Primary entity registration",
      referenceNumber: "U62099MH2024PTC000000",
      issuedBy: "Ministry of Corporate Affairs, India",
      issuedDate: "2024-01-15",
      sortOrder: 1,
      isActive: true,
    },
    {
      id: 2,
      category: "license",
      title: "Financial Technology Services",
      subtitle: "Platform operations licence",
      referenceNumber: "FTS-2024-8842",
      issuedBy: "Regulatory Compliance Board",
      issuedDate: "2024-06-01",
      expiryDate: "2026-06-01",
      sortOrder: 2,
      isActive: true,
    },
    {
      id: 3,
      category: "affiliation",
      title: "MetaTrader Integration Partner",
      subtitle: "Official technology affiliation",
      issuedBy: "MetaQuotes Software Corp.",
      sortOrder: 3,
      isActive: true,
    },
    {
      id: 4,
      category: "recognition",
      title: "Best Fintech Platform 2025",
      subtitle: "WealthTech Awards",
      issuedBy: "Global Fintech Council",
      issuedDate: "2025-03-10",
      sortOrder: 4,
      isActive: true,
    },
    {
      id: 5,
      category: "partner",
      title: "Institutional Liquidity Network",
      subtitle: "Tier-1 broker connectivity",
      description: "Connected to regulated liquidity providers across forex, crypto, and indices.",
      sortOrder: 5,
      isActive: true,
    },
  ],
};

function normalizeCategory(value: unknown): AboutCategory {
  const allowed: AboutCategory[] = ["registration", "affiliation", "partner", "recognition", "license"];
  return allowed.includes(value as AboutCategory) ? (value as AboutCategory) : "registration";
}

function normalizeConfig(raw: unknown): CompanyAboutConfig {
  if (!raw || typeof raw !== "object") {
    return {
      ...DEFAULT_ABOUT,
      items: DEFAULT_ABOUT.items.map(i => ({ ...i })),
    };
  }

  const data = raw as Partial<CompanyAboutConfig>;
  const items = Array.isArray(data.items)
    ? data.items
        .filter((item): item is AboutCredentialItem => !!item && typeof item.title === "string")
        .map((item, index) => ({
          id: Number(item.id) || index + 1,
          category: normalizeCategory(item.category),
          title: String(item.title).trim(),
          subtitle: item.subtitle ? String(item.subtitle).trim() : undefined,
          description: item.description ? String(item.description).trim() : undefined,
          referenceNumber: item.referenceNumber ? String(item.referenceNumber).trim() : undefined,
          issuedBy: item.issuedBy ? String(item.issuedBy).trim() : undefined,
          issuedDate: item.issuedDate ? String(item.issuedDate).trim() : undefined,
          expiryDate: item.expiryDate ? String(item.expiryDate).trim() : undefined,
          documentUrl: item.documentUrl ? String(item.documentUrl).trim() : undefined,
          sortOrder: Number(item.sortOrder) || index + 1,
          isActive: item.isActive !== false,
        }))
    : DEFAULT_ABOUT.items.map(i => ({ ...i }));

  return {
    sectionTitle:
      typeof data.sectionTitle === "string" && data.sectionTitle.trim()
        ? data.sectionTitle.trim()
        : DEFAULT_ABOUT.sectionTitle,
    intro:
      typeof data.intro === "string" && data.intro.trim()
        ? data.intro.trim()
        : DEFAULT_ABOUT.intro,
    footerDescription:
      typeof data.footerDescription === "string" && data.footerDescription.trim()
        ? data.footerDescription.trim()
        : DEFAULT_ABOUT.footerDescription,
    items,
  };
}

async function saveAboutConfig(config: CompanyAboutConfig): Promise<void> {
  const value = JSON.stringify(config);
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, ABOUT_KEY)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, ABOUT_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: ABOUT_KEY,
      value,
      label: "About Kuber Quant",
      category: "general",
      description: "Home page about section — registration, licences, affiliations, recognitions",
    });
  }
}

export async function getCompanyAboutConfig(): Promise<CompanyAboutConfig> {
  const [setting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, ABOUT_KEY)).limit(1);
  if (setting?.value) {
    try {
      return normalizeConfig(JSON.parse(setting.value));
    } catch {
      /* fall through */
    }
  }
  return {
    ...DEFAULT_ABOUT,
    items: DEFAULT_ABOUT.items.map(i => ({ ...i })),
  };
}

export async function getPublicCompanyAbout() {
  const config = await getCompanyAboutConfig();
  const items = config.items
    .filter(item => item.isActive && item.title)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
    .map(item => ({
      ...item,
      categoryLabel: ABOUT_CATEGORY_LABELS[item.category],
    }));

  const grouped = Object.fromEntries(
    (Object.keys(ABOUT_CATEGORY_LABELS) as AboutCategory[]).map(category => [
      category,
      items.filter(item => item.category === category),
    ]),
  );

  return {
    sectionTitle: config.sectionTitle,
    intro: config.intro,
    footerDescription: config.footerDescription,
    items,
    grouped,
    categoryLabels: ABOUT_CATEGORY_LABELS,
  };
}

export async function updateCompanyAboutMeta(input: {
  sectionTitle?: string;
  intro?: string;
  footerDescription?: string;
}): Promise<CompanyAboutConfig> {
  const config = await getCompanyAboutConfig();
  if (input.sectionTitle !== undefined) {
    config.sectionTitle = input.sectionTitle.trim() || DEFAULT_ABOUT.sectionTitle;
  }
  if (input.intro !== undefined) {
    config.intro = input.intro.trim() || DEFAULT_ABOUT.intro;
  }
  if (input.footerDescription !== undefined) {
    config.footerDescription = input.footerDescription.trim() || DEFAULT_ABOUT.footerDescription;
  }
  await saveAboutConfig(config);
  return config;
}

export async function createAboutItem(
  input: Omit<AboutCredentialItem, "id">,
): Promise<AboutCredentialItem> {
  const config = await getCompanyAboutConfig();
  const nextId = config.items.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const item: AboutCredentialItem = {
    id: nextId,
    category: normalizeCategory(input.category),
    title: input.title.trim(),
    subtitle: input.subtitle?.trim() || undefined,
    description: input.description?.trim() || undefined,
    referenceNumber: input.referenceNumber?.trim() || undefined,
    issuedBy: input.issuedBy?.trim() || undefined,
    issuedDate: input.issuedDate?.trim() || undefined,
    expiryDate: input.expiryDate?.trim() || undefined,
    documentUrl: input.documentUrl?.trim() || undefined,
    sortOrder: input.sortOrder ?? nextId,
    isActive: input.isActive !== false,
  };
  config.items.push(item);
  await saveAboutConfig(config);
  return item;
}

export async function updateAboutItem(
  id: number,
  input: Partial<Omit<AboutCredentialItem, "id">>,
): Promise<AboutCredentialItem | null> {
  const config = await getCompanyAboutConfig();
  const index = config.items.findIndex(item => item.id === id);
  if (index < 0) return null;

  const current = config.items[index];
  const updated: AboutCredentialItem = {
    ...current,
    ...input,
    id,
    category: input.category !== undefined ? normalizeCategory(input.category) : current.category,
    title: input.title !== undefined ? input.title.trim() : current.title,
    subtitle: input.subtitle !== undefined ? (input.subtitle.trim() || undefined) : current.subtitle,
    description: input.description !== undefined ? (input.description.trim() || undefined) : current.description,
    referenceNumber:
      input.referenceNumber !== undefined ? (input.referenceNumber.trim() || undefined) : current.referenceNumber,
    issuedBy: input.issuedBy !== undefined ? (input.issuedBy.trim() || undefined) : current.issuedBy,
    issuedDate: input.issuedDate !== undefined ? (input.issuedDate.trim() || undefined) : current.issuedDate,
    expiryDate: input.expiryDate !== undefined ? (input.expiryDate.trim() || undefined) : current.expiryDate,
    documentUrl: input.documentUrl !== undefined ? (input.documentUrl.trim() || undefined) : current.documentUrl,
    sortOrder: input.sortOrder ?? current.sortOrder,
    isActive: input.isActive ?? current.isActive,
  };
  config.items[index] = updated;
  await saveAboutConfig(config);
  return updated;
}

export async function deleteAboutItem(id: number): Promise<boolean> {
  const config = await getCompanyAboutConfig();
  const before = config.items.length;
  config.items = config.items.filter(item => item.id !== id);
  if (config.items.length === before) return false;
  await saveAboutConfig(config);
  return true;
}
