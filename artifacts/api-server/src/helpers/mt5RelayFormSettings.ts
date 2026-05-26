import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_MT5_RELAY_FORM_CONFIG,
  mergeMt5RelayFormConfig,
  type Mt5RelayFormConfig,
} from "../lib/mt5RelayFormConfig";

const CONFIG_KEY = "mt5_relay_form_config";

export async function getMt5RelayFormConfig(): Promise<Mt5RelayFormConfig> {
  const [setting] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, CONFIG_KEY))
    .limit(1);
  if (!setting?.value) return DEFAULT_MT5_RELAY_FORM_CONFIG;
  try {
    return mergeMt5RelayFormConfig(JSON.parse(setting.value));
  } catch {
    return DEFAULT_MT5_RELAY_FORM_CONFIG;
  }
}

export async function saveMt5RelayFormConfig(config: Mt5RelayFormConfig): Promise<Mt5RelayFormConfig> {
  const merged = mergeMt5RelayFormConfig(config);
  const value = JSON.stringify(merged);
  const [existing] = await db
    .select()
    .from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, CONFIG_KEY))
    .limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, CONFIG_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: CONFIG_KEY,
      value,
      label: "MT4/MT5 Request Form Fields",
      category: "mt5",
    });
  }
  return merged;
}
