import {
  drawShareCardBackground,
  drawShareCardFooter,
  drawSiteLogoTitleRow,
  getShareTypographyScale,
  scaledLayout,
  SHARE_CARD_SIZE,
  SHARE_LAYOUT,
} from "@/lib/share-image-utils";
import { buildReferralLink } from "@/lib/referral-attribution";
import {
  REFERRAL_SHARE_PLATFORMS,
  getReferralSharePlatformUrl,
  shareReferralWithImage,
  type ReferralSharePlatform,
} from "@/lib/referral-share";

export type ProfitShareService =
  | "investment"
  | "copy_trading"
  | "algo_trading"
  | "mt5_handling"
  | "ea_strategy"
  | "trade_history"
  | "withdrawal";

export const PROFIT_SERVICE_LABELS: Record<ProfitShareService, string> = {
  investment: "Investment Plan",
  copy_trading: "Copy Trading",
  algo_trading: "Algo Trading",
  mt5_handling: "MT4/MT5 Account Handling",
  ea_strategy: "EA Strategy",
  trade_history: "Trade History",
  withdrawal: "Wallet Withdrawal",
};

export interface ProfitSharePayload {
  service: ProfitShareService;
  profitAmount: number;
  currency?: string;
  detailLabel?: string;
  profitPercent?: number;
  userName: string;
  referralCode?: string;
  siteName?: string;
  avatarUrl?: string | null;
  /** Withdrawal share: submitted = just requested, completed = approved/paid */
  withdrawalPhase?: "submitted" | "completed";
}

export function calculateTradeProfitPercent(trade: {
  type: string;
  entryPrice: number | string;
  exitPrice?: number | null;
  profitLoss?: number | null;
  amount?: number | string;
}): number | null {
  const entry = Number(trade.entryPrice);
  const exit = trade.exitPrice != null ? Number(trade.exitPrice) : null;
  if (entry > 0 && exit != null && !Number.isNaN(exit)) {
    const raw = trade.type === "sell" ? (entry - exit) / entry : (exit - entry) / entry;
    return raw * 100;
  }
  const pnl = trade.profitLoss != null ? Number(trade.profitLoss) : null;
  const amount = Number(trade.amount) || 1;
  if (pnl != null && entry > 0 && amount > 0) {
    const notional = entry * amount;
    if (notional > 0) return (pnl / notional) * 100;
  }
  return null;
}

export function buildProfitShareLink(payload: ProfitSharePayload): string {
  const base = payload.referralCode
    ? buildReferralLink(payload.referralCode)
    : `${typeof window !== "undefined" ? window.location.origin : ""}/register`;
  const url = new URL(base, typeof window !== "undefined" ? window.location.origin : "https://kuberquant.com");
  url.searchParams.set("utm_source", payload.service === "withdrawal" ? "withdrawal_share" : "profit_share");
  url.searchParams.set("utm_campaign", payload.service);
  return url.toString();
}

function formatAmount(payload: ProfitSharePayload) {
  const currency = (payload.currency || "USD").toUpperCase();
  const amount = Math.abs(payload.profitAmount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === "INR") return `₹${amount} INR`;
  if (currency === "USD") return `$${amount} USD`;
  if (currency === "EUR") return `€${amount} EUR`;
  if (currency === "BTC" || currency === "ETH" || currency === "USDT") {
    return `${amount} ${currency}`;
  }
  return `${amount} ${currency}`;
}

export function buildProfitShareContent(payload: ProfitSharePayload) {
  const site = payload.siteName || "Kuber Quant";
  const serviceLabel = PROFIT_SERVICE_LABELS[payload.service];
  const amountText = formatAmount(payload);
  const percentText = payload.profitPercent != null && !Number.isNaN(payload.profitPercent)
    ? `${payload.profitPercent >= 0 ? "+" : ""}${payload.profitPercent.toFixed(2)}%`
    : "";
  const link = buildProfitShareLink(payload);
  const isWithdrawal = payload.service === "withdrawal";
  const withdrawalSubmitted = isWithdrawal && payload.withdrawalPhase === "submitted";

  const title = isWithdrawal
    ? withdrawalSubmitted
      ? `${payload.userName} submitted a withdrawal on ${site}`
      : `${payload.userName} withdrew from ${site}`
    : `${payload.userName} booked profit on ${site}`;

  const message = isWithdrawal
    ? [
        withdrawalSubmitted
          ? `${payload.userName} submitted a withdrawal of ${amountText} on ${site}!`
          : `${payload.userName} successfully withdrew ${amountText} from ${site}!`,
        payload.detailLabel ? `Payout: ${payload.detailLabel}` : "",
        withdrawalSubmitted ? "Pending admin approval." : "",
        "",
        "Join the platform and start your trading journey:",
        link,
        payload.referralCode ? `Invite code: ${payload.referralCode}` : "",
      ].filter(Boolean).join("\n")
    : [
        `${payload.userName} just booked ${amountText}${percentText ? ` (${percentText} ROI)` : ""} with ${serviceLabel} on ${site}!`,
        payload.detailLabel ? `Details: ${payload.detailLabel}` : "",
        "",
        "Join the platform and start your trading journey:",
        link,
        payload.referralCode ? `Invite code: ${payload.referralCode}` : "",
      ].filter(Boolean).join("\n");

  return {
    title,
    message,
    link,
    code: payload.referralCode || "",
    profitText: amountText,
    percentText,
    serviceLabel,
    isWithdrawal,
    withdrawalSubmitted,
  };
}

export { REFERRAL_SHARE_PLATFORMS, getReferralSharePlatformUrl, shareReferralWithImage };
export type { ReferralSharePlatform };

export async function generateProfitShareImage(
  payload: ProfitSharePayload & { logoUrl?: string },
): Promise<Blob> {
  const site = payload.siteName || "Kuber Quant";
  const content = buildProfitShareContent(payload);
  const link = content.link;
  const isWithdrawal = content.isWithdrawal;
  const withdrawalSubmitted = content.withdrawalSubmitted;
  const size = SHARE_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const centerX = size / 2;

  drawShareCardBackground(
    ctx,
    size,
    size,
    isWithdrawal
      ? withdrawalSubmitted ? "withdrawal-pending" : "withdrawal"
      : "profit",
  );

  const accent = isWithdrawal
    ? withdrawalSubmitted ? "#f59e0b" : "#f87171"
    : "#22c55e";

  const hasDetail = Boolean(payload.detailLabel && payload.detailLabel !== content.serviceLabel);
  const scale = getShareTypographyScale(size, {
    hasDetail,
    hasRoi: Boolean(content.percentText && !isWithdrawal),
    hasInviteCode: Boolean(payload.referralCode),
  });
  const SL = scaledLayout(scale);

  let y = await drawSiteLogoTitleRow(ctx, centerX, SL.padTop, site, payload.logoUrl, {
    accent: "#f59e0b",
    logoRadius: SL.logoRadius,
    titleSize: SL.siteTitleSize,
    gapAfter: SL.lineGap.afterLogo,
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = accent;
  ctx.font = `bold ${SL.headlineSize}px system-ui, sans-serif`;
  const headline = isWithdrawal
    ? withdrawalSubmitted ? "Withdrawal Submitted!" : "Withdrawal Done!"
    : "Profit Booked!";
  ctx.fillText(headline, centerX, y + SL.headlineSize);
  y += SL.headlineSize + SL.lineGap.afterHeadline;

  ctx.fillStyle = "#f8fafc";
  ctx.font = `600 ${SL.serviceSize}px system-ui, sans-serif`;
  ctx.fillText(content.serviceLabel, centerX, y + SL.serviceSize);
  y += SL.serviceSize + SL.lineGap.afterService;

  if (hasDetail) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = `500 ${SL.detailSize}px system-ui, sans-serif`;
    ctx.fillText(payload.detailLabel!, centerX, y + SL.detailSize);
    y += SL.detailSize + SL.lineGap.afterDetail;
  }

  ctx.fillStyle = isWithdrawal ? "#fca5a5" : "#4ade80";
  ctx.font = `bold ${SL.amountSize}px system-ui, sans-serif`;
  const amountLine = isWithdrawal ? content.profitText : `+${content.profitText}`;
  ctx.fillText(amountLine, centerX, y + SL.amountSize);
  y += SL.amountSize + SL.lineGap.afterAmount;

  if (content.percentText && !isWithdrawal) {
    ctx.fillStyle = "#86efac";
    ctx.font = `600 ${SL.roiSize}px system-ui, sans-serif`;
    ctx.fillText(content.percentText, centerX, y + SL.roiSize);
    y += SL.roiSize + SL.lineGap.afterRoi;
  }

  await drawShareCardFooter(ctx, {
    centerX,
    canvasHeight: size,
    contentBottomY: y,
    link,
    referralCode: payload.referralCode,
    userName: payload.userName,
    avatarUrl: payload.avatarUrl,
    userAccent: accent,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create share image"));
    }, "image/png", 0.92);
  });
}

export function downloadProfitShareImage(blob: Blob, service: ProfitShareService) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kuber-quant-${service === "withdrawal" ? "withdrawal" : "profit"}-${service}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
