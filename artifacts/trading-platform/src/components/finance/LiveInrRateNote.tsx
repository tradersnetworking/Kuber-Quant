import { cn } from "@/lib/utils";
import { useLiveExchangeRates, pickExchangeRates } from "@/hooks/use-live-exchange-rates";
import type { ExchangeRateSnapshot } from "@/lib/live-exchange-rates";

type Props = {
  rates?: ExchangeRateSnapshot | null;
  className?: string;
  align?: "left" | "center" | "right";
};

function formatRateUpdatedAt(value: string | Date): string {
  const d = new Date(value);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function LiveInrRateNote({ rates, className, align = "center" }: Props) {
  const { data: liveRates } = useLiveExchangeRates(!rates?.USD_INR);
  const snapshot = pickExchangeRates(rates, liveRates);

  if (!snapshot?.USD_INR) return null;

  return (
    <p
      className={cn(
        "text-[10px] sm:text-[11px] text-muted-foreground leading-snug px-1 w-full max-w-full",
        align === "center" && "text-center",
        align === "right" && "text-right",
        className,
      )}
    >
      <span className="inline sm:inline">INR estimates use live rate 1 USD = ₹{Number(snapshot.USD_INR).toFixed(2)}</span>
      {snapshot.updatedAt && (
        <>
          <span className="hidden sm:inline"> · </span>
          <span className="block sm:inline text-[9px] sm:text-[11px] opacity-90">
            updated {formatRateUpdatedAt(snapshot.updatedAt)}
          </span>
        </>
      )}
    </p>
  );
}
