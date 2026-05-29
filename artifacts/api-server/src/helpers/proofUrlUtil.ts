/** Normalize stored proof paths to authenticated API URLs for staff preview. */
export function normalizeProofUrl(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;

  const p = stored.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/api/uploads-secure/")) return p;

  const match = p.match(/(?:^|\/)payment_proofs\/([^/?#]+)/);
  if (match?.[1]) {
    return `/api/uploads-secure/payment_proofs/${match[1]}`;
  }

  if (p.startsWith("/uploads/payment_proofs/")) {
    return p.replace("/uploads/payment_proofs/", "/api/uploads-secure/payment_proofs/");
  }

  return p.startsWith("/") ? p : `/api/uploads-secure/payment_proofs/${p}`;
}
