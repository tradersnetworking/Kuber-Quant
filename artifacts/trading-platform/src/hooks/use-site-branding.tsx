import { useEffect, useState } from "react";
import { DEFAULT_BRAND_LOGO_URL, resolveBrandLogoUrl } from "@/lib/brand-assets";

export type SiteBranding = {
  titleGold: string;
  titleSilver: string;
  titleGoldColor: string;
  titleSilverColor: string;
  siteName: string;
  tagline: string;
  logoUrl: string;
};

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  titleGold: "Kuber",
  titleSilver: "Quant",
  titleGoldColor: "#D4AF37",
  titleSilverColor: "#C0C0C0",
  siteName: "Kuber Quant",
  tagline: "Where Wealth Multiplies",
  logoUrl: "",
};

let cachedBranding: SiteBranding | null = null;
let brandingPromise: Promise<SiteBranding> | null = null;

async function fetchSiteBranding(): Promise<SiteBranding> {
  if (cachedBranding) return cachedBranding;
  if (brandingPromise) return brandingPromise;

  brandingPromise = fetch("/api/branding")
    .then(async (res) => {
      if (!res.ok) throw new Error("Failed to load branding");
      return res.json() as Promise<SiteBranding>;
    })
    .then((data) => {
      cachedBranding = {
        ...DEFAULT_SITE_BRANDING,
        ...data,
        logoUrl: resolveBrandLogoUrl(data.logoUrl),
      };
      return cachedBranding;
    })
    .catch(() => DEFAULT_SITE_BRANDING)
    .finally(() => {
      brandingPromise = null;
    });

  return brandingPromise;
}

export function invalidateSiteBrandingCache() {
  cachedBranding = null;
}

export function useSiteBranding() {
  const [branding, setBranding] = useState<SiteBranding>(cachedBranding ?? DEFAULT_SITE_BRANDING);

  useEffect(() => {
    let active = true;
    fetchSiteBranding().then((data) => {
      if (active) setBranding(data);
    });
    return () => {
      active = false;
    };
  }, []);

  return branding;
}
