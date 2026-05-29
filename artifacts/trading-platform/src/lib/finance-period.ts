export type StatsPeriod =
  | "all"
  | "present"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "half_year"
  | "year"
  | "custom";

export const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "day", label: "Today" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
  { value: "half_year", label: "Half-yearly" },
  { value: "year", label: "Annual" },
  { value: "custom", label: "Custom" },
];

/** @deprecated Use PERIOD_OPTIONS — Present is included for all roles. */
export const STAFF_PERIOD_OPTIONS = PERIOD_OPTIONS;

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function defaultFinancePeriod(): StatsPeriod {
  return "day";
}

export function defaultStaffFinancePeriod(): StatsPeriod {
  return "present";
}

export function isPresentPeriod(period?: StatsPeriod): boolean {
  return period === "present";
}

export function buildPeriodQuery(period: StatsPeriod, from?: string, to?: string): string {
  const params = new URLSearchParams();
  if (period && period !== "all") params.set("period", period);
  if (period === "custom") {
    if (from?.trim()) params.set("from", from.trim());
    if (to?.trim()) params.set("to", to.trim());
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function appendPeriodQuery(baseUrl: string, period: StatsPeriod, from?: string, to?: string): string {
  const qs = buildPeriodQuery(period, from, to);
  if (!qs) return baseUrl;
  return baseUrl.includes("?") ? `${baseUrl}&${qs.slice(1)}` : `${baseUrl}${qs}`;
}

export function buildStatsQuery(period: StatsPeriod, customFrom: string, customTo: string): string {
  const params = new URLSearchParams({ period });
  if (period === "custom") {
    if (customFrom.trim()) params.set("from", customFrom.trim());
    if (customTo.trim()) params.set("to", customTo.trim());
  }
  return params.toString();
}

/** e.g. "Today Invested", "Present Available Fiat", "All-time · Fiat deposits" */
export function periodMetricLabel(periodLabel: string, metric: string): string {
  if (!periodLabel?.trim()) return metric;
  if (periodLabel === "Present") {
    const liveMetrics = /balance|available|invested|crypto wallet|fiat wallet/i;
    if (liveMetrics.test(metric)) return `Present ${metric}`;
    return `All-time ${metric}`;
  }
  if (periodLabel === "Today") return `Today ${metric}`;
  return `${periodLabel} · ${metric}`;
}
