import { Suspense, lazy, type ComponentProps } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { InvestorDashboardChartsBlock as InvestorDashboardChartsBlockType } from "@/components/dashboard/InvestorDashboardChartsBlock";

const InvestorDashboardChartsBlockLazy = lazy(() =>
  import("@/components/dashboard/InvestorDashboardChartsBlock").then(m => ({
    default: m.InvestorDashboardChartsBlock,
  })),
);

export type InvestorChartsProps = ComponentProps<typeof InvestorDashboardChartsBlockType>;

export function LazyInvestorDashboardCharts(props: InvestorChartsProps) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          <Skeleton className="h-[320px] lg:col-span-2" />
          <Skeleton className="h-[320px]" />
          <Skeleton className="h-[280px] lg:col-span-2" />
        </div>
      }
    >
      <InvestorDashboardChartsBlockLazy {...props} />
    </Suspense>
  );
}
