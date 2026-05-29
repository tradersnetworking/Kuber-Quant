import { Router } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "@workspace/db/orm";

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
  site_tagline: "Precision. Profit. Performance.",
  logo_url: "/kuber-quant-logo.png",
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
    logoUrl: map.logo_url.trim() || DEFAULTS.logo_url,
  });
});

router.get("/partners", async (_req, res) => {
  const { getActivePartners } = await import("../helpers/partnersCatalog");
  res.json(await getActivePartners());
});

router.get("/about", async (_req, res) => {
  const { getPublicCompanyAbout } = await import("../helpers/companyAbout");
  res.json(await getPublicCompanyAbout());
});

router.get("/public-stats", async (_req, res) => {
  const { getPublicPlatformStats } = await import("../helpers/publicPlatformStats");
  res.json(await getPublicPlatformStats());
});

router.get("/maintenance", async (_req, res) => {
  const { getSiteSettings } = await import("../helpers/siteSettings");
  const settings = await getSiteSettings([
    "maintenance_mode",
    "maintenance_description",
    "maintenance_notice",
    "site_title_gold",
    "site_title_silver",
    "site_title_gold_color",
    "site_title_silver_color",
    "site_name",
    "logo_url",
    "support_email",
  ]);

  const defaults = {
    maintenance_description: "We are performing scheduled maintenance to improve your experience.",
    maintenance_notice: "Please check back soon. Thank you for your patience.",
  };

  res.json({
    enabled: settings.maintenance_mode === "true",
    description: settings.maintenance_description?.trim() || defaults.maintenance_description,
    notice: settings.maintenance_notice?.trim() || defaults.maintenance_notice,
    supportEmail: settings.support_email?.trim() || "",
    branding: {
      titleGold: settings.site_title_gold || "Kuber",
      titleSilver: settings.site_title_silver || "Quant",
      titleGoldColor: settings.site_title_gold_color || "#D4AF37",
      titleSilverColor: settings.site_title_silver_color || "#C0C0C0",
      siteName: settings.site_name || "Kuber Quant",
      logoUrl: settings.logo_url?.trim() || "/kuber-quant-logo.png",
    },
  });
});

router.get("/security", async (_req, res) => {
  const { getSiteSettings } = await import("../helpers/siteSettings");
  const settings = await getSiteSettings([
    "screenshot_protection_enabled",
    "screenshot_watermark_enabled",
    "screenshot_watermark_opacity",
  ]);

  const opacityRaw = parseFloat(settings.screenshot_watermark_opacity || "0.03");
  const watermarkOpacity = Number.isFinite(opacityRaw) && opacityRaw > 0 && opacityRaw <= 0.15
    ? opacityRaw
    : 0.03;

  res.json({
    enabled: settings.screenshot_protection_enabled !== "false",
    watermarkEnabled: settings.screenshot_watermark_enabled !== "false",
    watermarkOpacity,
  });
});

export default router;
