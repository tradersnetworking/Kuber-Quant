import crypto from "crypto";
import { logger } from "../lib/logger";
import { emitPartnerWebhooks } from "./partnerWebhookService";

export type N8nEventType =
  | "user.registered"
  | "deposit.submitted"
  | "deposit.approved"
  | "withdrawal.submitted"
  | "withdrawal.approved"
  | "kyc.submitted"
  | "kyc.approved"
  | "kyc.rejected"
  | "investment.created"
  | "ticket.created"
  | "promoter.application"
  | "promoter.approved"
  | "promoter.rejected";

export type N8nEventPayload = {
  event: N8nEventType;
  timestamp: string;
  data: Record<string, unknown>;
};

function isEnabled(): boolean {
  if (process.env.N8N_WEBHOOK_ENABLED === "false") return false;
  return Boolean(process.env.N8N_WEBHOOK_URL?.trim());
}

function signBody(body: string): string | undefined {
  const secret = process.env.N8N_WEBHOOK_SECRET?.trim();
  if (!secret) return undefined;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/** Fire-and-forget webhook to n8n automation endpoint. */
export function emitN8nEvent(event: N8nEventType, data: Record<string, unknown>): void {
  if (!isEnabled()) return;

  const url = process.env.N8N_WEBHOOK_URL!.trim();
  const payload: N8nEventPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const body = JSON.stringify(payload);
  const signature = signBody(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Kuber-Event": event,
  };
  if (signature) headers["X-Kuber-Signature"] = signature;

  void fetch(url, { method: "POST", headers, body })
    .then(res => {
      if (!res.ok) {
        logger.warn({ event, status: res.status }, "n8n webhook returned non-OK status");
      }
    })
    .catch(err => {
      logger.warn({ err, event }, "n8n webhook delivery failed");
    });

  emitPartnerWebhooks(event, data);
}
