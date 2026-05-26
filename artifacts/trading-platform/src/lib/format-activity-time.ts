import { formatDistanceToNow } from "date-fns";

/** Safe relative time — invalid dates return empty string instead of crashing render. */
export function formatActivityTime(value: unknown): string {
  if (!value) return "";
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}
