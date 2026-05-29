import { useState } from "react";
import type { ReactNode } from "react";
import { IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PaymentBrandItem } from "@/lib/payment-method-catalog";
import { resolvePaymentBrandLogoUrl, resolvePaymentBrandLogoFallback, PAYMENT_BRAND_CDN } from "@/lib/payment-brand-logos";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";

const CRYPTO_SYMBOL_MAP: Record<string, { symbol: string; network?: string }> = {
  btc: { symbol: "BTC" },
  eth: { symbol: "ETH" },
  "usdt-trc20": { symbol: "USDT", network: "TRC20" },
  "usdt-bep20": { symbol: "USDT", network: "BEP20" },
  usdt: { symbol: "USDT" },
  bnb: { symbol: "BNB" },
};

function BrandLogoImage({
  src,
  alt,
  brandId,
  className,
  fallback,
}: {
  src: string;
  alt: string;
  brandId?: string;
  className?: string;
  fallback?: ReactNode;
}) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return fallback ? <>{fallback}</> : (
      <span className="text-[10px] font-bold text-slate-600 px-1">{alt}</span>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("object-contain max-h-full max-w-full", className)}
      onError={() => {
        if (brandId) {
          const next = resolvePaymentBrandLogoFallback(brandId, currentSrc);
          if (next) {
            setCurrentSrc(next);
            return;
          }
        }
        setFailed(true);
      }}
    />
  );
}

function UpiAppWithBadgeLogo({ appId }: { appId: "gpay" | "phonepe" | "paytm" }) {
  return (
    <div className="flex flex-col items-center gap-0.5 w-full">
      <BrandLogoImage
        src={resolvePaymentBrandLogoUrl(appId)}
        alt={appId}
        brandId={appId}
        className="h-6 sm:h-7 w-auto"
      />
      <BrandLogoImage
        src={resolvePaymentBrandLogoUrl("upi")}
        alt="UPI"
        brandId="upi"
        className="h-3 w-auto"
      />
    </div>
  );
}

function BrandGlyph({ item, iconOnly }: { item: PaymentBrandItem; iconOnly?: boolean }) {
  const id = item.id;

  if (item.category === "digital_rupee") {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-teal-500/15 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/30">
          <IndianRupee className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
        <span className="text-[9px] sm:text-[10px] font-bold leading-none text-teal-700 dark:text-teal-300">
          {item.shortLabel || "e₹"}
        </span>
      </div>
    );
  }

  if (item.category === "crypto") {
    const logoUrl = resolvePaymentBrandLogoUrl(id);
    if (PAYMENT_BRAND_CDN[id]) {
      return (
        <BrandLogoImage
          src={logoUrl}
          alt={item.label}
          brandId={id}
          className="h-8 w-8 sm:h-9 sm:w-9"
          fallback={
            <CryptoAssetIcon
              symbol={CRYPTO_SYMBOL_MAP[id]?.symbol || item.shortLabel || item.label}
              network={CRYPTO_SYMBOL_MAP[id]?.network || item.network}
              size="sm"
              className="!h-9 !w-9 sm:!h-10 sm:!w-10"
            />
          }
        />
      );
    }
    const meta = CRYPTO_SYMBOL_MAP[id] || { symbol: item.shortLabel || item.label };
    return (
      <CryptoAssetIcon
        symbol={meta.symbol}
        network={meta.network || item.network}
        size="sm"
        className="!h-9 !w-9 sm:!h-10 sm:!w-10"
      />
    );
  }

  if (item.upiBadge && (id === "gpay" || id === "phonepe" || id === "paytm")) {
    return <UpiAppWithBadgeLogo appId={id} />;
  }

  const logoUrl = resolvePaymentBrandLogoUrl(id);
  return (
    <BrandLogoImage
      src={logoUrl}
      alt={item.label}
      brandId={id}
      className={cn(
        "h-6 sm:h-8 w-auto",
        id === "netbanking" || id === "bhim" ? "h-7 sm:h-9" : "",
      )}
      fallback={
        !iconOnly ? (
          <span className={cn("text-xs sm:text-sm font-bold leading-none text-center px-0.5", item.accentClass)}>
            {item.shortLabel || item.label}
          </span>
        ) : undefined
      }
    />
  );
}

export function PaymentMethodBrandTile({
  item,
  compact,
  iconOnly,
  className,
}: {
  item: PaymentBrandItem;
  compact?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const isCrypto = item.category === "crypto";

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border min-w-0 text-center",
        compact ? "p-2 min-h-[4.5rem]" : "p-2.5 sm:p-3 min-h-[5rem] sm:min-h-[5.5rem]",
        item.tileClass,
        className,
      )}
      title={item.label}
    >
      <div className="flex items-center justify-center min-h-[2.25rem] sm:min-h-[2.5rem] shrink-0 w-full px-1">
        <BrandGlyph item={item} iconOnly={iconOnly} />
      </div>
      {!iconOnly && (
        <>
          <p className="text-[9px] sm:text-[10px] font-semibold leading-tight line-clamp-2 w-full text-slate-700 dark:text-slate-800 break-words [overflow-wrap:break-word]">
            {item.shortLabel || item.label}
          </p>
          {item.subtitle && !compact && (
            <p className="text-[8px] text-slate-500 leading-tight line-clamp-1 w-full">
              {item.subtitle}
            </p>
          )}
        </>
      )}
      {iconOnly && isCrypto && (
        <p className="text-[9px] sm:text-[10px] font-bold leading-tight text-slate-700 dark:text-slate-800">
          {item.shortLabel}
          {item.network && <span className="block text-[8px] font-semibold text-slate-500">{item.network}</span>}
        </p>
      )}
    </div>
  );
}
