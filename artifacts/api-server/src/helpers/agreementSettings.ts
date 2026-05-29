import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { getSiteSetting, invalidateSiteSettingsCache } from "./siteSettings";

const USER_DOWNLOAD_KEY = "agreements_user_download_enabled";

export type AgreementSettings = {
  userDownloadEnabled: boolean;
};

export async function getAgreementSettings(): Promise<AgreementSettings> {
  const raw = await getSiteSetting(USER_DOWNLOAD_KEY, "true");
  return { userDownloadEnabled: raw !== "false" && raw !== "0" };
}

export async function updateAgreementSettings(
  patch: Partial<AgreementSettings>,
): Promise<AgreementSettings> {
  if (patch.userDownloadEnabled !== undefined) {
    const value = patch.userDownloadEnabled ? "true" : "false";
    const [existing] = await db
      .select()
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, USER_DOWNLOAD_KEY))
      .limit(1);
    if (existing) {
      await db
        .update(siteSettingsTable)
        .set({ value })
        .where(eq(siteSettingsTable.key, USER_DOWNLOAD_KEY));
    } else {
      await db.insert(siteSettingsTable).values({
        key: USER_DOWNLOAD_KEY,
        value,
        label: "User Agreement Downloads",
        category: "legal",
        description: "When enabled, users see download buttons on their legal agreements page",
      });
    }
    invalidateSiteSettingsCache();
  }
  return getAgreementSettings();
}

export async function assertUserAgreementDownloadAllowed(): Promise<void> {
  const settings = await getAgreementSettings();
  if (!settings.userDownloadEnabled) {
    throw new Error("Agreement downloads are currently disabled");
  }
}
