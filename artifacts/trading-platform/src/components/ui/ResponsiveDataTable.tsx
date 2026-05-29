import * as React from "react";
import { cn } from "@/lib/utils";
import { APP_TABLE_WRAP } from "@/lib/ui-system";

type Props = {
  children: React.ReactNode;
  className?: string;
  /** Sticky header row on horizontal scroll (tablet+) */
  stickyHeader?: boolean;
  caption?: string;
};

/**
 * Responsive table shell — horizontal scroll on small screens, min-width guard on md+.
 * Wrap any `<table>`; does not alter table semantics.
 */
export function ResponsiveDataTable({
  children,
  className,
  stickyHeader = true,
  caption,
}: Props) {
  return (
    <div
      className={cn(APP_TABLE_WRAP, "rounded-lg border border-border/80 dark:border-white/10", className)}
      role="region"
      aria-label={caption || "Data table"}
      tabIndex={0}
    >
      <table
        className={cn(
          "w-full caption-bottom text-sm",
          stickyHeader && "[&_thead_th]:sticky [&_thead_th]:top-0 [&_thead_th]:z-[1] [&_thead_th]:bg-card/95 [&_thead_th]:backdrop-blur-sm",
        )}
      >
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}
