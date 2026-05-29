import { useEffect, useState } from "react";
import { publicFetchJson } from "@/lib/api-fetch";
import { resolveBrandLogoUrl } from "@/lib/brand-assets";

export type MaintenanceBranding = {
  titleGold: string;
  titleSilver: string;
  titleGoldColor: string;
  titleSilverColor: string;
  siteName: string;
  logoUrl: string;
};

export type MaintenanceConfig = {
  enabled: boolean;
  description: string;
  notice: string;
  supportEmail: string;
  branding: MaintenanceBranding;
};

const DEFAULT_CONFIG: MaintenanceConfig = {
  enabled: false,
  description: "We are performing scheduled maintenance to improve your experience.",
  notice: "Please check back soon. Thank you for your patience.",
  supportEmail: "",
  branding: {
    titleGold: "Kuber",
    titleSilver: "Quant",
    titleGoldColor: "#D4AF37",
    titleSilverColor: "#C0C0C0",
    siteName: "Kuber Quant",
    logoUrl: "",
  },
};

let cached: MaintenanceConfig | null = null;
let fetchPromise: Promise<MaintenanceConfig> | null = null;

export function invalidateMaintenanceCache() {
  cached = null;
}

export async function fetchMaintenanceConfig(): Promise<MaintenanceConfig> {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;

  fetchPromise = Promise.race([
    publicFetchJson<MaintenanceConfig>("/maintenance"),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error("Maintenance config timeout")), 8000);
    }),
  ])
    .then((data) => {
      cached = {
        ...DEFAULT_CONFIG,
        ...data,
        branding: {
          ...DEFAULT_CONFIG.branding,
          ...data.branding,
          logoUrl: resolveBrandLogoUrl(data.branding?.logoUrl),
        },
      };
      return cached;
    })
    .catch(() => DEFAULT_CONFIG)
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useMaintenanceMode(pollMs = 60_000) {
  const [config, setConfig] = useState<MaintenanceConfig>(cached ?? DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let active = true;

    const load = () => {
      fetchMaintenanceConfig().then((data) => {
        if (active) {
          setConfig(data);
          setIsLoading(false);
        }
      });
    };

    load();
    const timer = window.setInterval(load, pollMs);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [pollMs]);

  return { config, isLoading, enabled: config.enabled };
}
