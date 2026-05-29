import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { APP_KPI_CARD } from "@/lib/ui-system";

type Props = {
  label: string;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  iconClassName?: string;
  /** Color class for the primary metric (e.g. text-emerald-600) */
  valueClassName?: string;
  /** Optional tinted card surface */
  cardClassName?: string;
  /** Wrap icon in a tinted pill */
  iconWrapClassName?: string;
  loading?: boolean;
  className?: string;
  compact?: boolean;
  /** Smaller finance-style values (staff KPI row) */
  finance?: boolean;
};

/** Unified KPI / metric card for all dashboards. */
export function KpiStatCard({
  label,
  value,
  sub,
  icon,
  iconClassName,
  valueClassName,
  cardClassName,
  iconWrapClassName,
  loading,
  className,
  compact,
  finance,
}: Props) {
  return (
    <Card className={cn(APP_KPI_CARD, cardClassName, className)}>
      <CardContent className={cn(compact || finance ? "p-3 sm:p-3.5" : "p-4 sm:p-5", "min-w-0")}>
        <div className="flex items-start justify-between gap-2 min-w-0">
          <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 min-w-0 leading-snug font-medium">
            {label}
          </p>
          {icon && (
            <span
              className={cn(
                "shrink-0 flex items-center justify-center rounded-md p-1",
                iconWrapClassName ?? "bg-muted/80 dark:bg-white/5",
                iconClassName,
              )}
            >
              {icon}
            </span>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-6 w-20 mt-2" />
        ) : (
          <>
            <div
              className={cn(
                finance ? "mt-1.5" : "mt-2",
                !finance && "mobile-stat-value",
                !finance && (valueClassName ?? "text-foreground"),
                compact && !finance && "text-[clamp(0.75rem,0.4vw+0.5rem,1.25rem)]",
              )}
            >
              {value ?? "—"}
            </div>
            {sub && (
              <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1.5 leading-snug line-clamp-3 break-words [overflow-wrap:break-word]">
                {sub}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
