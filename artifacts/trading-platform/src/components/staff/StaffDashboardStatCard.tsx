import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { STAFF_CARD, STAFF_STAT_TONES, type StaffStatTone } from "@/lib/staff-dashboard-ui";

type Props = {
  label: string;
  value?: string | number | null;
  subValue?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: StaffStatTone;
  loading?: boolean;
  className?: string;
};

export function StaffDashboardStatCard({
  label,
  value,
  subValue,
  icon: Icon,
  href,
  tone = "blue",
  loading,
  className,
}: Props) {
  const t = STAFF_STAT_TONES[tone];

  const inner = (
    <Card
      className={cn(
        STAFF_CARD,
        t.border,
        "overflow-hidden h-full hover:shadow-md transition-all group",
        href && "cursor-pointer active:scale-[0.98]",
        className,
      )}
    >
      <div className={cn("h-1 w-full bg-gradient-to-r", t.bar)} />
      <CardContent className="p-3 sm:p-4 mobile-box-safe">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="mobile-label-safe text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
          {Icon && (
            <div className={cn("p-1.5 rounded-lg shrink-0", t.bg, "group-hover:scale-110 transition-transform")}>
              <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", t.icon)} />
            </div>
          )}
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 sm:h-8 sm:w-20" />
        ) : (
          <p className={cn("mobile-stat-value", t.value)}>{value ?? "—"}</p>
        )}
        {subValue && !loading && (
          <p className="kpi-currency-secondary">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
