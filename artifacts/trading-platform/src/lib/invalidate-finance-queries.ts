import type { QueryClient } from "@tanstack/react-query";

/** How often open dashboards poll wallet / transaction data. */
export const FINANCE_QUERY_POLL_MS = 30_000;

const FINANCE_QUERY_KEYS = [
  ["/api/wallet"],
  ["/api/dashboard/summary"],
  ["/api/dashboard/recent-activity"],
  ["/api/dashboard/portfolio-chart"],
  ["/api/wallet/history"],
  ["/api/manager/stats"],
  ["/api/manager/analytics"],
  ["/api/manager/transactions"],
  ["/api/admin/stats"],
  ["/api/admin/analytics"],
] as const;

export function isFinanceNotification(category?: string, title?: string): boolean {
  const c = (category || "").toLowerCase();
  if (c === "deposit" || c === "withdrawal") return true;
  const t = (title || "").toLowerCase();
  return t.includes("deposit") || t.includes("withdrawal");
}

/** Invalidate cached wallet, dashboard, manager, and support finance views. */
export function invalidateFinanceQueries(qc: QueryClient, userId?: number) {
  for (const queryKey of FINANCE_QUERY_KEYS) {
    qc.invalidateQueries({ queryKey: [...queryKey] });
  }

  if (userId != null) {
    qc.invalidateQueries({ queryKey: ["/api/support-team/users/status", userId] });
    qc.invalidateQueries({ queryKey: ["/api/manager/clients", userId] });
  }
}

export const financeQueryOptions = {
  refetchInterval: FINANCE_QUERY_POLL_MS,
  staleTime: 10_000,
} as const;
