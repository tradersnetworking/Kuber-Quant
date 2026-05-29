import type { Response } from "express";

const SCHEMA_DRIFT_MARKERS = [
  "does not exist",
  "42703",
  "Failed query",
  "column",
  "relation",
];

export function isSchemaDriftError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const lower = msg.toLowerCase();
  return SCHEMA_DRIFT_MARKERS.some((m) => lower.includes(m.toLowerCase()));
}

export function respondSchemaDrift(res: Response, err: unknown): boolean {
  if (!isSchemaDriftError(err)) return false;
  const detail = err instanceof Error ? err.message : String(err);
  res.status(503).json({
    error: "Database schema is out of date. Restart the API after running pnpm db:push, or contact platform ops.",
    code: "SCHEMA_DRIFT",
    detail,
  });
  return true;
}
