import { cn } from "@/lib/utils";
import { useLiveExchangeRates, pickExchangeRates } from "@/hooks/use-live-exchange-rates";
import type { ExchangeRateSnapshot } from "@/lib/live-exchange-rates";

type Props = {
  rates?: ExchangeRateSnapshot | null;
  className?: string;
  align?: "left" | "center" | "right";
};

export function LiveInrRateNote({ rates, className, align = "center" }: Props) {
  const { data: liveRates } = useLiveExchangeRates(!rates?.USD_INR);
  const snapshot = pickExchangeRates(rates, liveRates);

  if (!snapshot?.USD_INR) return null;

  return (
    <p
      className={cn(
        "text-[11px] text-muted-foreground",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      INR estimates use live rate 1 USD = ₹{Number(snapshot.USD_INR).toFixed(2)}
      {snapshot.updatedAt && (
        <> · updated {new Date(snapshot.updatedAt).toLocaleDateString()}</>
      )}
    </p>
  );
}
