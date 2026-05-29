import crypto from "crypto";
import { logger } from "../lib/logger";

export type SiemEventCategory = "auth" | "financial" | "admin" | "security" | "audit";

export type SiemEvent = {
  category: SiemEventCategory;
  action: string;
  severity: "info" | "warning" | "high" | "critical";
  timestamp: string;
  userId?: number;
  role?: string;
  ipAddress?: string;
  entity?: string;
  entityId?: number;
  riskScore?: number;
  flags?: string[];
  metadata?: Record<string, unknown>;
};

function isEnabled(): boolean {
  if (process.env.SIEM_EXPORT_ENABLED === "false") return false;
  return Boolean(process.env.SIEM_WEBHOOK_URL?.trim());
}

function signBody(body: string): string | undefined {
  const secret = process.env.SIEM_WEBHOOK_SECRET?.trim();
  if (!secret) return undefined;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Fire-and-forget export to SIEM / log aggregator (Datadog, Splunk HTTP collector, etc.). */
export function emitSiemEvent(event: Omit<SiemEvent, "timestamp"> & { timestamp?: string }): void {
  if (!isEnabled()) return;

  const payload: SiemEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const url = process.env.SIEM_WEBHOOK_URL!.trim();
  const body = JSON.stringify({
    source: "kuber-quant",
    environment: process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    ...payload,
  });

  const signature = signBody(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Kuber-Siem-Category": payload.category,
    "X-Kuber-Siem-Action": payload.action,
    "X-Kuber-Siem-Severity": payload.severity,
  };
  if (signature) headers["X-Kuber-Siem-Signature"] = signature;

  void fetch(url, { method: "POST", headers, body })
    .then(res => {
      if (!res.ok) {
        logger.warn({ action: payload.action, status: res.status }, "SIEM export returned non-OK status");
      }
    })
    .catch(err => {
      logger.warn({ err, action: payload.action }, "SIEM export failed");
    });
}

export function siemFromAudit(opts: {
  action: string;
  userId?: number;
  role?: string;
  entity?: string;
  entityId?: number;
  ipAddress?: string;
  details?: Record<string, unknown>;
}): void {
  const financialActions = ["wallet_adjust", "withdrawal", "deposit", "transfer"];
  const isFinancial = financialActions.some(a => opts.action.includes(a));
  emitSiemEvent({
    category: isFinancial ? "financial" : "admin",
    action: opts.action,
    severity: isFinancial ? "warning" : "info",
    userId: opts.userId,
    role: opts.role,
    entity: opts.entity,
    entityId: opts.entityId,
    ipAddress: opts.ipAddress,
    metadata: opts.details,
  });
}
