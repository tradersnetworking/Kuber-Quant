import { apiPath, authFetch, authFetchJson } from "@/lib/token-store";

export async function fetchAgreementPdfBlob(agreementId: number, mode: "view" | "download" = "view"): Promise<Blob> {
  const suffix = mode === "view" ? "view" : "download";
  const res = await authFetch(apiPath(`/agreements/my/${agreementId}/${suffix}`));
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load agreement PDF");
  }
  return res.blob();
}

export async function fetchAgreementUserSettings() {
  return authFetchJson<{ userDownloadEnabled: boolean }>("/agreements/settings/public");
}
