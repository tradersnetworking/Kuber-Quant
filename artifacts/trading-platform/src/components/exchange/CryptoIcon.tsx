import { cn } from "@/lib/utils";
import { getCryptoAssetIconUrl, getCryptoDisplayName } from "@/components/wallet/crypto-asset-catalog";

type Size = "sm" | "md" | "lg";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const IMG_SIZE: Record<Size, string> = {
  sm: "h-5 w-5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
};

export function CryptoIcon({
  symbol,
  network,
  coinName,
  size = "md",
  className,
}: {
  symbol: string;
  network?: string | null;
  coinName?: string | null;
  size?: Size;
  className?: string;
}) {
  const sym = symbol.toUpperCase();
  const src = getCryptoAssetIconUrl(sym, network);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full ring-1 ring-white/10 bg-muted/60 dark:bg-white/5 overflow-hidden",
        SIZE_CLASS[size],
        className,
      )}
      title={getCryptoDisplayName(sym, coinName)}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className={cn(IMG_SIZE[size], "object-contain")}
        loading="lazy"
        onError={e => {
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          const parent = img.parentElement;
          if (parent && !parent.querySelector("[data-fallback]")) {
            const span = document.createElement("span");
            span.dataset.fallback = "1";
            span.className = "text-[10px] font-bold text-white/90";
            span.textContent = sym.slice(0, 3);
            parent.appendChild(span);
          }
        }}
      />
    </span>
  );
}
