import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  tlsRejectUnauthorized: boolean;
  /** Where active config came from */
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

function envConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  return {
    enabled: true,
    host,
    port: Number.isNaN(port) ? 587 : port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from: process.env.SMTP_FROM?.trim() || "Kuber Quant <noreply@kuberquant.com>",
    tlsRejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== "false",
    source: "environment",
  };
}

export async function getSmtpConfig(): Promise<SmtpConfig> {
  const [enabled, host, port, secure, user, pass, from, tlsReject] = await Promise.all([
    getSetting("smtp_enabled"),
    getSetting("smtp_host"),
    getSetting("smtp_port"),
    getSetting("smtp_secure"),
    getSetting("smtp_user"),
    getSetting("smtp_pass"),
    getSetting("smtp_from"),
    getSetting("smtp_tls_reject_unauthorized"),
  ]);

  const hasDbHost = Boolean(host?.trim());
  if (hasDbHost) {
    const parsedPort = port ? Number(port) : 587;
    return {
      enabled: enabled !== "false",
      host: host.trim(),
      port: Number.isNaN(parsedPort) ? 587 : parsedPort,
      secure: secure === "true" || parsedPort === 465,
      user: user || "",
      pass: pass || "",
      from: from?.trim() || "Kuber Quant <noreply@kuberquant.com>",
      tlsRejectUnauthorized: tlsReject !== "false",
      source: "database",
    };
  }

  const fromEnv = envConfig();
  if (fromEnv) return fromEnv;

  return {
    enabled: false,
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "Kuber Quant <noreply@kuberquant.com>",
    tlsRejectUnauthorized: true,
    source: "none",
  };
}

/** Safe config for API responses — masks password. */
export async function getSmtpConfigPublic(): Promise<SmtpConfig & { configured: boolean; envFallback: boolean }> {
  const cfg = await getSmtpConfig();
  const envFallback = cfg.source === "environment";
  const configured = cfg.source !== "none" && Boolean(cfg.host && cfg.user && cfg.pass);
  return {
    ...cfg,
    pass: cfg.pass ? MASK : "",
    configured,
    envFallback,
  };
}

export async function saveSmtpConfig(partial: Partial<SmtpConfig>) {
  const existing = await getSmtpConfig();
  const ops: Promise<void>[] = [];

  if (partial.enabled !== undefined) ops.push(saveSetting("smtp_enabled", String(partial.enabled), "SMTP Enabled"));
  if (partial.host !== undefined) ops.push(saveSetting("smtp_host", partial.host, "SMTP Host"));
  if (partial.port !== undefined) ops.push(saveSetting("smtp_port", String(partial.port), "SMTP Port"));
  if (partial.secure !== undefined) ops.push(saveSetting("smtp_secure", String(partial.secure), "SMTP Secure"));
  if (partial.user !== undefined) ops.push(saveSetting("smtp_user", partial.user, "SMTP User"));
  if (partial.pass !== undefined && partial.pass !== MASK) ops.push(saveSetting("smtp_pass", partial.pass, "SMTP Password"));
  if (partial.from !== undefined) ops.push(saveSetting("smtp_from", partial.from, "SMTP From Address"));
  if (partial.tlsRejectUnauthorized !== undefined) {
    ops.push(saveSetting("smtp_tls_reject_unauthorized", String(partial.tlsRejectUnauthorized), "SMTP TLS Reject Unauthorized"));
  }

  await Promise.all(ops);

  // If DB config cleared, keep env fallback
  if (partial.host === "" && existing.source === "database") {
    await Promise.all([
      saveSetting("smtp_enabled", "false", "SMTP Enabled"),
      saveSetting("smtp_user", "", "SMTP User"),
      saveSetting("smtp_pass", "", "SMTP Password"),
    ]);
  }
}

export function createSmtpTransporter(cfg: SmtpConfig): nodemailer.Transporter | null {
  if (!cfg.enabled || !cfg.host || !cfg.user || !cfg.pass) return null;

  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: { user: cfg.user, pass: cfg.pass },
    tls: { rejectUnauthorized: cfg.tlsRejectUnauthorized },
  });
}

export async function testSmtpConnection(testTo?: string): Promise<{ ok: boolean; message: string }> {
  const cfg = await getSmtpConfig();
  const t = createSmtpTransporter(cfg);
  if (!t) {
    return { ok: false, message: "SMTP is not configured. Set host, username, and password." };
  }

  try {
    await t.verify();
    if (testTo?.trim()) {
      await t.sendMail({
        from: cfg.from,
        to: testTo.trim(),
        subject: "Kuber Quant — SMTP test",
        text: "This is a test email from your Kuber Quant super admin mail settings.",
        html: `<p>This is a <strong>test email</strong> from your Kuber Quant super admin mail settings.</p>`,
      });
      return { ok: true, message: `Connection OK — test email sent to ${testTo.trim()}` };
    }
    return { ok: true, message: "SMTP connection verified successfully" };
  } catch (err: any) {
    return { ok: false, message: err?.message || "SMTP connection failed" };
  }
}
