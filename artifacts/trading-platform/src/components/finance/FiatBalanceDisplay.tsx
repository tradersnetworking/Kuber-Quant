import { cn } from "@/lib/utils";
import { formatWalletFiatDisplay, type WalletFiatFields } from "@/lib/format-money";

type Props = {
  wallet?: WalletFiatFields | null;
  className?: string;
  primaryClassName?: string;
  secondaryClassName?: string;
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
};

export function FiatBalanceDisplay({
  wallet,
  className,
  primaryClassName,
  secondaryClassName,
  size = "md",
  align = "right",
}: Props) {
  const { primary, secondary } = formatWalletFiatDisplay(wallet);
  const primarySize = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-base";
  const secondarySize = size === "sm" ? "text-[10px]" : size === "lg" ? "text-sm" : "text-xs";

  return (
    <div className={cn(align === "right" ? "text-right" : "text-left", className)}>
      <div className={cn("font-bold", primarySize, primaryClassName)}>{primary}</div>
      {secondary && (
        <div className={cn("text-muted-foreground font-medium", secondarySize, secondaryClassName)}>
          {secondary}
        </div>
      )}
    </div>
  );
}
