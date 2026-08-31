/** True when Postgres reports a missing table/relation (schema not migrated yet). */
export function isMissingRelationError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "42P01") return true;
  const msg = String((err as Error)?.message ?? err);
  return /relation .+ does not exist/i.test(msg);
}

/** True when the app cannot reach Postgres (network, auth, or server down). */
export function isConnectionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code;
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "EAI_AGAIN") {
    return true;
  }
  const msg = String((err as Error)?.message ?? err);
  return /connect ECONNREFUSED|connection terminated|timeout expired|getaddrinfo ENOTFOUND/i.test(msg);
}
