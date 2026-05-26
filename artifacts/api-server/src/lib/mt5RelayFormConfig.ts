export type Mt5RelayFieldKey = "platform" | "accountNumber" | "brokerName" | "serverName" | "tradingPassword" | "details";

export type Mt5RelayFieldOption = {
  enabled: boolean;
  required: boolean;
  label: string;
  placeholder?: string;
};

export type Mt5RelayFormConfig = {
  fields: Record<Mt5RelayFieldKey, Mt5RelayFieldOption>;
  profitSharing: {
    enabled: boolean;
    required: boolean;
    label: string;
    min: number;
    max: number;
    default: number;
    step: number;
  };
  copyTradingDetailsPlaceholder: string;
  accountHandlingDetailsPlaceholder: string;
};

export const DEFAULT_MT5_RELAY_FORM_CONFIG: Mt5RelayFormConfig = {
  fields: {
    platform: { enabled: true, required: true, label: "Trading Platform" },
    accountNumber: {
      enabled: true,
      required: true,
      label: "MT4/MT5 Account Number",
      placeholder: "Your broker account number",
    },
    brokerName: {
      enabled: true,
      required: true,
      label: "Broker Name",
      placeholder: "e.g. IC Markets, Exness",
    },
    serverName: {
      enabled: true,
      required: true,
      label: "Server Name",
      placeholder: "e.g. ICMarkets-Demo, Exness-MT5Real",
    },
    tradingPassword: {
      enabled: true,
      required: true,
      label: "Trading Password",
      placeholder: "Trading password",
    },
    details: { enabled: true, required: false, label: "Additional Details" },
  },
  profitSharing: {
    enabled: true,
    required: true,
    label: "Profit Sharing",
    min: 10,
    max: 50,
    default: 30,
    step: 5,
  },
  copyTradingDetailsPlaceholder:
    "Preferred trading pairs, risk tolerance, maximum lot size, etc.",
  accountHandlingDetailsPlaceholder:
    "Current account balance, preferred strategy type, risk appetite, etc.",
};

export function mergeMt5RelayFormConfig(raw?: Partial<Mt5RelayFormConfig> | null): Mt5RelayFormConfig {
  if (!raw) return DEFAULT_MT5_RELAY_FORM_CONFIG;
  return {
    ...DEFAULT_MT5_RELAY_FORM_CONFIG,
    ...raw,
    fields: {
      ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields,
      ...(raw.fields || {}),
      platform: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.platform, ...(raw.fields?.platform || {}) },
      accountNumber: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.accountNumber, ...(raw.fields?.accountNumber || {}) },
      brokerName: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.brokerName, ...(raw.fields?.brokerName || {}) },
      serverName: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.serverName, ...(raw.fields?.serverName || {}) },
      tradingPassword: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.tradingPassword, ...(raw.fields?.tradingPassword || {}) },
      details: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.fields.details, ...(raw.fields?.details || {}) },
    },
    profitSharing: { ...DEFAULT_MT5_RELAY_FORM_CONFIG.profitSharing, ...(raw.profitSharing || {}) },
    copyTradingDetailsPlaceholder:
      raw.copyTradingDetailsPlaceholder || DEFAULT_MT5_RELAY_FORM_CONFIG.copyTradingDetailsPlaceholder,
    accountHandlingDetailsPlaceholder:
      raw.accountHandlingDetailsPlaceholder || DEFAULT_MT5_RELAY_FORM_CONFIG.accountHandlingDetailsPlaceholder,
  };
}

export function buildMt5RelayDetails(payload: {
  platform?: string;
  brokerName?: string;
  serverName?: string;
  details?: string;
}): string | null {
  const parts: string[] = [];
  if (payload.platform) parts.push(`Platform: ${payload.platform.toUpperCase()}`);
  if (payload.brokerName?.trim()) parts.push(`Broker: ${payload.brokerName.trim()}`);
  if (payload.serverName?.trim()) parts.push(`Server: ${payload.serverName.trim()}`);
  if (payload.details?.trim()) parts.push(payload.details.trim());
  return parts.length ? parts.join(" | ") : null;
}

export function validateMt5RelayPayload(
  body: Record<string, unknown>,
  config: Mt5RelayFormConfig,
): string | null {
  const { fields, profitSharing } = config;

  if (fields.platform.enabled && fields.platform.required && !body.platform) {
    return `${fields.platform.label} is required`;
  }
  if (fields.accountNumber.enabled && fields.accountNumber.required && !String(body.accountNumber || "").trim()) {
    return `${fields.accountNumber.label} is required`;
  }
  if (fields.brokerName.enabled && fields.brokerName.required && !String(body.brokerName || "").trim()) {
    return `${fields.brokerName.label} is required`;
  }
  if (fields.serverName.enabled && fields.serverName.required && !String(body.serverName || "").trim()) {
    return `${fields.serverName.label} is required`;
  }
  if (fields.tradingPassword?.enabled && fields.tradingPassword.required) {
    const pw = String(body.tradingPassword || "");
    if (!pw || pw.length < 4) return `${fields.tradingPassword.label} is required`;
  }
  if (fields.details.enabled && fields.details.required && !String(body.details || "").trim()) {
    return `${fields.details.label} is required`;
  }
  if (profitSharing.enabled && profitSharing.required) {
    const pct = Number(body.profitSharingPercent);
    if (!Number.isFinite(pct)) return `${profitSharing.label} is required`;
    if (pct < profitSharing.min || pct > profitSharing.max) {
      return `${profitSharing.label} must be between ${profitSharing.min}% and ${profitSharing.max}%`;
    }
  }
  return null;
}
