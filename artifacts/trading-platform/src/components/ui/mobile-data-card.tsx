import * as React from "react";
import { cn } from "@/lib/utils";

/** Stacked record card for mobile table alternatives. */
export function MobileDataCard({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "rounded-xl border border-border/80 dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3 min-w-0 w-full text-left",
        onClick && "cursor-pointer transition-colors hover:bg-muted/55 dark:hover:bg-white/[0.05]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function MobileDataRow({
  label,
  value,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-2 min-w-0", className)}>
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs font-medium text-right min-w-0 break-words">{value}</span>
    </div>
  );
}
