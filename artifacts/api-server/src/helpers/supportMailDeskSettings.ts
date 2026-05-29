import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

export interface SupportMailDeskConfig {
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  autoCreateTickets: boolean;
  autoTicketCategories: string[];
  notifyAgentsOnInbound: boolean;
  /** Send AI/template acknowledgment email when a user complaint or query ticket is created */
  autoReplyOnTicketCreate: boolean;
  /** Use OpenAI (OPENAI_API_KEY) for personalized auto-replies; falls back to templates if unavailable */
  useAiForAutoReplies: boolean;
  /** Post the auto-reply as the first staff message on the ticket thread */
  postAutoReplyInThread: boolean;
  slaHours: {
    query: number;
    complaint: number;
    dispute: number;
    general: number;
  };
  defaultAssigneeRole: "support" | "superadmin" | "none";
}

const STORAGE_KEY = "support_mail_desk_config";

export const DEFAULT_DESK_CONFIG: SupportMailDeskConfig = {
  autoSyncEnabled: true,
  autoSyncIntervalMinutes: 5,
  autoCreateTickets: true,
  autoTicketCategories: ["complaint", "dispute"],
  notifyAgentsOnInbound: true,
  autoReplyOnTicketCreate: true,
  useAiForAutoReplies: true,
  postAutoReplyInThread: true,
  slaHours: {
    query: 24,
    complaint: 8,
    dispute: 4,
    general: 48,
  },
  defaultAssigneeRole: "none",
};

export async function getSupportMailDeskConfig(): Promise<SupportMailDeskConfig> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (!row?.value) return { ...DEFAULT_DESK_CONFIG };
  try {
    return { ...DEFAULT_DESK_CONFIG, ...JSON.parse(row.value) };
  } catch {
    return { ...DEFAULT_DESK_CONFIG };
  }
}

export async function saveSupportMailDeskConfig(config: Partial<SupportMailDeskConfig>) {
  const existing = await getSupportMailDeskConfig();
  const merged = { ...existing, ...config, slaHours: { ...existing.slaHours, ...(config.slaHours || {}) } };
  const payload = JSON.stringify(merged);

  const [found] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (found) {
    await db.update(siteSettingsTable).set({ value: payload }).where(eq(siteSettingsTable.key, STORAGE_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: STORAGE_KEY,
      value: payload,
      label: "Support Mail Desk Config",
      category: "email",
    });
  }
  return merged;
}

export function computeSlaDueAt(category: string, receivedAt: Date, config: SupportMailDeskConfig): Date {
  const hours = config.slaHours[category as keyof typeof config.slaHours] ?? config.slaHours.general;
  return new Date(receivedAt.getTime() + hours * 60 * 60 * 1000);
}

export function computePriority(category: string): string {
  if (category === "dispute") return "urgent";
  if (category === "complaint") return "high";
  if (category === "query") return "medium";
  return "low";
}
