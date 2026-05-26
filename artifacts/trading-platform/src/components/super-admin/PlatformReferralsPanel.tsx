import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, DollarSign, Users2 } from "lucide-react";
import { useGetAdminReferralStats } from "@workspace/api-client-react";

function StatCard({ title, value, prefix = "", isLoading, icon }: {
  title: string; value?: number; prefix?: string; isLoading: boolean; icon: React.ReactNode;
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4 flex items-center gap-4">
        <div className="p-2 rounded-lg bg-amber-500/10">{icon}</div>
        <div>
          {isLoading ? <Skeleton className="h-7 w-20 mb-1" /> : (
            <p className="text-2xl font-bold">{prefix}{value?.toLocaleString() ?? "0"}</p>
          )}
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function PlatformReferralsPanel() {
  const { data: stats, isLoading } = useGetAdminReferralStats();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users2 className="h-5 w-5 text-pink-400" />
          Referral Program
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Platform-wide referral growth and commissions paid to users and managers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard title="Total Referrals" value={stats?.totalReferrals} isLoading={isLoading} icon={<Users className="w-5 h-5 text-amber-500" />} />
        <StatCard title="Commissions Paid" value={stats?.totalCommissionPaid} prefix="$" isLoading={isLoading} icon={<DollarSign className="w-5 h-5 text-amber-500" />} />
        <StatCard title="Active Referrers" value={stats?.topReferrers?.length || 0} isLoading={isLoading} icon={<TrendingUp className="w-5 h-5 text-amber-500" />} />
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Top Referrers</CardTitle>
          <CardDescription>Users and managers driving platform growth</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}
            </div>
          ) : stats?.topReferrers?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Referrals</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topReferrers.map((r: any) => (
                  <TableRow key={r.userId} className="border-white/5">
                    <TableCell className="font-medium">{r.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.email}</TableCell>
                    <TableCell className="text-right">{r.referralCount}</TableCell>
                    <TableCell className="text-right text-green-400">${Number(r.totalEarned || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No referral data yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
