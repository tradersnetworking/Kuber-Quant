/**
 * Unified API access for the trading platform.
 * Always use these helpers instead of raw fetch("/api/...") so subpath deploys (BASE_URL) work.
 */
import {
  apiPath,
  authFetch,
  authFetchJson,
  getStoredToken,
  getStoredUser,
  refreshAccessToken,
  clearSession,
  setAuthFailureHandler,
  setSessionReplacedHandler,
} from "./token-store";

export {
  apiPath,
  authFetch,
  authFetchJson,
  getStoredToken,
  getStoredUser,
  refreshAccessToken,
  clearSession,
  setAuthFailureHandler,
  setSessionReplacedHandler,
};

/** Public (unauthenticated) JSON fetch — respects Vite BASE_URL. */
export async function publicFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(apiPath(path), {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

/** Fire-and-forget public request (e.g. logout beacon). */
export function publicFetch(path: string, init: RequestInit = {}): void {
  void fetch(apiPath(path), init);
}
