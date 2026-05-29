const STORAGE_KEY = "kuber_trusted_device";

export function getTrustedDeviceToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveTrustedDeviceToken(token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch { /* ignore */ }
}

export function clearTrustedDeviceToken() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
