import { apiPath, authFetch } from "@/lib/token-store";

const EXT_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

export function mimeFromFilename(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
  return EXT_MIME[ext] || "application/octet-stream";
}

/** Normalize stored upload paths to an authenticated API URL. */
export function resolveSecureUploadUrl(storedUrl: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  let path = storedUrl.trim();

  // Bare filename or nested path without leading slash
  const folderMatch = path.match(/(?:^|\/)(payment_proofs|kyc_documents|mail_attachments)\/([^/?#]+)$/);
  if (folderMatch && !path.startsWith("/api/") && !path.startsWith("http")) {
    return `${base}/api/uploads-secure/${folderMatch[1]}/${folderMatch[2]}`.replace(/([^:]\/)\/+/g, "$1");
  }

  path = path.replace(
    /^\/uploads\/(payment_proofs|kyc_documents|mail_attachments)\//,
    "/uploads-secure/$1/",
  );

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  if (path.startsWith("/api/")) {
    return `${base}${path}`.replace(/([^:]\/)\/+/g, "$1");
  }
  if (path.startsWith("/uploads-secure/")) {
    return `${base}/api${path}`.replace(/([^:]\/)\/+/g, "$1");
  }
  return apiPath(path.replace(/^\//, ""));
}

export function filenameFromStoredUrl(storedUrl: string): string {
  const clean = storedUrl.split("?")[0]!;
  return clean.slice(clean.lastIndexOf("/") + 1) || "file";
}

export type SecureUploadPreview = {
  blobUrl: string;
  mimeType: string;
  filename: string;
};

/** Fetch a protected upload with the session token. Caller must revoke blobUrl when done. */
export async function fetchSecureUpload(storedUrl: string): Promise<SecureUploadPreview> {
  const url = resolveSecureUploadUrl(storedUrl);
  const res = await authFetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Failed to load file (${res.status})`);
  }

  const filename = filenameFromStoredUrl(storedUrl);
  const headerType = res.headers.get("Content-Type")?.split(";")[0]?.trim();
  const mimeType = headerType && headerType !== "application/octet-stream"
    ? headerType
    : mimeFromFilename(filename);

  const buffer = await res.arrayBuffer();
  const blob = new Blob([buffer], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);

  return { blobUrl, mimeType, filename };
}

/** Force a download of a protected upload to the user's device. */
export async function downloadSecureUpload(storedUrl: string, downloadName?: string): Promise<void> {
  const { blobUrl, filename } = await fetchSecureUpload(storedUrl);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.download = downloadName || filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}

/** Open in a new tab (fallback). */
export async function openSecureUploadInTab(storedUrl: string): Promise<void> {
  const { blobUrl, mimeType, filename } = await fetchSecureUpload(storedUrl);
  const anchor = document.createElement("a");
  anchor.href = blobUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  if (!mimeType.startsWith("image/") && mimeType !== "application/pdf") {
    anchor.download = filename;
  }
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
}
