/** Shared React Query tuning — fewer polls, less background traffic. */

export const DEFAULT_STALE_MS = 60_000;
export const FINANCE_POLL_MS = 120_000;
export const LAYOUT_POLL_MS = 180_000;
export const NOTIFICATION_POLL_MS = 60_000;
export const STAFF_POLL_MS = 120_000;

export const lightQueryOptions = {
  staleTime: DEFAULT_STALE_MS,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: false,
} as const;

/** Poll on an interval only while the tab is visible. */
export function pollQueryOptions(intervalMs: number) {
  return {
    ...lightQueryOptions,
    refetchInterval: (query: { state: { fetchFailureCount: number } }) => {
      if (typeof document !== "undefined" && document.hidden) return false;
      const failures = query.state.fetchFailureCount;
      if (failures > 0) return Math.min(intervalMs * 4, 600_000);
      return intervalMs;
    },
  } as const;
}

export function isRateLimitedError(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (status === 429) return true;
  const message = error instanceof Error ? error.message : String(error ?? "");
  return message.includes("Too many requests");
}
