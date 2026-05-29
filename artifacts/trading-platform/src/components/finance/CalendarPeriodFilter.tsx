import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERIOD_OPTIONS, type StatsPeriod } from "@/lib/finance-period";

type PeriodOption = { value: StatsPeriod; label: string };

type Props = {
  period: StatsPeriod;
  customFrom: string;
  customTo: string;
  onPeriodChange: (period: StatsPeriod) => void;
  onCustomFromChange: (v: string) => void;
  onCustomToChange: (v: string) => void;
  onApplyCustom?: () => void;
  periodLabel?: string;
  compact?: boolean;
  className?: string;
  /** @deprecated All roles use the same options (includes Present). */
  variant?: "investor" | "staff";
  options?: PeriodOption[];
};

export function CalendarPeriodFilter({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomFromChange,
  onCustomToChange,
  onApplyCustom,
  periodLabel,
  compact = false,
  className,
  options,
}: Props) {
  const periodOptions = options ?? PERIOD_OPTIONS;

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn("flex flex-wrap items-center gap-1.5", compact && "gap-1")}>
        <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
        {periodOptions.map(opt => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={period === opt.value ? "default" : "outline"}
            className={cn(
              "h-7 text-xs",
              period === opt.value && "bg-amber-500 hover:bg-amber-600 text-black",
              compact && "h-6 px-2 text-[10px]",
            )}
            onClick={() => onPeriodChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
        {periodLabel && (
          <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{periodLabel}</span>
        )}
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">From</Label>
            <Input
              type="date"
              value={customFrom}
              onChange={e => onCustomFromChange(e.target.value)}
              className="h-8 w-36 text-xs bg-muted/60 dark:bg-white/5"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground">To</Label>
            <Input
              type="date"
              value={customTo}
              onChange={e => onCustomToChange(e.target.value)}
              className="h-8 w-36 text-xs bg-muted/60 dark:bg-white/5"
            />
          </div>
          {onApplyCustom && (
            <Button type="button" size="sm" className="h-8 bg-amber-500 hover:bg-amber-600 text-black" onClick={onApplyCustom}>
              Apply
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
