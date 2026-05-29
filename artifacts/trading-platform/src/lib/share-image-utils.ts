import { resolveMediaUrl } from "@/lib/media-url";

export const SHARE_CARD_SIZE = 1080;

/** Layout tokens tuned for 1080×1080 share cards. */
export const SHARE_LAYOUT = {
  padX: 36,
  padTop: 32,
  padBottom: 24,
  logoRadius: 64,
  siteTitleSize: 62,
  headlineSize: 56,
  serviceSize: 38,
  detailSize: 30,
  amountSize: 92,
  roiSize: 42,
  inviteLabelSize: 32,
  inviteCodeSize: 62,
  userRadius: 52,
  userNameSize: 40,
  qrMin: 300,
  qrMax: 420,
  lineGap: {
    afterLogo: 28,
    afterHeadline: 30,
    afterService: 20,
    afterDetail: 20,
    afterAmount: 18,
    afterRoi: 24,
    beforeQr: 20,
    afterQr: 26,
    afterInviteLabel: 10,
    afterInviteCode: 18,
  },
} as const;

export function getUserInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getSiteInitials(siteName: string): string {
  const parts = siteName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return siteName.slice(0, 2).toUpperCase() || "KQ";
}

export function buildJohnInvestorAvatarDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#4338ca"/>
      </linearGradient>
    </defs>
    <rect width="256" height="256" rx="128" fill="url(#bg)"/>
    <circle cx="128" cy="96" r="46" fill="#fcd34d"/>
    <ellipse cx="128" cy="218" rx="72" ry="56" fill="#fcd34d"/>
    <circle cx="108" cy="88" r="6" fill="#1e293b"/>
    <circle cx="148" cy="88" r="6" fill="#1e293b"/>
    <path d="M112 112 Q128 124 144 112" stroke="#1e293b" stroke-width="4" fill="none" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function resolveImageUrl(src?: string | null): string | undefined {
  return resolveMediaUrl(src);
}

export function resolveShareAvatarUrl(userName: string, avatarUrl?: string | null): string | undefined {
  const uploaded = resolveImageUrl(avatarUrl);
  if (uploaded) return uploaded;
  const name = userName.trim().toLowerCase();
  if (name === "john investor" || name.includes("john investor")) {
    return buildJohnInvestorAvatarDataUrl();
  }
  return undefined;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let drawY = y;
  for (let i = 0; i < words.length; i++) {
    const test = `${line}${words[i]} `;
    if (ctx.measureText(test).width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), x, drawY);
      line = `${words[i]} `;
      drawY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, drawY);
  return drawY;
}

export async function drawCircleAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  opts: {
    imageUrl?: string | null;
    userName?: string;
    fallbackText: string;
    accent?: string;
    strokeWidth?: number;
    fillAlpha?: string;
  },
) {
  const accent = opts.accent ?? "#f59e0b";
  const strokeWidth = opts.strokeWidth ?? 5;

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = opts.fillAlpha ?? "rgba(255,255,255,0.08)";
  ctx.fill();
  ctx.lineWidth = strokeWidth;
  ctx.strokeStyle = accent;
  ctx.stroke();
  ctx.restore();

  const resolved = opts.userName
    ? resolveShareAvatarUrl(opts.userName, opts.imageUrl)
    : resolveImageUrl(opts.imageUrl);

  let drewImage = false;
  if (resolved) {
    try {
      const img = await loadImage(resolved);
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
      ctx.restore();
      drewImage = true;
    } catch {
      drewImage = false;
    }
  }

  if (!drewImage) {
    ctx.fillStyle = "#f8fafc";
    ctx.font = `bold ${Math.min(56, Math.round(radius * 0.72))}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(opts.fallbackText, cx, cy);
  }
}

export async function drawSiteLogoTitleRow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  startY: number,
  siteName: string,
  logoUrl?: string,
  opts?: { logoRadius?: number; titleSize?: number; accent?: string; gapAfter?: number },
): Promise<number> {
  const L = SHARE_LAYOUT;
  const logoRadius = opts?.logoRadius ?? L.logoRadius;
  const titleSize = opts?.titleSize ?? L.siteTitleSize;
  const accent = opts?.accent ?? "#f59e0b";
  const gapAfter = opts?.gapAfter ?? L.lineGap.afterLogo;
  const gap = 20;
  const circleY = startY + logoRadius;

  ctx.font = `bold ${titleSize}px system-ui, sans-serif`;
  const titleWidth = ctx.measureText(siteName).width;
  const rowWidth = logoRadius * 2 + gap + titleWidth;
  const rowStartX = centerX - rowWidth / 2;
  const circleX = rowStartX + logoRadius;
  const titleX = rowStartX + logoRadius * 2 + gap;

  await drawCircleAvatar(ctx, circleX, circleY, logoRadius, {
    imageUrl: logoUrl,
    fallbackText: getSiteInitials(siteName),
    accent,
    fillAlpha: "rgba(255,255,255,0.12)",
  });

  ctx.fillStyle = accent;
  ctx.font = `bold ${titleSize}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(siteName, titleX, circleY);

  return circleY + logoRadius + gapAfter;
}

export async function drawUserPhotoNameRow(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  startY: number,
  userName: string,
  avatarUrl?: string | null,
  opts?: { radius?: number; nameSize?: number; accent?: string },
): Promise<number> {
  const L = SHARE_LAYOUT;
  const radius = opts?.radius ?? L.userRadius;
  const nameSize = opts?.nameSize ?? L.userNameSize;
  const accent = opts?.accent ?? "#22c55e";
  const displayName = userName.trim() || "Investor";
  const gap = 18;
  const circleY = startY + radius;

  ctx.font = `600 ${nameSize}px system-ui, sans-serif`;
  const nameWidth = Math.min(ctx.measureText(displayName).width, 640);
  const rowWidth = radius * 2 + gap + nameWidth;
  const rowStartX = centerX - rowWidth / 2;
  const circleX = rowStartX + radius;
  const nameX = rowStartX + radius * 2 + gap;

  await drawCircleAvatar(ctx, circleX, circleY, radius, {
    imageUrl: avatarUrl,
    userName: displayName,
    fallbackText: getUserInitials(displayName),
    accent,
    fillAlpha: "rgba(255,255,255,0.08)",
  });

  ctx.fillStyle = "#f8fafc";
  ctx.font = `600 ${nameSize}px system-ui, sans-serif`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(displayName, nameX, circleY);

  return circleY + radius + 6;
}

export type ShareCardFooterOpts = {
  centerX: number;
  canvasHeight: number;
  contentBottomY: number;
  link: string;
  referralCode?: string;
  userName: string;
  avatarUrl?: string | null;
  userAccent?: string;
};

function measureFooterHeight(hasCode: boolean, qrSize: number, extraGap = 0): number {
  const L = SHARE_LAYOUT;
  let h = L.lineGap.beforeQr + extraGap + qrSize + L.lineGap.afterQr + extraGap;
  if (hasCode) {
    h += L.inviteLabelSize + L.lineGap.afterInviteLabel + L.inviteCodeSize + L.lineGap.afterInviteCode;
  }
  h += L.userRadius * 2 + 8;
  return h;
}

export type ShareContentEstimate = {
  hasDetail?: boolean;
  hasRoi?: boolean;
  hasInviteCode?: boolean;
};

/** Scale typography down slightly when the card would overflow vertically. */
export function getShareTypographyScale(
  canvasHeight: number,
  estimate: ShareContentEstimate,
): number {
  const L = SHARE_LAYOUT;
  let contentH = L.padTop + L.logoRadius * 2 + L.lineGap.afterLogo;
  contentH += L.headlineSize + L.lineGap.afterHeadline;
  contentH += L.serviceSize + L.lineGap.afterService;
  if (estimate.hasDetail) contentH += L.detailSize + L.lineGap.afterDetail;
  contentH += L.amountSize + L.lineGap.afterAmount;
  if (estimate.hasRoi) contentH += L.roiSize + L.lineGap.afterRoi;

  const footerMin = measureFooterHeight(Boolean(estimate.hasInviteCode), 220);
  const needed = contentH + footerMin + L.padBottom;
  if (needed <= canvasHeight) return 1;
  return Math.max(0.84, canvasHeight / needed);
}

export function scaledLayout(scale: number) {
  const L = SHARE_LAYOUT;
  const s = (n: number) => Math.round(n * scale);
  return {
    padTop: s(L.padTop),
    logoRadius: s(L.logoRadius),
    siteTitleSize: s(L.siteTitleSize),
    headlineSize: s(L.headlineSize),
    serviceSize: s(L.serviceSize),
    detailSize: s(L.detailSize),
    amountSize: s(L.amountSize),
    roiSize: s(L.roiSize),
    lineGap: {
      afterLogo: s(L.lineGap.afterLogo),
      afterHeadline: s(L.lineGap.afterHeadline),
      afterService: s(L.lineGap.afterService),
      afterDetail: s(L.lineGap.afterDetail),
      afterAmount: s(L.lineGap.afterAmount),
      afterRoi: s(L.lineGap.afterRoi),
    },
  };
}

export async function drawShareCardFooter(ctx: CanvasRenderingContext2D, opts: ShareCardFooterOpts): Promise<number> {
  const L = SHARE_LAYOUT;
  const QRCode = (await import("qrcode")).default;
  const hasCode = Boolean(opts.referralCode);

  const available = opts.canvasHeight - L.padBottom - opts.contentBottomY;

  // Grow QR to fill slack, then shrink only if needed.
  let qrSize: number = L.qrMin;
  while (qrSize + 8 <= L.qrMax && measureFooterHeight(hasCode, qrSize + 8) <= available) {
    qrSize += 8;
  }
  while (qrSize > 240 && measureFooterHeight(hasCode, qrSize) > available) {
    qrSize -= 8;
  }
  qrSize = Math.max(240, qrSize);

  const footerHeight = measureFooterHeight(hasCode, qrSize);
  const slack = Math.max(0, available - footerHeight);
  const extraGap = Math.min(24, Math.floor(slack / (hasCode ? 4 : 3)));

  const qrY = opts.contentBottomY + L.lineGap.beforeQr + extraGap;

  const qrDataUrl = await QRCode.toDataURL(opts.link, {
    margin: 1,
    width: Math.max(512, qrSize * 2),
    color: { dark: "#0a1628", light: "#ffffff" },
  });
  const qr = await loadImage(qrDataUrl);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, opts.centerX - qrSize / 2 - 16, qrY - 16, qrSize + 32, qrSize + 32, 20);
  ctx.fill();
  ctx.drawImage(qr, opts.centerX - qrSize / 2, qrY, qrSize, qrSize);

  let y = qrY + qrSize + L.lineGap.afterQr + extraGap;

  if (opts.referralCode) {
    ctx.fillStyle = "#e2e8f0";
    ctx.font = `600 ${L.inviteLabelSize}px system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Invite code", opts.centerX, y);
    y += L.inviteLabelSize + L.lineGap.afterInviteLabel;
    ctx.fillStyle = "#f59e0b";
    ctx.font = `bold ${L.inviteCodeSize}px ui-monospace, monospace`;
    ctx.fillText(opts.referralCode, opts.centerX, y);
    y += L.inviteCodeSize + L.lineGap.afterInviteCode;
  }

  return drawUserPhotoNameRow(
    ctx,
    opts.centerX,
    y,
    opts.userName,
    opts.avatarUrl,
    { accent: opts.userAccent ?? "#22c55e" },
  );
}

export function drawShareCardBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  variant: "profit" | "withdrawal" | "withdrawal-pending" | "referral",
) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  if (variant === "withdrawal") {
    gradient.addColorStop(0, "#1a0f0a");
    gradient.addColorStop(0.5, "#2a1410");
    gradient.addColorStop(1, "#1a1208");
  } else if (variant === "withdrawal-pending") {
    gradient.addColorStop(0, "#1a1408");
    gradient.addColorStop(0.5, "#2a2010");
    gradient.addColorStop(1, "#1a1208");
  } else if (variant === "referral") {
    gradient.addColorStop(0, "#0a1628");
    gradient.addColorStop(0.5, "#132743");
    gradient.addColorStop(1, "#1a1208");
  } else {
    gradient.addColorStop(0, "#071a12");
    gradient.addColorStop(0.45, "#0f2e1f");
    gradient.addColorStop(1, "#1a1208");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = variant === "profit"
    ? "rgba(34, 197, 94, 0.1)"
    : variant === "referral"
      ? "rgba(245, 158, 11, 0.08)"
      : variant === "withdrawal-pending"
        ? "rgba(245, 158, 11, 0.08)"
        : "rgba(239, 68, 68, 0.08)";
  ctx.beginPath();
  ctx.arc(width * 0.14, height * 0.1, 120, 0, Math.PI * 2);
  ctx.fill();
}
