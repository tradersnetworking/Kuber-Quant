const STORAGE_KEY = "kq_device_fp";

/** Stable anonymous device ID for login security tracking (not hardware fingerprinting). */
export function getDeviceFingerprint(): string {
  try {
    let fp = localStorage.getItem(STORAGE_KEY);
    if (!fp) {
      fp = crypto.randomUUID();
      localStorage.setItem(STORAGE_KEY, fp);
    }
    return fp;
  } catch {
    return "anonymous";
  }
}
