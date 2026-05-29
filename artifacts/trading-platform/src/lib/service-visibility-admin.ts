import { staffFetch } from "@/lib/staff-api";
import { publicFetchJson } from "@/lib/api-fetch";
import {
  DEFAULT_SERVICE_VISIBILITY,
  SERVICE_KEYS,
  type ServiceKey,
  type ServiceVisibilityItem,
} from "@/lib/service-catalog";

type VisibilityResponse = { services: ServiceVisibilityItem[] };

const SETTING_KEY = "service_visibility";

function sanitize(list: unknown): ServiceVisibilityItem[] {
  const known = new Set<string>(SERVICE_KEYS);
  const seen = new Set<string>();
  const out: ServiceVisibilityItem[] = [];
  if (Array.isArray(list)) {
    for (const it of list) {
      const key = (it as ServiceVisibilityItem)?.key;
      if (typeof key === "string" && known.has(key) && !seen.has(key)) {
        out.push({ key: key as ServiceKey, enabled: (it as ServiceVisibilityItem).enabled !== false });
        seen.add(key);
      }
    }
  }
  for (const key of SERVICE_KEYS) {
    if (!seen.has(key)) out.push({ key, enabled: true });
  }
  return out;
}

function parseSettingValue(raw: string | undefined | null): ServiceVisibilityItem[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return sanitize(parsed);
  } catch {
    return null;
  }
}

/** Load service visibility — tries dedicated routes, then generic site settings. */
export async function loadServiceVisibilityAdmin(): Promise<ServiceVisibilityItem[]> {
  const dedicatedPaths = ["/super-admin/service-visibility", "/admin/service-visibility"];
  for (const path of dedicatedPaths) {
    try {
      const data = await staffFetch<VisibilityResponse>(path);
      if (Array.isArray(data.services) && data.services.length > 0) {
        return sanitize(data.services);
      }
    } catch {
      /* try next */
    }
  }

  try {
    const data = await publicFetchJson<VisibilityResponse>("/service-visibility");
    if (Array.isArray(data.services) && data.services.length > 0) {
      return sanitize(data.services);
    }
  } catch {
    /* try site settings */
  }

  try {
    const rows = await staffFetch<Array<{ key: string; value: string }>>("/admin/site-settings");
    const parsed = parseSettingValue(rows.find(r => r.key === SETTING_KEY)?.value);
    if (parsed) return parsed;
  } catch {
    /* fall through */
  }

  return DEFAULT_SERVICE_VISIBILITY;
}

/** Save service visibility — tries dedicated routes, then generic site settings. */
export async function saveServiceVisibilityAdmin(
  services: ServiceVisibilityItem[],
): Promise<ServiceVisibilityItem[]> {
  const body = JSON.stringify({ services });
  const dedicatedPaths = ["/super-admin/service-visibility", "/admin/service-visibility"];

  for (const path of dedicatedPaths) {
    try {
      const data = await staffFetch<VisibilityResponse>(path, {
        method: "PATCH",
        body,
      });
      if (Array.isArray(data.services) && data.services.length > 0) {
        return sanitize(data.services);
      }
    } catch {
      /* try next */
    }
  }

  await staffFetch("/admin/site-settings", {
    method: "PATCH",
    body: JSON.stringify({ [SETTING_KEY]: JSON.stringify(sanitize(services)) }),
  });

  return sanitize(services);
}
