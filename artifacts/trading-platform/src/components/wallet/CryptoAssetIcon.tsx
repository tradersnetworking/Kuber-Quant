import { useState } from "react";
import { cn } from "@/lib/utils";
import { getCryptoAssetIconUrl, getCryptoDisplayName } from "@/components/wallet/crypto-asset-catalog";

type Props = {
  symbol?: string | null;
  network?: string | null;
  coinName?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
};

const SIZE = { xs: "h-5 w-5", sm: "h-7 w-7", md: "h-9 w-9", lg: "h-11 w-11" };
const TEXT = { xs: "text-[8px]", sm: "text-[9px]", md: "text-[10px]", lg: "text-xs" };

export function CryptoAssetIcon({ symbol, network, coinName, size = "sm", className }: Props) {
  const [failed, setFailed] = useState(false);
  const sym = (symbol || "?").toUpperCase();
  const src = getCryptoAssetIconUrl(symbol, network);

  if (failed || !symbol) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold shrink-0",
          SIZE[size],
          TEXT[size],
          className,
        )}
        title={getCryptoDisplayName(symbol, coinName)}
      >
        {sym.slice(0, 3)}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={getCryptoDisplayName(symbol, coinName)}
      title={getCryptoDisplayName(symbol, coinName)}
      className={cn("rounded-full object-cover bg-muted dark:bg-white/10 shrink-0", SIZE[size], className)}
      onError={() => setFailed(true)}
    />
  );
}
