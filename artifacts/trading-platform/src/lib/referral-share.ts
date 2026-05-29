import {
  drawShareCardBackground,
  drawShareCardFooter,
  drawSiteLogoTitleRow,
  getShareTypographyScale,
  scaledLayout,
  SHARE_CARD_SIZE,
  SHARE_LAYOUT,
  wrapText,
} from "@/lib/share-image-utils";

export type ReferralSharePlatform = "whatsapp" | "telegram" | "email" | "sms";

export interface ReferralShareContent {
  title: string;
  message: string;
  link: string;
  code: string;
}

export function buildReferralShareContent(opts: {
  link: string;
  code: string;
  inviterName: string;
  siteName?: string;
}): ReferralShareContent {
  const site = opts.siteName || "Kuber Quant";
  const title = `Join ${site} — Algorithmic Trading & Wealth Management`;
  const message = [
    `${opts.inviterName} invited you to join ${site}!`,
    "",
    "Start investing with institutional-grade algo trading, wealth management, and crypto services.",
    "",
    `Sign up here: ${opts.link}`,
    `Invite code: ${opts.code}`,
    "",
    "When you register and join, your referral will be linked automatically.",
  ].join("\n");

  return { title, message, link: opts.link, code: opts.code };
}

export function getReferralSharePlatformUrl(platform: ReferralSharePlatform, content: ReferralShareContent): string {
  const { title, message, link } = content;
  switch (platform) {
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`${title}\n\n${message}`)}`;
    case "email":
      return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(message)}`;
    case "sms":
      return `sms:?&body=${encodeURIComponent(message)}`;
    default:
      return link;
  }
}

export const REFERRAL_SHARE_PLATFORMS: {
  id: ReferralSharePlatform;
  label: string;
  description: string;
  color: string;
}[] = [
  { id: "whatsapp", label: "WhatsApp", description: "Share via WhatsApp chat", color: "bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] border-[#25D366]/30" },
  { id: "telegram", label: "Telegram", description: "Share via Telegram", color: "bg-[#0088cc]/15 text-[#0088cc] border-[#0088cc]/30" },
  { id: "email", label: "Email", description: "Send by email", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
  { id: "sms", label: "Text / SMS", description: "Send as text message", color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30" },
];

export async function generateReferralShareImage(opts: {
  link: string;
  code: string;
  inviterName: string;
  siteName?: string;
  logoUrl?: string;
  avatarUrl?: string | null;
}): Promise<Blob> {
  const site = opts.siteName || "Kuber Quant";
  const size = SHARE_CARD_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const centerX = size / 2;

  drawShareCardBackground(ctx, size, size, "referral");

  const scale = getShareTypographyScale(size, { hasInviteCode: true });
  const SL = scaledLayout(scale);

  let y = await drawSiteLogoTitleRow(ctx, centerX, SL.padTop, site, opts.logoUrl, {
    accent: "#f59e0b",
    logoRadius: SL.logoRadius,
    titleSize: SL.siteTitleSize,
    gapAfter: SL.lineGap.afterLogo,
  });

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#f8fafc";
  ctx.font = `600 ${SL.headlineSize}px system-ui, sans-serif`;
  ctx.fillText("You're Invited!", centerX, y + SL.headlineSize);
  y += SL.headlineSize + SL.lineGap.afterHeadline;

  ctx.fillStyle = "#cbd5e1";
  ctx.font = `400 ${SL.serviceSize}px system-ui, sans-serif`;
  y = wrapText(
    ctx,
    "Join premium algo trading & wealth management.",
    centerX,
    y + SL.serviceSize,
    size - SHARE_LAYOUT.padX * 2,
    SL.serviceSize + 8,
  ) + SL.lineGap.afterService;

  await drawShareCardFooter(ctx, {
    centerX,
    canvasHeight: size,
    contentBottomY: y,
    link: opts.link,
    referralCode: opts.code,
    userName: opts.inviterName,
    avatarUrl: opts.avatarUrl,
    userAccent: "#f59e0b",
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to create share image"));
    }, "image/png", 0.92);
  });
}

export async function shareReferralWithImage(content: ReferralShareContent, imageBlob: Blob) {
  const file = new File([imageBlob], "kuber-quant-referral.png", { type: "image/png" });
  if (navigator.share) {
    const payload: ShareData = {
      title: content.title,
      text: content.message,
      url: content.link,
    };
    if (navigator.canShare?.({ ...payload, files: [file] })) {
      await navigator.share({ ...payload, files: [file] });
      return true;
    }
    if (navigator.canShare?.(payload)) {
      await navigator.share(payload);
      return true;
    }
  }
  return false;
}

export function downloadReferralImage(blob: Blob, code: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `kuber-quant-referral-${code}.png`;
  a.click();
  URL.revokeObjectURL(url);
}
