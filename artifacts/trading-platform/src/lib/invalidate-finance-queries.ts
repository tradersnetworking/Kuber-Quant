import type { QueryClient } from "@tanstack/react-query";
import { FINANCE_POLL_MS, pollQueryOptions } from "@/lib/query-config";

/** How often open dashboards poll wallet / transaction data. */
export const FINANCE_QUERY_POLL_MS = FINANCE_POLL_MS;

const FINANCE_QUERY_KEYS = [
  ["/api/wallet"],
  ["/api/dashboard/summary"],
  ["/api/dashboard/recent-activity"],
  ["/api/dashboard/portfolio-chart"],
  ["/api/dashboard/monthly-returns"],
  ["/api/investments/maturity-payout/pending"],
  ["/api/wallet/history"],
  ["/api/wallet/upcoming"],
  ["/api/manager/stats"],
  ["/api/manager/analytics"],
  ["/api/manager/transactions"],
  ["/api/admin/transactions"],
  ["/api/admin/transactions/upcoming"],
  ["/api/admin/ledger"],
  ["/api/admin/stats"],
  ["/api/admin/analytics"],
  ["/api/super-admin/stats"],
  ["/api/support-team/transactions"],
  ["/api/support-team/transactions/upcoming"],
  ["/api/support-team/ledger"],
  ["/api/support-team/investments"],
  ["/api/support-team/roi/payouts"],
  ["/api/support-team/algo-subscriptions"],
  ["/api/support-team/ea-subscriptions"],
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

export const financeQueryOptions = pollQueryOptions(FINANCE_QUERY_POLL_MS);
