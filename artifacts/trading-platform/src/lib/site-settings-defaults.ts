import type { SiteSetting } from "@workspace/api-client-react";

export const DEFAULT_SITE_SETTINGS: SiteSetting[] = [
  { key: "site_name", value: "Kuber Quant", label: "Site Name", category: "general", description: "Full platform name used in emails and metadata" },
  { key: "site_tagline", value: "Where Wealth Multiplies", label: "Tagline", category: "general", description: "Hero tagline on landing page" },
  { key: "announcement_text", value: "", label: "Announcement Text", category: "general", description: "Global banner shown to all users (leave empty to hide)" },
  { key: "announcement_enabled", value: "false", label: "Announcement Enabled", category: "general", description: "Show/hide the global announcement banner" },
  { key: "maintenance_mode", value: "false", label: "Maintenance Mode", category: "general", description: "Puts the platform in maintenance mode" },
  { key: "maintenance_description", value: "We are performing scheduled maintenance to improve your experience.", label: "Maintenance Description", category: "general", description: "Main message shown on the maintenance page" },
  { key: "maintenance_notice", value: "Please check back soon. Thank you for your patience.", label: "Maintenance Notice", category: "general", description: "Additional notice for users on the maintenance page" },
  { key: "screenshot_protection_enabled", value: "true", label: "Screenshot Protection", category: "security", description: "Block in-app copy, print, and capture shortcuts; blur content when backgrounded" },
  { key: "screenshot_watermark_enabled", value: "true", label: "Screenshot Watermark", category: "security", description: "Overlay user-identifying watermark to trace leaked captures" },
  { key: "screenshot_watermark_opacity", value: "0.03", label: "Watermark Opacity", category: "security", description: "Watermark transparency (0.02–0.15; lower = more transparent)" },
  { key: "footer_text", value: "© 2025 Kuber Quant. All rights reserved.", label: "Footer Text", category: "general", description: "Footer copyright text" },
  { key: "support_email", value: "support@kuberquant.com", label: "Support Email", category: "contact", description: "Primary support email address" },
  { key: "support_phone", value: "", label: "Support Phone", category: "contact", description: "Support phone number" },
  { key: "support_telegram", value: "", label: "Telegram Handle", category: "contact", description: "Telegram username or link" },
  { key: "support_whatsapp", value: "", label: "WhatsApp Number", category: "contact", description: "WhatsApp support number" },
  { key: "referral_commission_rate", value: "5", label: "Referral Commission %", category: "financial", description: "Percentage commission paid on referral investments" },
  { key: "min_deposit_fiat", value: "100", label: "Min Fiat Deposit ($)", category: "financial", description: "Minimum fiat deposit amount" },
  { key: "trading_service_min_deposit_usd", value: "100", label: "Trading Services Min Deposit ($ / USDT)", category: "financial", description: "Minimum initial deposit for copy trading, algo trading, account handling, and MT4/MT5 linking" },
  { key: "trading_service_min_deposit_inr", value: "10000", label: "Trading Services Min Deposit (₹)", category: "financial", description: "Minimum initial INR deposit for trading services (live FX also applies)" },
  { key: "min_withdrawal_fiat", value: "50", label: "Min Fiat Withdrawal ($)", category: "financial", description: "Minimum fiat withdrawal amount" },
  { key: "withdrawal_fee_percent", value: "2", label: "Withdrawal Fee %", category: "financial", description: "Percentage fee deducted on withdrawals" },
  { key: "usd_inr_rate", value: "83.5", label: "USD → INR Rate", category: "financial", description: "1 USD in INR (auto-refreshed daily)" },
  { key: "usd_eur_rate", value: "0.92", label: "USD → EUR Rate", category: "financial", description: "1 USD in EUR (auto-refreshed daily)" },
  { key: "usdt_usd_rate", value: "1", label: "USDT → USD Rate", category: "financial", description: "USDT peg to USD" },
  { key: "fx_rates_updated_at", value: "", label: "FX Rates Updated At", category: "financial", description: "ISO timestamp of last FX refresh" },
  { key: "fx_rates_source", value: "fallback", label: "FX Rates Source", category: "financial", description: "Data source for exchange rates" },
  { key: "kyc_required", value: "true", label: "KYC Required", category: "financial", description: "Require KYC before deposits/withdrawals" },
  { key: "auto_approve_gateway_deposits", value: "false", label: "Auto-Approve Gateway Deposits", category: "financial", description: "Automatically credit wallet when Razorpay/other verified gateway payments succeed (recommended OFF for production)" },
  { key: "dual_approval_threshold_usd", value: "10000", label: "Dual Approval Threshold ($)", category: "financial", description: "Deposits/withdrawals above this USD amount require two different admin approvals" },
  { key: "withdrawal_requires_2fa", value: "true", label: "Withdrawal Requires 2FA", category: "security", description: "Users must enable 2FA before requesting withdrawals" },
  { key: "withdrawal_cooldown_hours", value: "24", label: "Withdrawal Cooldown (hours)", category: "security", description: "Block withdrawals for N hours after password change" },
  { key: "withdrawal_block_new_ip", value: "false", label: "Block Withdrawals From New IP", category: "security", description: "Block withdrawals from IPs not seen in the last 24 hours" },
  { key: "withdrawal_large_amount_usd", value: "5000", label: "Large Withdrawal Threshold ($)", category: "security", description: "Amount requiring 2FA even if general 2FA setting is off" },
  { key: "system_reviewer_user_id", value: "", label: "System Reviewer User ID", category: "financial", description: "User ID used for auto-approved gateway deposits (defaults to first super admin)" },
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
  "auto_approve_gateway_deposits",
  "withdrawal_requires_2fa",
  "withdrawal_block_new_ip",
  "google_oauth_enabled",
  "screenshot_protection_enabled",
  "screenshot_watermark_enabled",
]);

/** Managed by the dedicated Maintenance Mode panel — hidden from the general accordion. */
export const MAINTENANCE_SETTING_KEYS = new Set([
  "maintenance_mode",
  "maintenance_description",
  "maintenance_notice",
]);

/** Managed by the Screenshot Protection panel — hidden from the general accordion. */
export const SECURITY_SETTING_KEYS = new Set([
  "screenshot_protection_enabled",
  "screenshot_watermark_enabled",
  "screenshot_watermark_opacity",
]);

export const TEXTAREA_SETTING_KEYS = new Set([
  "maintenance_description",
  "maintenance_notice",
  "announcement_text",
]);

export function mergeSiteSettings(apiSettings?: SiteSetting[]): SiteSetting[] {
  const map = new Map<string, SiteSetting>();
  for (const s of DEFAULT_SITE_SETTINGS) map.set(s.key, { ...s });
  for (const s of apiSettings || []) {
    map.set(s.key, { ...map.get(s.key), ...s, category: s.category || map.get(s.key)?.category || "general" });
  }
  return Array.from(map.values());
}
