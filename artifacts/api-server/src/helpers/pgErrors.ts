/** True when Postgres reports a missing table/relation (schema not migrated yet). */
export function isMissingRelationError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01") return true;
  const msg = String((err as Error)?.message ?? err);
  return /relation .+ does not exist/i.test(msg);
}
