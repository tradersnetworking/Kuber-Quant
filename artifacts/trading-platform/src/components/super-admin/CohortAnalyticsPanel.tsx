import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { authFetchJson } from "@/lib/token-store";
import { APP_STAT_GRID } from "@/lib/ui-system";
import { BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type CohortAnalytics = {
  cohorts: Array<{
    month: string;
    signups: number;
    verifiedKyc: number;
    firstDeposit: number;
    depositConversionPct: number;
  }>;
  summary: {
    totalUsers: number;
    verifiedKyc: number;
    usersWithDeposit: number;
    depositConversionPct: number;
  };
};

export function CohortAnalyticsPanel() {
  const [data, setData] = useState<CohortAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await authFetchJson<CohortAnalytics>("/super-admin/analytics/cohorts?months=12"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          User Cohort Analytics
        </CardTitle>
        <CardDescription>Monthly signups, KYC verification, and deposit conversion.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">
        {loading && <Skeleton className="h-32 w-full" />}
        {!loading && data && (
          <>
            <div className={APP_STAT_GRID}>
              <KpiStatCard label="Total users" value={data.summary.totalUsers} compact />
              <KpiStatCard label="KYC verified" value={data.summary.verifiedKyc} compact />
              <KpiStatCard label="With deposit" value={data.summary.usersWithDeposit} compact />
              <KpiStatCard label="Deposit conversion" value={`${data.summary.depositConversionPct}%`} compact />
            </div>

            <ResponsiveDataView
              caption="Monthly cohort breakdown"
              data={data.cohorts}
              rowKey={row => row.month}
              columns={[
                {
                  key: "month",
                  header: "Month",
                  mobileTitle: true,
                  cell: row => <span className="font-mono">{row.month}</span>,
                },
                {
                  key: "signups",
                  header: "Signups",
                  headerClassName: "text-right",
                  cellClassName: "text-right tabular-nums",
                  cell: row => row.signups,
                },
                {
                  key: "kyc",
                  header: "KYC",
                  headerClassName: "text-right",
                  cellClassName: "text-right tabular-nums",
                  cell: row => row.verifiedKyc,
                },
                {
                  key: "deposits",
                  header: "Deposits",
                  headerClassName: "text-right",
                  cellClassName: "text-right tabular-nums",
                  cell: row => row.firstDeposit,
                },
                {
                  key: "conv",
                  header: "Conv.",
                  headerClassName: "text-right",
                  cellClassName: "text-right tabular-nums font-medium",
                  cell: row => `${row.depositConversionPct}%`,
                },
              ]}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
