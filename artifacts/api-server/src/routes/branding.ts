import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const router = Router();

const BRANDING_KEYS = [
  "site_title_gold",
  "site_title_silver",
  "site_title_gold_color",
  "site_title_silver_color",
  "site_name",
  "site_tagline",
  "logo_url",
] as const;

const DEFAULTS: Record<(typeof BRANDING_KEYS)[number], string> = {
  site_title_gold: "Kuber",
  site_title_silver: "Quant",
  site_title_gold_color: "#D4AF37",
  site_title_silver_color: "#C0C0C0",
  site_name: "Kuber Quant",
  site_tagline: "Where Wealth Multiplies",
  logo_url: "",
};

router.get("/branding", async (_req, res) => {
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(inArray(siteSettingsTable.key, [...BRANDING_KEYS]));

  const map = { ...DEFAULTS };
  for (const row of rows) {
    if (row.key in map) {
      map[row.key as keyof typeof map] = row.value;
    }
  }

  res.json({
    titleGold: map.site_title_gold,
    titleSilver: map.site_title_silver,
    titleGoldColor: map.site_title_gold_color,
    titleSilverColor: map.site_title_silver_color,
    siteName: map.site_name,
    tagline: map.site_tagline,
    logoUrl: map.logo_url,
  });
});

router.get("/partners", async (_req, res) => {
  const { getActivePartners } = await import("../helpers/partnersCatalog");
  res.json(await getActivePartners());
});

export default router;
