import { useGetAdminReferralStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, DollarSign } from "lucide-react";

export default function AdminReferralsPage() {
  const { data: stats, isLoading } = useGetAdminReferralStats();

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Referral Program</h1>
          <p className="text-muted-foreground">Monitor platform growth and top performing referrers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Referrals"
            value={stats?.totalReferrals}
            isLoading={isLoading}
            icon={<Users className="w-5 h-5 text-amber-500" />}
          />
          <StatCard
            title="Total Earnings Paid"
            value={stats?.totalCommissionPaid}
            isLoading={isLoading}
            prefix="$"
            icon={<DollarSign className="w-5 h-5 text-amber-500" />}
          />
          <StatCard
            title="Active Referrers"
            value={stats?.topReferrers?.length || 0}
            isLoading={isLoading}
            icon={<TrendingUp className="w-5 h-5 text-amber-500" />}
          />
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Top Referrers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : stats?.topReferrers?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Total Referrals</TableHead>
                    <TableHead className="text-right">Total Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topReferrers.map((referrer: any, index: number) => (
                    <TableRow key={index} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{referrer.fullName}</TableCell>
                      <TableCell>{referrer.email}</TableCell>
                      <TableCell className="text-right font-bold text-amber-400">
                        {referrer.referralCount}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${referrer.totalEarnings.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No referral data found.</div>
            )}
          </CardContent>
        </Card>
      </div>
);
}

function StatCard({ title, value, isLoading, prefix = "", icon }: any) {
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-bold text-white">
            {prefix}{value?.toLocaleString() || "0"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
