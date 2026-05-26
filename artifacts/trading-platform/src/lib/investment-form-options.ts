import type { InvestmentPlan } from "@workspace/api-client-react";

export type InvestmentFormType = "manual" | "algo" | "copy" | "ea";

export const INVESTMENT_TYPE_OPTIONS: { value: InvestmentFormType; label: string }[] = [
  { value: "manual", label: "Manual / Wealth Plan" },
  { value: "algo", label: "Algo Trading" },
  { value: "copy", label: "Copy Trading" },
  { value: "ea", label: "EA Strategy" },
];

export const INVESTMENT_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "BTC", label: "BTC — Bitcoin" },
  { value: "ETH", label: "ETH — Ethereum" },
  { value: "USDT", label: "USDT — Tether" },
] as const;

export type InvestmentCurrency = (typeof INVESTMENT_CURRENCY_OPTIONS)[number]["value"];

/** Plan categories shown for each investment type. `null` = all active plans. */
const TYPE_PLAN_CATEGORIES: Record<InvestmentFormType, string[] | null> = {
  manual: null,
  algo: ["growth", "premium"],
  copy: ["starter", "growth"],
  ea: ["premium", "elite"],
};

export function filterPlansForInvestmentType(
  plans: InvestmentPlan[] | undefined,
  type: InvestmentFormType,
): InvestmentPlan[] {
  const active = (plans || []).filter(p => p.isActive !== false);
  const categories = TYPE_PLAN_CATEGORIES[type];
  if (!categories) return active;
  return active.filter(p => categories.includes(String(p.category || "").toLowerCase()));
}

export const PLAN_TYPE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  annual: "Annual",
};
