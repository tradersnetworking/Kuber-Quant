import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "@workspace/db/orm";

export type OtpChannel = "email" | "sms" | "whatsapp" | "firebase";
export type MobileOtpChannel = "sms" | "whatsapp" | "firebase";

export interface OtpChannelToggle {
  enabled: boolean;
}

export interface SmsOtpConfig extends OtpChannelToggle {
  provider: "msg91" | "twilio" | "generic";
  apiKey: string;
  accountSid: string;
  senderId: string;
  templateId: string;
  apiUrl: string;
}

export interface WhatsAppOtpConfig extends OtpChannelToggle {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
}

export interface FirebaseOtpConfig extends OtpChannelToggle {
  projectId: string;
  apiKey: string;
  authDomain: string;
  appId: string;
}

export interface OtpCommunicationConfig {
  email: OtpChannelToggle;
  sms: SmsOtpConfig;
  whatsapp: WhatsAppOtpConfig;
  firebase: FirebaseOtpConfig;
  preferredMobileChannel: MobileOtpChannel;
  login2faSms: boolean;
  login2faWhatsapp: boolean;
  otpMessageTemplate: string;
}

const STORAGE_KEY = "otp_communication_config";

export const DEFAULT_OTP_MESSAGE = "Your Kuber Quant verification code is {{otp}}. Valid for {{minutes}} minutes. Do not share this code.";

export function defaultOtpCommunicationConfig(): OtpCommunicationConfig {
  return {
    email: { enabled: true },
    sms: {
      enabled: false,
      provider: "msg91",
      apiKey: "",
      accountSid: "",
      senderId: "",
      templateId: "",
      apiUrl: "",
    },
    whatsapp: {
      enabled: false,
      phoneNumberId: "",
      accessToken: "",
      templateName: "otp_verification",
      templateLanguage: "en",
    },
    firebase: {
      enabled: false,
      projectId: "",
      apiKey: "",
      authDomain: "",
      appId: "",
    },
    preferredMobileChannel: "sms",
    login2faSms: false,
    login2faWhatsapp: false,
    otpMessageTemplate: DEFAULT_OTP_MESSAGE,
  };
}

function mergeConfig(raw: Partial<OtpCommunicationConfig> | null): OtpCommunicationConfig {
  const base = defaultOtpCommunicationConfig();
  if (!raw) return base;
  return {
    email: { ...base.email, ...(raw.email || {}) },
    sms: { ...base.sms, ...(raw.sms || {}) },
    whatsapp: { ...base.whatsapp, ...(raw.whatsapp || {}) },
    firebase: { ...base.firebase, ...(raw.firebase || {}) },
    preferredMobileChannel: raw.preferredMobileChannel || base.preferredMobileChannel,
    login2faSms: raw.login2faSms ?? base.login2faSms,
    login2faWhatsapp: raw.login2faWhatsapp ?? base.login2faWhatsapp,
    otpMessageTemplate: raw.otpMessageTemplate?.trim() || base.otpMessageTemplate,
  };
}

export async function getOtpCommunicationConfig(): Promise<OtpCommunicationConfig> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (!row?.value) return defaultOtpCommunicationConfig();
  try {
    return mergeConfig(JSON.parse(row.value));
  } catch {
    return defaultOtpCommunicationConfig();
  }
}

export async function saveOtpCommunicationConfig(config: OtpCommunicationConfig) {
  const normalized = mergeConfig(config);
  const value = JSON.stringify(normalized);
  const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, STORAGE_KEY)).limit(1);
  if (existing) {
    await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, STORAGE_KEY));
  } else {
    await db.insert(siteSettingsTable).values({
      key: STORAGE_KEY,
      value,
      label: "OTP Communication Config",
      category: "email",
      description: "SMS, WhatsApp, Firebase phone OTP channels and toggles",
    });
  }
}

export async function isOtpChannelEnabled(channel: OtpChannel): Promise<boolean> {
  const config = await getOtpCommunicationConfig();
  if (channel === "email") return config.email.enabled !== false;
  return config[channel].enabled === true;
}

/** Public-safe config for client Firebase init and channel availability. */
export async function getPublicOtpConfig() {
  const config = await getOtpCommunicationConfig();
  const mobileChannels: MobileOtpChannel[] = [];
  if (config.sms.enabled) mobileChannels.push("sms");
  if (config.whatsapp.enabled) mobileChannels.push("whatsapp");
  if (config.firebase.enabled) mobileChannels.push("firebase");

  return {
    emailOtpEnabled: config.email.enabled !== false,
    smsOtpEnabled: config.sms.enabled,
    whatsappOtpEnabled: config.whatsapp.enabled,
    firebaseOtpEnabled: config.firebase.enabled,
    preferredMobileChannel: config.preferredMobileChannel,
    mobileChannels,
    login2faSms: config.login2faSms && config.sms.enabled,
    login2faWhatsapp: config.login2faWhatsapp && config.whatsapp.enabled,
    firebase: config.firebase.enabled
      ? {
          apiKey: config.firebase.apiKey,
          authDomain: config.firebase.authDomain,
          projectId: config.firebase.projectId,
          appId: config.firebase.appId,
        }
      : null,
  };
}

export function maskSecret(value: string, visible = 4): string {
  if (!value) return "";
  if (value.length <= visible) return "••••";
  return `${"•".repeat(Math.min(12, value.length - visible))}${value.slice(-visible)}`;
}

export function sanitizeOtpConfigForClient(config: OtpCommunicationConfig) {
  return {
    ...config,
    sms: { ...config.sms, apiKey: maskSecret(config.sms.apiKey), accountSid: maskSecret(config.sms.accountSid) },
    whatsapp: { ...config.whatsapp, accessToken: maskSecret(config.whatsapp.accessToken) },
    firebase: { ...config.firebase, apiKey: maskSecret(config.firebase.apiKey) },
  };
}

export async function getOtpCommunicationSummary() {
  const config = await getOtpCommunicationConfig();
  return {
    emailOtpEnabled: config.email.enabled !== false,
    smsOtpEnabled: config.sms.enabled,
    whatsappOtpEnabled: config.whatsapp.enabled,
    firebaseOtpEnabled: config.firebase.enabled,
    preferredMobileChannel: config.preferredMobileChannel,
    login2faSms: config.login2faSms,
    login2faWhatsapp: config.login2faWhatsapp,
  };
}
