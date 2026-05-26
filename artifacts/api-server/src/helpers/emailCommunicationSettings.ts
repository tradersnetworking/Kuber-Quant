import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getSmtpConfig } from "./smtpSettings";

export type EmailPurpose =
  | "registration"
  | "password_reset"
  | "otp"
  | "deposit_submitted"
  | "deposit_approved"
  | "deposit_rejected"
  | "withdrawal_submitted"
  | "withdrawal_approved"
  | "withdrawal_rejected"
  | "kyc_submitted"
  | "kyc_approved"
  | "kyc_rejected"
  | "investment"
  | "ticket_reply"
  | "broadcast"
  | "generic";

export interface MailIdentity {
  id: string;
  label: string;
  name: string;
  address: string;
}

export interface AutoEmailSetting {
  enabled: boolean;
  subject: string;
}

export interface EmailCommunicationConfig {
  identities: MailIdentity[];
  assignments: Record<EmailPurpose, string>;
  autoEmails: Record<EmailPurpose, AutoEmailSetting>;
}

const STORAGE_KEY = "email_communication_config";

export const EMAIL_PURPOSE_META: Record<EmailPurpose, { label: string; description: string; group: string }> = {
  registration: { label: "Registration / Welcome", description: "Sent when a new user completes registration", group: "Account" },
  password_reset: { label: "Forgot Password", description: "Password reset link or confirmation", group: "Account" },
  otp: { label: "OTP / Verification Code", description: "One-time codes for login, verify, reset", group: "Account" },
  deposit_submitted: { label: "Deposit Submitted", description: "When user submits a deposit request", group: "Finance" },
  deposit_approved: { label: "Deposit Approved", description: "When admin approves a deposit", group: "Finance" },
  deposit_rejected: { label: "Deposit Rejected", description: "When admin rejects a deposit", group: "Finance" },
  withdrawal_submitted: { label: "Withdrawal Submitted", description: "When user requests a withdrawal", group: "Finance" },
  withdrawal_approved: { label: "Withdrawal Approved", description: "When admin approves a withdrawal", group: "Finance" },
  withdrawal_rejected: { label: "Withdrawal Rejected", description: "When admin rejects a withdrawal", group: "Finance" },
  kyc_submitted: { label: "KYC Submitted", description: "When user submits KYC documents", group: "Compliance" },
  kyc_approved: { label: "KYC Approved", description: "When KYC is verified", group: "Compliance" },
  kyc_rejected: { label: "KYC Rejected", description: "When KYC is rejected", group: "Compliance" },
  investment: { label: "Investment", description: "Investment plan confirmations", group: "Trading" },
  ticket_reply: { label: "Support Ticket Reply", description: "When staff replies to a support ticket", group: "Support" },
  broadcast: { label: "Admin Broadcast", description: "Bulk announcements from admin", group: "Support" },
  generic: { label: "Generic / Other", description: "Fallback for uncategorized mail", group: "Other" },
};

export const ALL_EMAIL_PURPOSES = Object.keys(EMAIL_PURPOSE_META) as EmailPurpose[];

export const DEFAULT_IDENTITIES: MailIdentity[] = [
  { id: "default", label: "Default (SMTP From)", name: "Kuber Quant", address: "" },
  { id: "noreply", label: "No Reply", name: "Kuber Quant", address: "noreply@kuberquant.com" },
  { id: "support", label: "Support", name: "Kuber Quant Support", address: "support@kuberquant.com" },
  { id: "finance", label: "Finance", name: "Kuber Quant Finance", address: "finance@kuberquant.com" },
  { id: "compliance", label: "Compliance / KYC", name: "Kuber Quant Compliance", address: "compliance@kuberquant.com" },
];

/** All automated notification emails are sent from the noreply identity only. */
export const DEFAULT_ASSIGNMENTS: Record<EmailPurpose, string> = Object.fromEntries(
  ALL_EMAIL_PURPOSES.map(p => [p, "noreply"]),
) as Record<EmailPurpose, string>;

function extractEmailAddress(fromHeader: string): string | null {
  const match = fromHeader.match(/<([^>]+)>/);
  return (match?.[1] || fromHeader).trim() || null;
}

function formatFromHeader(name: string, address: string): string {
  return `${name.trim() || "Kuber Quant"} <${address.trim()}>`;
}

export function enforceNoreplyAssignments(
  assignments: Partial<Record<EmailPurpose, string>> | Record<EmailPurpose, string>,
): Record<EmailPurpose, string> {
  return Object.fromEntries(ALL_EMAIL_PURPOSES.map(p => [p, "noreply"])) as Record<EmailPurpose, string>;
}

export function resolveNoreplyFromConfig(
  config: EmailCommunicationConfig,
  smtpFrom: string,
): string {
  const noreply = config.identities.find(i => i.id === "noreply");
  if (noreply?.address?.trim()) {
    return formatFromHeader(noreply.name || "Kuber Quant", noreply.address);
  }

  const smtpEmail = extractEmailAddress(smtpFrom);
  if (smtpEmail?.toLowerCase().startsWith("noreply@")) {
    return smtpFrom.includes("<") ? smtpFrom : formatFromHeader("Kuber Quant", smtpEmail);
  }

  const domain = smtpEmail?.split("@")[1] || "kuberquant.com";
  return formatFromHeader("Kuber Quant", `noreply@${domain}`);
}

export const DEFAULT_AUTO_EMAILS: Record<EmailPurpose, AutoEmailSetting> = {
  registration: { enabled: true, subject: "Welcome to Kuber Quant" },
  password_reset: { enabled: true, subject: "Reset your Kuber Quant password" },
  otp: { enabled: true, subject: "Your Kuber Quant verification code" },
  deposit_submitted: { enabled: true, subject: "Deposit request received" },
  deposit_approved: { enabled: true, subject: "Deposit approved" },
  deposit_rejected: { enabled: true, subject: "Deposit update" },
  withdrawal_submitted: { enabled: true, subject: "Withdrawal request received" },
  withdrawal_approved: { enabled: true, subject: "Withdrawal approved" },
  withdrawal_rejected: { enabled: true, subject: "Withdrawal update" },
  kyc_submitted: { enabled: true, subject: "KYC documents received" },
  kyc_approved: { enabled: true, subject: "KYC verified successfully" },
  kyc_rejected: { enabled: true, subject: "KYC verification update" },
  investment: { enabled: true, subject: "Investment confirmation" },
  ticket_reply: { enabled: true, subject: "Support ticket update" },
  broadcast: { enabled: true, subject: "Message from Kuber Quant" },
  generic: { enabled: true, subject: "Notification from Kuber Quant" },
};

export function defaultEmailCommunicationConfig(): EmailCommunicationConfig {
  return {
    identities: DEFAULT_IDENTITIES.map(i => ({ ...i })),
    assignments: { ...DEFAULT_ASSIGNMENTS },
    autoEmails: Object.fromEntries(
      Object.entries(DEFAULT_AUTO_EMAILS).map(([k, v]) => [k, { ...v }])
    ) as Record<EmailPurpose, AutoEmailSetting>,
  };
}

function mergeConfig(raw: Partial<EmailCommunicationConfig> | null): EmailCommunicationConfig {
  const base = defaultEmailCommunicationConfig();
  if (!raw) return base;
  const identities = Array.isArray(raw.identities) && raw.identities.length
    ? raw.identities
    : base.identities;
  return {
    identities,
    assignments: enforceNoreplyAssignments({ ...base.assignments, ...(raw.assignments || {}) }),
    autoEmails: {
      ...base.autoEmails,
      ...(raw.autoEmails || {}),
    },
  };
}

async function getRawSetting(): Promise<Partial<EmailCommunicationConfig> | null> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

export async function getEmailCommunicationConfig(): Promise<EmailCommunicationConfig> {
  return mergeConfig(await getRawSetting());
}

export async function saveEmailCommunicationConfig(config: EmailCommunicationConfig) {
  const normalized: EmailCommunicationConfig = {
    ...config,
    assignments: enforceNoreplyAssignments(config.assignments),
  };
  const value = JSON.stringify(normalized);
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, STORAGE_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: STORAGE_KEY,
      value,
      label: "Email Communication Config",
      category: "email",
    });
  }
}

export async function resolveFromAddress(_purpose: EmailPurpose): Promise<string> {
  const smtp = await getSmtpConfig();
  const config = await getEmailCommunicationConfig();
  return resolveNoreplyFromConfig(config, smtp.from || "Kuber Quant <noreply@kuberquant.com>");
}

export async function isAutoEmailEnabled(purpose: EmailPurpose): Promise<boolean> {
  const config = await getEmailCommunicationConfig();
  return config.autoEmails[purpose]?.enabled !== false;
}

export async function resolveEmailSubject(purpose: EmailPurpose, fallback: string): Promise<string> {
  const config = await getEmailCommunicationConfig();
  const custom = config.autoEmails[purpose]?.subject?.trim();
  return custom || fallback;
}

export function resolveFromAddressFromConfig(
  _purpose: EmailPurpose,
  config: EmailCommunicationConfig,
  smtpFrom: string,
): string {
  return resolveNoreplyFromConfig(config, smtpFrom || "Kuber Quant <noreply@kuberquant.com>");
}

export function getResolvedFromPreviews(
  config: EmailCommunicationConfig,
  smtpFrom: string,
): Record<EmailPurpose, string> {
  return Object.fromEntries(
    ALL_EMAIL_PURPOSES.map(p => [p, resolveFromAddressFromConfig(p, config, smtpFrom)]),
  ) as Record<EmailPurpose, string>;
}

export async function getEmailCommunicationSummary() {
  const { getSmtpConfigPublic } = await import("./smtpSettings");
  const { getSupportInboxConfigPublic } = await import("./supportInboxSettings");
  const [config, smtp, inbox] = await Promise.all([
    getEmailCommunicationConfig(),
    getSmtpConfigPublic(),
    getSupportInboxConfigPublic(),
  ]);

  const enabledAuto = ALL_EMAIL_PURPOSES.filter(p => config.autoEmails[p]?.enabled !== false).length;

  return {
    smtp: {
      configured: smtp.configured,
      enabled: smtp.enabled,
      envFallback: smtp.envFallback,
      from: smtp.from,
    },
    inbox: {
      configured: inbox.configured,
      enabled: inbox.enabled,
      envFallback: inbox.envFallback,
      address: inbox.inboxAddress,
    },
    identities: config.identities.length,
    autoEmailsEnabled: enabledAuto,
    autoEmailsTotal: ALL_EMAIL_PURPOSES.length,
    resolvedFrom: getResolvedFromPreviews(config, smtp.from),
  };
}

export async function sendTestPurposeEmail(purpose: EmailPurpose, to: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = to.trim();
  if (!trimmed || !trimmed.includes("@")) {
    return { ok: false, message: "A valid recipient email is required" };
  }

  const { sendMail } = await import("./mailer");
  const from = await resolveFromAddress(purpose);
  const meta = EMAIL_PURPOSE_META[purpose];
  const subject = await resolveEmailSubject(purpose, `Test: ${meta?.label || purpose}`);
  const enabled = await isAutoEmailEnabled(purpose);

  const sent = await sendMail({
    to: trimmed,
    from,
    subject,
    html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#0a1628;border-radius:12px;padding:28px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 12px">Email Communication Test</h2>
    <p style="color:rgba(255,255,255,0.75);line-height:1.6">
      This is a test message for <strong>${meta?.label || purpose}</strong>.
    </p>
    <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:16px">
      Purpose: <code>${purpose}</code><br/>
      From: ${from}<br/>
      Auto-send enabled: ${enabled ? "Yes" : "No"}
    </p>
  </div>
</body></html>`,
    text: `Test email for ${purpose}. From: ${from}. Auto-send enabled: ${enabled ? "Yes" : "No"}.`,
  });

  if (!sent) {
    return { ok: false, message: "Failed to send — check SMTP settings and that outbound email is enabled." };
  }
  return { ok: true, message: `Test email sent to ${trimmed} using ${from}` };
}
