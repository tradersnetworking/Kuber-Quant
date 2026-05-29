import { useEffect, useState } from "react";
import { publicFetchJson } from "@/lib/api-fetch";

export type ScreenshotProtectionConfig = {
  enabled: boolean;
  watermarkEnabled: boolean;
  watermarkOpacity: number;
};

const DEFAULT_CONFIG: ScreenshotProtectionConfig = {
  enabled: true,
  watermarkEnabled: true,
  watermarkOpacity: 0.03,
};

let cached: ScreenshotProtectionConfig | null = null;
let fetchPromise: Promise<ScreenshotProtectionConfig> | null = null;

export function invalidateScreenshotProtectionCache() {
  cached = null;
}

export async function fetchScreenshotProtectionConfig(): Promise<ScreenshotProtectionConfig> {
  if (cached) return cached;
  if (fetchPromise) return fetchPromise;

  fetchPromise = publicFetchJson<ScreenshotProtectionConfig>("/branding/security")
    .then((data) => {      const opacity = Number(data.watermarkOpacity);
      cached = {
        ...DEFAULT_CONFIG,
        ...data,
        watermarkOpacity: Number.isFinite(opacity) && opacity > 0 && opacity <= 0.15 ? opacity : DEFAULT_CONFIG.watermarkOpacity,
      };
      return cached;
    })
    .catch(() => DEFAULT_CONFIG)
    .finally(() => {
      fetchPromise = null;
    });

  return fetchPromise;
}

export function useScreenshotProtectionSetting(pollMs = 60_000) {
  const [config, setConfig] = useState<ScreenshotProtectionConfig>(cached ?? DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let active = true;

    const load = () => {
      fetchScreenshotProtectionConfig().then((data) => {
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
