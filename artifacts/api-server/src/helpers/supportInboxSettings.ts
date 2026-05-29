import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

export interface SupportInboxConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  inboxAddress: string;
  tlsRejectUnauthorized: boolean;
  source: "database" | "environment" | "none";
}

const MASK = "••••••••";

async function getSetting(key: string): Promise<string> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  return row?.value || "";
}

async function saveSetting(key: string, value: string, label: string) {
  const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
  if (existing.length) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
  } else {
    await db.insert(siteSettingsTable).values({ key, value, label, category: "email" });
  }
}

function envConfig(): SupportInboxConfig | null {
  const host = process.env.SUPPORT_IMAP_HOST?.trim();
  const user = process.env.SUPPORT_IMAP_USER?.trim();
  const pass = process.env.SUPPORT_IMAP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env.SUPPORT_IMAP_PORT || "993", 10);
  return {
    enabled: process.env.SUPPORT_IMAP_ENABLED !== "false",
    host,
    port: Number.isNaN(port) ? 993 : port,
    secure: process.env.SUPPORT_IMAP_SECURE !== "false",
    user,
    pass,
    inboxAddress: process.env.SUPPORT_INBOX_ADDRESS?.trim() || "support@kuberquant.com",
    tlsRejectUnauthorized: process.env.SUPPORT_IMAP_TLS_REJECT_UNAUTHORIZED !== "false",
    source: "environment",
  };
}

export async function getSupportInboxConfig(): Promise<SupportInboxConfig> {
  const [enabled, host, port, secure, user, pass, inboxAddress, tlsReject] = await Promise.all([
    getSetting("support_imap_enabled"),
    getSetting("support_imap_host"),
    getSetting("support_imap_port"),
    getSetting("support_imap_secure"),
    getSetting("support_imap_user"),
    getSetting("support_imap_pass"),
    getSetting("support_inbox_address"),
    getSetting("support_imap_tls_reject_unauthorized"),
  ]);

  const hasDbHost = Boolean(host?.trim());
  if (hasDbHost) {
    const parsedPort = port ? Number(port) : 993;
    return {
      enabled: enabled !== "false",
      host: host.trim(),
      port: Number.isNaN(parsedPort) ? 993 : parsedPort,
      secure: secure !== "false",
      user: user || "",
      pass: pass || "",
      inboxAddress: inboxAddress?.trim() || "support@kuberquant.com",
      tlsRejectUnauthorized: tlsReject !== "false",
      source: "database",
    };
  }

  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;

  return {
    enabled: false,
    host: "",
    port: 993,
    secure: true,
    user: "",
    pass: "",
    inboxAddress: "support@kuberquant.com",
    tlsRejectUnauthorized: true,
    source: "none",
  };
}

export async function getSupportInboxConfigPublic(): Promise<
  SupportInboxConfig & { configured: boolean; envFallback: boolean }
> {
  const cfg = await getSupportInboxConfig();
  const envFallback = cfg.source === "environment";
  const configured = cfg.source !== "none" && Boolean(cfg.host && cfg.user && cfg.pass);
  return {
    ...cfg,
    pass: cfg.pass ? MASK : "",
    configured,
    envFallback,
  };
}

export async function saveSupportInboxConfig(partial: Partial<SupportInboxConfig>) {
  const ops: Promise<void>[] = [];

  if (partial.enabled !== undefined) ops.push(saveSetting("support_imap_enabled", String(partial.enabled), "Support IMAP Enabled"));
  if (partial.host !== undefined) ops.push(saveSetting("support_imap_host", partial.host, "Support IMAP Host"));
  if (partial.port !== undefined) ops.push(saveSetting("support_imap_port", String(partial.port), "Support IMAP Port"));
  if (partial.secure !== undefined) ops.push(saveSetting("support_imap_secure", String(partial.secure), "Support IMAP Secure"));
  if (partial.user !== undefined) ops.push(saveSetting("support_imap_user", partial.user, "Support IMAP User"));
  if (partial.pass !== undefined && partial.pass !== MASK) ops.push(saveSetting("support_imap_pass", partial.pass, "Support IMAP Password"));
  if (partial.inboxAddress !== undefined) ops.push(saveSetting("support_inbox_address", partial.inboxAddress, "Support Inbox Address"));
  if (partial.tlsRejectUnauthorized !== undefined) {
    ops.push(saveSetting("support_imap_tls_reject_unauthorized", String(partial.tlsRejectUnauthorized), "Support IMAP TLS Reject Unauthorized"));
  }

  await Promise.all(ops);
}
