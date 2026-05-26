/** Client-side fallback when email-communication API is unavailable */

export const DEFAULT_EMAIL_PURPOSE_META: Record<string, { label: string; description: string; group: string }> = {
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

export const DEFAULT_EMAIL_PURPOSES = Object.keys(DEFAULT_EMAIL_PURPOSE_META);

export const DEFAULT_EMAIL_COMM_CONFIG = {
  identities: [
    { id: "default", label: "Default (SMTP From)", name: "Kuber Quant", address: "" },
    { id: "noreply", label: "No Reply", name: "Kuber Quant", address: "noreply@kuberquant.com" },
    { id: "support", label: "Support", name: "Kuber Quant Support", address: "support@kuberquant.com" },
    { id: "finance", label: "Finance", name: "Kuber Quant Finance", address: "finance@kuberquant.com" },
    { id: "compliance", label: "Compliance / KYC", name: "Kuber Quant Compliance", address: "compliance@kuberquant.com" },
  ],
  assignments: Object.fromEntries(
    DEFAULT_EMAIL_PURPOSES.map(p => [p, "noreply"]),
  ),
  autoEmails: {
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
  },
};
