import nodemailer from "nodemailer";
import { createSmtpTransporter, getSmtpConfig, type SmtpConfig } from "./smtpSettings";
import { enqueueEmailJob, isJobQueueEnabled } from "./jobQueue";
import {
  type EmailPurpose,
  isAutoEmailEnabled,
  resolveEmailSubject,
  resolveFromAddress,
} from "./emailCommunicationSettings";

export type { EmailPurpose } from "./emailCommunicationSettings";

let transporter: nodemailer.Transporter | null = null;
let transporterKey: string | null = null;

function configKey(cfg: SmtpConfig): string {
  return [cfg.host, cfg.port, cfg.user, cfg.pass, cfg.secure, cfg.tlsRejectUnauthorized].join("|");
}

export function resetMailTransporter() {
  transporter = null;
  transporterKey = null;
}

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const cfg = await getSmtpConfig();
  const key = configKey(cfg);
  if (transporter && transporterKey === key) return transporter;

  transporter = createSmtpTransporter(cfg);
  transporterKey = key;
  return transporter;
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{ filename: string; path?: string; content?: Buffer; contentType?: string }>;
}): Promise<boolean> {
  const cfg = await getSmtpConfig();
  if (!cfg.enabled) return false;
  const t = await getTransporter();
  if (!t) {
    return false;
  }
  try {
    const from = opts.from || await resolveFromAddress("generic");
    await t.sendMail({ from, ...opts });
    return true;
  } catch {
    resetMailTransporter();
    return false;
  }
}

/** Sends email respecting super-admin auto-communication toggles and purpose-based from addresses. */
export async function sendTransactionalEmail(opts: {
  to: string;
  purpose: EmailPurpose;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  if (!(await isAutoEmailEnabled(opts.purpose))) return false;
  if (isJobQueueEnabled() && process.env.ASYNC_EMAIL !== "false") {
    return enqueueEmailJob(opts);
  }
  const from = await resolveFromAddress(opts.purpose);
  const subject = await resolveEmailSubject(opts.purpose, opts.subject);
  return sendMail({ ...opts, subject, from });
}

export function buildKycEmail(opts: { name: string; status: "submitted" | "approved" | "rejected"; reason?: string }): string {
  const statusText = opts.status === "approved"
    ? "Your KYC verification has been approved. You now have full access to deposits, withdrawals, and investments."
    : opts.status === "rejected"
    ? `Your KYC verification was not approved.${opts.reason ? ` Reason: ${opts.reason}` : ""} Please resubmit corrected documents.`
    : "We have received your KYC documents and they are under review. We will notify you once verification is complete.";
  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:40px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:32px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 16px">KYC Verification Update</h2>
    <p>Hi ${opts.name},</p>
    <p style="line-height:1.6;color:rgba(255,255,255,0.75)">${statusText}</p>
  </div>
</body></html>`;
}

export function buildTransactionEmail(opts: { name: string; type: string; amount: number | string; currency: string; status: string; notes?: string }): string {
  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:40px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:32px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 16px">Transaction Update</h2>
    <p>Hi ${opts.name},</p>
    <p style="line-height:1.6;color:rgba(255,255,255,0.75)">
      Your <strong>${opts.type}</strong> of <strong>${opts.amount} ${opts.currency}</strong> is now <strong>${opts.status}</strong>.
    </p>
    ${opts.notes ? `<p style="color:rgba(255,255,255,0.5);font-size:13px">${opts.notes}</p>` : ""}
  </div>
</body></html>`;
}

export function buildPasswordResetEmail(opts: { name: string; resetUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Password Reset - Kuber Quant</title></head>
<body style="margin:0;padding:0;background:#050A14;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0a1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d1f3c,#050A14);padding:32px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.2)">
      <div style="font-size:24px;font-weight:bold;color:#D4AF37;letter-spacing:-0.5px">KUBER QUANT</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">kuberquant.com</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px">Password Reset Request</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6">
        Hi ${opts.name}, we received a request to reset your Kuber Quant account password. Click the button below to set a new password.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.resetUrl}" style="background:linear-gradient(135deg,#D4AF37,#f59e0b);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px">
          Reset Password
        </a>
      </div>
      <p style="color:rgba(255,255,255,0.4);font-size:13px;line-height:1.6">
        This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.
      </p>
    </div>
    <div style="background:rgba(0,0,0,0.2);padding:20px;text-align:center">
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">
        &copy; ${new Date().getFullYear()} Kuber Quant &mdash; kuberquant.com<br/>
        <a href="mailto:support@kuberquant.com" style="color:rgba(212,175,55,0.6);text-decoration:none">support@kuberquant.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map(p => p.trim())
    .filter(Boolean)
    .map(p => `<p style="line-height:1.6;color:rgba(255,255,255,0.75);margin:0 0 12px">${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("");
}

export function buildTicketAcknowledgmentEmail(opts: {
  name: string;
  ticketId: number;
  category: string | null;
  subject: string;
  bodyText: string;
}): string {
  const kind = (opts.category || "General").toLowerCase();
  const heading = kind.includes("complaint")
    ? "Complaint Received"
    : kind.includes("query")
    ? "Query Received"
    : "Support Ticket Received";

  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:32px">
  <div style="max-width:520px;margin:0 auto;background:#0a1628;border-radius:12px;padding:28px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 8px">${heading}</h2>
    <p style="color:rgba(255,255,255,0.45);font-size:13px;margin:0 0 20px">Ticket #${opts.ticketId} · ${escapeHtml(opts.subject)}</p>
    ${opts.name ? `<p style="color:rgba(255,255,255,0.85)">Hi ${escapeHtml(opts.name)},</p>` : ""}
    ${textToHtmlParagraphs(opts.bodyText)}
    <p style="font-size:13px;color:rgba(255,255,255,0.4);margin-top:20px">Log in to your dashboard to view this ticket and add follow-up messages.</p>
  </div>
</body></html>`;
}

export function buildTicketReplyEmail(opts: { name: string; ticketId: number; message: string }): string {
  return `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#050A14;color:#fff;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#0a1628;border-radius:12px;padding:28px;border:1px solid rgba(212,175,55,0.2)">
    <h2 style="color:#D4AF37;margin:0 0 12px">Support Ticket Update</h2>
    <p>Hi ${escapeHtml(opts.name)},</p>
    <p style="line-height:1.6;color:rgba(255,255,255,0.75)">Our team replied to your ticket <strong>#${opts.ticketId}</strong>:</p>
    <blockquote style="border-left:3px solid #D4AF37;padding-left:12px;color:rgba(255,255,255,0.6);margin:16px 0;white-space:pre-wrap">${escapeHtml(opts.message)}</blockquote>
    <p style="font-size:13px;color:rgba(255,255,255,0.4)">Log in to view the full conversation.</p>
  </div>
</body></html>`;
}

export function buildWelcomeEmail(opts: { name: string; loginUrl: string }): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Welcome to Kuber Quant</title></head>
<body style="margin:0;padding:0;background:#050A14;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:40px auto;background:#0a1628;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden">
    <div style="background:linear-gradient(135deg,#0d1f3c,#050A14);padding:32px;text-align:center;border-bottom:1px solid rgba(212,175,55,0.2)">
      <div style="font-size:24px;font-weight:bold;color:#D4AF37;letter-spacing:-0.5px">KUBER QUANT</div>
      <div style="font-size:12px;color:rgba(255,255,255,0.4);margin-top:4px">kuberquant.com</div>
    </div>
    <div style="padding:32px">
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px">Welcome, ${opts.name}!</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0 0 24px;line-height:1.6">
        Your Kuber Quant account is ready. Start your wealth multiplication journey with institutional-grade algorithmic trading and investment plans.
      </p>
      <div style="text-align:center;margin:32px 0">
        <a href="${opts.loginUrl}" style="background:linear-gradient(135deg,#D4AF37,#f59e0b);color:#000;font-weight:bold;padding:14px 32px;border-radius:8px;text-decoration:none;display:inline-block;font-size:15px">
          Access Your Dashboard
        </a>
      </div>
    </div>
    <div style="background:rgba(0,0,0,0.2);padding:20px;text-align:center">
      <p style="color:rgba(255,255,255,0.3);font-size:12px;margin:0">
        &copy; ${new Date().getFullYear()} Kuber Quant &mdash; kuberquant.com
      </p>
    </div>
  </div>
</body>
</html>`;
}
