const STORAGE_KEY = "kq-referral-code";

export function storeReferralCode(code: string) {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return;
  try {
    localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // ignore
  }
}

export function readReferralCode(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearReferralCode() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Read ?ref= from URL and persist for signup attribution. */
export function captureReferralFromSearch(search: string) {
  const ref = new URLSearchParams(search.startsWith("?") ? search : `?${search}`).get("ref");
  if (ref) storeReferralCode(ref);
}

export function buildReferralLink(code: string, origin = window.location.origin) {
  return `${origin}/register?ref=${encodeURIComponent(code.trim().toUpperCase())}`;
}
