import type { User } from "@workspace/api-client-react";

/** Resolve /api/... path respecting Vite BASE_URL (e.g. subpath deploys). */
export function apiPath(path: string): string {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}/api${suffix}`;
}

let refreshInFlight: Promise<string | null> | null = null;

export function getStoredToken(): string | null {
  return localStorage.getItem("token");
}

export function isTokenExpired(token: string, bufferMs = 60_000): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]!));
    if (!payload.exp) return false;
    return payload.exp * 1000 < Date.now() + bufferMs;
  } catch {
    return true;
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const res = await fetch(apiPath("/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;

      const data = await res.json();
      if (data.token) localStorage.setItem("token", data.token);
      if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
      if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
      return data.token as string;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

type AuthFailureHandler = () => void;
let onAuthFailure: AuthFailureHandler | null = null;

export function setAuthFailureHandler(handler: AuthFailureHandler | null) {
  onAuthFailure = handler;
}

export function handleAuthFailure() {
  clearSession();
  onAuthFailure?.();
}

/** Fetch with bearer token; auto-refreshes once on 401. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  const isRefreshCall = url.includes("/api/auth/refresh");

  const buildHeaders = (token: string | null) => {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return headers;
  };

  let token = getStoredToken();

  if (token && isTokenExpired(token) && !isRefreshCall) {
    const refreshed = await refreshAccessToken();
    token = refreshed || token;
  }

  let res = await fetch(input, { ...init, headers: buildHeaders(token) });

  if (res.status === 401 && !isRefreshCall) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(input, { ...init, headers: buildHeaders(newToken) });
    } else {
      handleAuthFailure();
    }
  }

  return res;
}

export async function authFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(apiPath(path), init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
