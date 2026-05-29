import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, DollarSign, Users2 } from "lucide-react";
import { useGetAdminReferralStats } from "@workspace/api-client-react";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_STAT_GRID } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

export function PlatformReferralsPanel() {
  const { data: stats, isLoading } = useGetAdminReferralStats();

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users2 className="h-5 w-5 text-pink-600 dark:text-pink-400 shrink-0" />
            Referral Program
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Platform-wide referral growth and commissions paid to users and managers.
          </p>
        </div>
      </div>

      <div className={STAFF_STAT_GRID}>
        <KpiStatCard
          label="Total Referrals"
          value={stats?.totalReferrals?.toLocaleString() ?? "0"}
          loading={isLoading}
          icon={<Users className="h-4 w-4" />}
          iconClassName="text-amber-600 dark:text-amber-400"
          compact
        />
        <KpiStatCard
          label="Commissions Paid"
          value={`$${Number(stats?.totalCommissionPaid || 0).toLocaleString()}`}
          loading={isLoading}
          icon={<DollarSign className="h-4 w-4" />}
          iconClassName="text-emerald-600 dark:text-emerald-400"
          compact
        />
        <KpiStatCard
          label="Active Referrers"
          value={stats?.topReferrers?.length ?? 0}
          loading={isLoading}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="text-blue-600 dark:text-blue-400"
          compact
        />
      </div>

      <Card className={cn(STAFF_CARD, "bg-muted/60 dark:bg-white/5")}>
        <CardHeader>
          <CardTitle className="text-base">Top Referrers</CardTitle>
          <CardDescription>Users and managers driving platform growth</CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}
            </div>
          ) : stats?.topReferrers?.length ? (
            <ResponsiveDataView
              caption="Top referrers"
              data={stats.topReferrers}
              rowKey={r => r.userId}
              rowClassName="border-border/80 dark:border-white/5"
              columns={[
                {
                  key: "user",
                  header: "User",
                  mobileTitle: true,
                  cell: r => <span className="font-medium">{r.userName}</span>,
                },
                {
                  key: "email",
                  header: "Email",
                  hideOnMobile: true,
                  cellClassName: "text-muted-foreground",
                  cell: r => `#${r.userId}`,
                },
                {
                  key: "referrals",
                  header: "Referrals",
                  headerClassName: "text-right",
                  cellClassName: "text-right tabular-nums",
                  cell: r => r.referralCount,
                },
                {
                  key: "earned",
                  header: "Earned",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-green-700 dark:text-green-400 tabular-nums",
                  cell: r => `$${Number(r.earnings || 0).toFixed(2)}`,
                },
              ]}
            />
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No referral data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
