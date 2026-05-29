/** Coerce API body values for Drizzle numeric columns — never pass String(null) === "null". */
export function toNumericColumn(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return String(n);
}

export function toNumericColumnOrDefault(value: unknown, fallback: string): string {
  return toNumericColumn(value) ?? fallback;
}
