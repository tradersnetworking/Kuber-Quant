import type { SiteSetting } from "@workspace/api-client-react";

export const DEFAULT_SITE_SETTINGS: SiteSetting[] = [
  { key: "site_name", value: "Kuber Quant", label: "Site Name", category: "general", description: "Full platform name used in emails and metadata" },
  { key: "site_tagline", value: "Where Wealth Multiplies", label: "Tagline", category: "general", description: "Hero tagline on landing page" },
  { key: "announcement_text", value: "", label: "Announcement Text", category: "general", description: "Global banner shown to all users (leave empty to hide)" },
  { key: "announcement_enabled", value: "false", label: "Announcement Enabled", category: "general", description: "Show/hide the global announcement banner" },
  { key: "maintenance_mode", value: "false", label: "Maintenance Mode", category: "general", description: "Puts the platform in maintenance mode" },
  { key: "footer_text", value: "© 2025 Kuber Quant. All rights reserved.", label: "Footer Text", category: "general", description: "Footer copyright text" },
  { key: "support_email", value: "support@kuberquant.com", label: "Support Email", category: "contact", description: "Primary support email address" },
  { key: "support_phone", value: "", label: "Support Phone", category: "contact", description: "Support phone number" },
  { key: "support_telegram", value: "", label: "Telegram Handle", category: "contact", description: "Telegram username or link" },
  { key: "support_whatsapp", value: "", label: "WhatsApp Number", category: "contact", description: "WhatsApp support number" },
  { key: "referral_commission_rate", value: "5", label: "Referral Commission %", category: "financial", description: "Percentage commission paid on referral investments" },
  { key: "min_deposit_fiat", value: "100", label: "Min Fiat Deposit ($)", category: "financial", description: "Minimum fiat deposit amount" },
  { key: "min_withdrawal_fiat", value: "50", label: "Min Fiat Withdrawal ($)", category: "financial", description: "Minimum fiat withdrawal amount" },
  { key: "withdrawal_fee_percent", value: "2", label: "Withdrawal Fee %", category: "financial", description: "Percentage fee deducted on withdrawals" },
  { key: "usd_inr_rate", value: "83.5", label: "USD → INR Rate", category: "financial", description: "1 USD in INR (auto-refreshed daily)" },
  { key: "usd_eur_rate", value: "0.92", label: "USD → EUR Rate", category: "financial", description: "1 USD in EUR (auto-refreshed daily)" },
  { key: "usdt_usd_rate", value: "1", label: "USDT → USD Rate", category: "financial", description: "USDT peg to USD" },
  { key: "fx_rates_updated_at", value: "", label: "FX Rates Updated At", category: "financial", description: "ISO timestamp of last FX refresh" },
  { key: "fx_rates_source", value: "fallback", label: "FX Rates Source", category: "financial", description: "Data source for exchange rates" },
  { key: "kyc_required", value: "true", label: "KYC Required", category: "financial", description: "Require KYC before deposits/withdrawals" },
  { key: "site_title_gold", value: "Kuber", label: "Header Title (Gold Part)", category: "appearance", description: "First part of the header title — shown in gold" },
  { key: "site_title_silver", value: "Quant", label: "Header Title (Silver Part)", category: "appearance", description: "Second part of the header title — shown in silver" },
  { key: "site_title_gold_color", value: "#D4AF37", label: "Gold Title Color", category: "appearance", description: "Hex color for the gold title word (default: #D4AF37)" },
  { key: "site_title_silver_color", value: "#C0C0C0", label: "Silver Title Color", category: "appearance", description: "Hex color for the silver title word (default: #C0C0C0)" },
  { key: "logo_url", value: "/kuber-quant-logo.png", label: "Logo URL", category: "appearance", description: "URL of the platform logo image" },
  { key: "favicon_url", value: "/favicon.png", label: "Favicon URL", category: "appearance", description: "URL of the favicon image" },
  { key: "primary_color", value: "#D4AF37", label: "Primary Color", category: "appearance", description: "Brand primary/accent color (hex)" },
  { key: "google_oauth_enabled", value: "false", label: "Google OAuth Enabled", category: "authentication", description: "Allow users to sign in with Google on the login page" },
  { key: "google_client_id", value: "", label: "Google OAuth Client ID", category: "authentication", description: "OAuth 2.0 Client ID from Google Cloud Console (overrides env if set)" },
];

export const BOOL_SETTING_KEYS = new Set([
  "announcement_enabled",
  "maintenance_mode",
  "kyc_required",
  "google_oauth_enabled",
]);

export function mergeSiteSettings(apiSettings?: SiteSetting[]): SiteSetting[] {
  const map = new Map<string, SiteSetting>();
  for (const s of DEFAULT_SITE_SETTINGS) map.set(s.key, { ...s });
  for (const s of apiSettings || []) {
    map.set(s.key, { ...map.get(s.key), ...s, category: s.category || map.get(s.key)?.category || "general" });
  }
  return Array.from(map.values());
}
