import type { TFunction } from "i18next";

/** Translate API status values (deposit, pending, etc.) */
export function translateStatus(t: TFunction, value?: string | null): string {
  if (!value) return "—";
  const key = value.toLowerCase().replace(/\s+/g, "");
  const mapped: Record<string, string> = {
    approved: "status.approved",
    pending: "status.pending",
    rejected: "status.rejected",
    deposit: "status.deposit",
    withdrawal: "status.withdrawal",
    withdraw: "status.withdrawal",
    open: "status.open",
    closed: "status.closed",
    resolved: "status.resolved",
    inprogress: "status.inProgress",
    completed: "status.completed",
    cancelled: "status.cancelled",
    canceled: "status.cancelled",
    failed: "status.failed",
  };
  const i18nKey = mapped[key];
  return i18nKey ? t(i18nKey, value) : value;
}

/** Translate ticket priority values */
export function translatePriority(t: TFunction, value?: string | null): string {
  if (!value) return "—";
  const key = value.toLowerCase();
  const i18nKey = `priority.${key}`;
  return t(i18nKey, value);
}

/** Translate ticket category values */
export function translateCategory(t: TFunction, value?: string | null): string {
  if (!value) return "—";
  const key = value.toLowerCase();
  const mapped: Record<string, string> = {
    general: "categories.general",
    query: "categories.query",
    complaint: "categories.complaint",
    account: "categories.account",
    payment: "categories.payment",
    trading: "categories.trading",
  };
  const i18nKey = mapped[key];
  return i18nKey ? t(i18nKey, value) : value;
}

/** Format date using current locale */
export function formatLocaleDate(date: Date | string, locale?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale || undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
