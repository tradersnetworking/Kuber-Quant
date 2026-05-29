import { OAuth2Client } from "google-auth-library";
import { logger } from "../lib/logger";
import {
  getOtpCommunicationConfig,
  isOtpChannelEnabled,
  type OtpChannel,
  type MobileOtpChannel,
  DEFAULT_OTP_MESSAGE,
} from "./otpCommunicationSettings";
import { isAutoEmailEnabled } from "./emailCommunicationSettings";
import { sendOtpEmail } from "./authHelpers";

function formatOtpMessage(template: string, otp: string, minutes = 10): string {
  return template
    .replace(/\{\{otp\}\}/g, otp)
    .replace(/\{\{minutes\}\}/g, String(minutes));
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (phone.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

async function sendSmsOtp(phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getOtpCommunicationConfig();
  const sms = config.sms;
  if (!sms.enabled) return { ok: false, error: "SMS OTP is disabled" };

  const to = normalizePhone(phone);

  try {
    if (sms.provider === "twilio" && sms.accountSid && sms.apiKey) {
      const auth = Buffer.from(`${sms.accountSid}:${sms.apiKey}`).toString("base64");
      const body = new URLSearchParams({
        To: to,
        From: sms.senderId,
        Body: message,
      });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sms.accountSid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) {
        const err = await res.text();
        logger.error({ err, status: res.status }, "Twilio SMS OTP failed");
        return { ok: false, error: "SMS delivery failed" };
      }
      return { ok: true };
    }

    if (sms.provider === "msg91" && sms.apiKey) {
      const res = await fetch("https://control.msg91.com/api/v5/flow/", {
        method: "POST",
        headers: { authkey: sms.apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: sms.templateId || undefined,
          short_url: "0",
          recipients: [{ mobiles: to.replace("+", ""), var: otpFromMessage(message) }],
        }),
      });
      if (!res.ok) {
        const err = await res.text();
        logger.error({ err, status: res.status }, "MSG91 SMS OTP failed");
        return { ok: false, error: "SMS delivery failed" };
      }
      return { ok: true };
    }

    if (sms.provider === "generic" && sms.apiUrl) {
      const res = await fetch(sms.apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(sms.apiKey ? { Authorization: `Bearer ${sms.apiKey}` } : {}) },
        body: JSON.stringify({ to, phone: to, message, sender: sms.senderId, templateId: sms.templateId }),
      });
      if (!res.ok) {
        logger.error({ status: res.status }, "Generic SMS OTP failed");
        return { ok: false, error: "SMS delivery failed" };
      }
      return { ok: true };
    }

    if (process.env.NODE_ENV !== "production") {
      logger.info({ to, message }, "[DEV] SMS OTP (no provider configured)");
      return { ok: true };
    }
    return { ok: false, error: "SMS provider not configured" };
  } catch (err) {
    logger.error({ err }, "SMS OTP send error");
    return { ok: false, error: "SMS delivery error" };
  }
}

function otpFromMessage(message: string): string {
  const match = message.match(/\b(\d{4,8})\b/);
  return match?.[1] || message;
}

async function sendWhatsAppOtp(phone: string, otp: string): Promise<{ ok: boolean; error?: string }> {
  const config = await getOtpCommunicationConfig();
  const wa = config.whatsapp;
  if (!wa.enabled) return { ok: false, error: "WhatsApp OTP is disabled" };
  if (!wa.phoneNumberId || !wa.accessToken) {
    if (process.env.NODE_ENV !== "production") {
      logger.info({ phone, otp }, "[DEV] WhatsApp OTP (credentials missing)");
      return { ok: true };
    }
    return { ok: false, error: "WhatsApp Business API not configured" };
  }

  const to = normalizePhone(phone).replace("+", "");

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${wa.phoneNumberId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${wa.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: wa.templateName || "otp_verification",
          language: { code: wa.templateLanguage || "en" },
          components: [
            {
              type: "body",
              parameters: [{ type: "text", text: otp }],
            },
          ],
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error({ err, status: res.status }, "WhatsApp OTP failed");
      return { ok: false, error: "WhatsApp delivery failed" };
    }
    return { ok: true };
  } catch (err) {
    logger.error({ err }, "WhatsApp OTP send error");
    return { ok: false, error: "WhatsApp delivery error" };
  }
}

export async function verifyFirebasePhoneToken(idToken: string, expectedPhone?: string): Promise<boolean> {
  const config = await getOtpCommunicationConfig();
  if (!config.firebase.enabled || !config.firebase.projectId) return false;

  try {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: config.firebase.projectId,
    });
    const payload = ticket.getPayload() as { phone_number?: string } | undefined;
    if (!payload?.phone_number) return false;
    if (expectedPhone) {
      return normalizePhone(payload.phone_number) === normalizePhone(expectedPhone);
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Firebase phone token verification failed");
    return false;
  }
}

export async function resolveMobileChannel(requested?: string): Promise<MobileOtpChannel | null> {
  const config = await getOtpCommunicationConfig();
  const order: MobileOtpChannel[] = [];
  if (requested === "sms" || requested === "whatsapp" || requested === "firebase") {
    order.push(requested);
  }
  order.push(config.preferredMobileChannel, "sms", "whatsapp", "firebase");
  const seen = new Set<MobileOtpChannel>();
  for (const ch of order) {
    if (seen.has(ch)) continue;
    seen.add(ch);
    if (await isOtpChannelEnabled(ch)) return ch;
  }
  return null;
}

export async function sendOtpViaChannel(opts: {
  channel: OtpChannel;
  email?: string;
  phone?: string;
  name: string;
  otp: string;
  purpose: string;
  ttlMinutes?: number;
}): Promise<{ ok: boolean; message: string; channel: OtpChannel; devOtp?: string }> {
  const { channel, email, phone, name, otp, purpose, ttlMinutes = 10 } = opts;
  const config = await getOtpCommunicationConfig();
  const message = formatOtpMessage(config.otpMessageTemplate || DEFAULT_OTP_MESSAGE, otp, ttlMinutes);
  const isDev = process.env.NODE_ENV !== "production";

  if (channel === "email") {
    if (!(await isAutoEmailEnabled("otp"))) {
      return { ok: false, message: "Email OTP is disabled in communication settings", channel };
    }
    if (!email) return { ok: false, message: "Email is required", channel };
    await sendOtpEmail({ to: email, name, otp, purpose });
    return { ok: true, message: "Verification code sent to your email.", channel, devOtp: isDev ? otp : undefined };
  }

  if (channel === "firebase") {
    if (!config.firebase.enabled) {
      return { ok: false, message: "Firebase phone OTP is disabled", channel };
    }
    return {
      ok: true,
      message: "Use Firebase phone verification on the client, then submit the verification token.",
      channel,
      devOtp: isDev ? otp : undefined,
    };
  }

  if (!phone) return { ok: false, message: "Phone number is required", channel };

  if (channel === "sms") {
    const result = await sendSmsOtp(phone, message);
    if (!result.ok) return { ok: false, message: result.error || "Failed to send SMS OTP", channel };
    return { ok: true, message: "Verification code sent via SMS.", channel, devOtp: isDev ? otp : undefined };
  }

  if (channel === "whatsapp") {
    const result = await sendWhatsAppOtp(phone, otp);
    if (!result.ok) return { ok: false, message: result.error || "Failed to send WhatsApp OTP", channel };
    return { ok: true, message: "Verification code sent via WhatsApp.", channel, devOtp: isDev ? otp : undefined };
  }

  return { ok: false, message: "Unsupported OTP channel", channel };
}

export async function getLogin2faMethods(user: { id: number; email: string; phone?: string | null }): Promise<string[]> {
  const methods = ["totp", "email_otp", "backup"];
  const config = await getOtpCommunicationConfig();
  if (user.phone && config.login2faSms && config.sms.enabled) methods.push("sms_otp");
  if (user.phone && config.login2faWhatsapp && config.whatsapp.enabled) methods.push("whatsapp_otp");
  const { userHasPasskeys } = await import("./webauthnService");
  if (await userHasPasskeys(user.id)) methods.unshift("webauthn");
  return methods;
}
