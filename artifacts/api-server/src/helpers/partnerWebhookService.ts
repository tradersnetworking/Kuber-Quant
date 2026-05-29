import crypto from "crypto";
import { db, partnerApiKeysTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";
import { logger } from "../lib/logger";
import type { N8nEventType } from "./n8nWebhookService";

export type PartnerWebhookPayload = {
  event: N8nEventType;
  timestamp: string;
  data: Record<string, unknown>;
};

function signBody(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function parseEvents(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Deliver platform events to partner webhook URLs subscribed to the event type. */
export function emitPartnerWebhooks(event: N8nEventType, data: Record<string, unknown>): void {
  if (process.env.PARTNER_WEBHOOKS_ENABLED === "false") return;

  void (async () => {
    const rows = await db.select().from(partnerApiKeysTable).where(eq(partnerApiKeysTable.isActive, true));
    const payload: PartnerWebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const body = JSON.stringify(payload);

    for (const row of rows) {
      if (!row.webhookUrl?.trim()) continue;
      const events = parseEvents(row.webhookEvents);
      if (events.length > 0 && !events.includes(event)) continue;

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Kuber-Event": event,
        "X-Kuber-Partner-Id": String(row.id),
      };
      if (row.webhookSecret) {
        headers["X-Kuber-Signature"] = signBody(body, row.webhookSecret);
      }

      try {
        const res = await fetch(row.webhookUrl.trim(), { method: "POST", headers, body });
        if (!res.ok) {
          logger.warn({ event, partnerId: row.id, status: res.status }, "Partner webhook non-OK");
        }
      } catch (err) {
        logger.warn({ err, event, partnerId: row.id }, "Partner webhook delivery failed");
      }
    }
  })();
}
