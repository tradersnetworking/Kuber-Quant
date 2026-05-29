import { formatUsdWithInr } from "@/lib/format-money";
import { cn } from "@/lib/utils";

type Props = {
  usd?: number | null;
  inr?: number | null;
  usdClassName?: string;
  inrClassName?: string;
  /** Staff finance KPI sizing */
  finance?: boolean;
  className?: string;
};

/** USD on first line, INR on second — fits KPI stat boxes without overflow. */
export function DualCurrencyValue({
  usd,
  inr,
  usdClassName,
  inrClassName,
  finance,
  className,
}: Props) {
  if (usd == null || Number.isNaN(Number(usd))) {
    return <span className={cn(finance ? "kpi-finance-usd" : "kpi-dual-usd", className)}>—</span>;
  }

  const dual = formatUsdWithInr(usd, inr ?? undefined);

  return (
    <div className={cn("kpi-dual-currency min-w-0 w-full", className)}>
      <p className={cn(finance ? "kpi-finance-usd" : "kpi-dual-usd", usdClassName)}>
        {dual.primary}
      </p>
      {dual.secondary && (
        <p className={cn(finance ? "kpi-finance-inr" : "kpi-currency-secondary", inrClassName)}>
          {dual.secondary}
        </p>
      )}
    </div>
  );
}
