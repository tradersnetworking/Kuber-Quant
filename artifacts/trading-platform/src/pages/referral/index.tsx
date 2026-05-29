import * as ApiHooks from "@workspace/api-client-react";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { AppPage } from "@/components/layout/AppPage";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, Share2, Copy, TrendingUp, Award, Gift } from "lucide-react";
import { ReferralShareDialog } from "@/components/referral/ReferralShareDialog";
import { buildReferralLink } from "@/lib/referral-attribution";
import { getShareUserDisplayName } from "@/lib/user-display-name";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { APP_CARD, APP_DASHBOARD_MAIN, APP_DASHBOARD_SPLIT, APP_PAGE_STACK, APP_STAT_GRID } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

type EarningRow = {
  id: number;
  createdAt: string;
  referredUserName?: string | null;
  amount: number | string;
  status: string;
};

const earningsColumns: ResponsiveColumn<EarningRow>[] = [
  {
    key: "user",
    header: "Referred User",
    mobileTitle: true,
    cell: (earning) => (
      <span className="font-medium">{earning.referredUserName || "New Investor"}</span>
    ),
  },
  {
    key: "date",
    header: "Date",
    cell: (earning) => (
      <span className="text-xs">{new Date(earning.createdAt).toLocaleDateString()}</span>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    cell: (earning) => (
      <span className="text-amber-500 font-bold">${earning.amount}</span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (earning) => (
      <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
        {earning.status}
      </Badge>
    ),
  },
];

export default function ReferralPage() {
  const { user } = useAuth();
  const [shareOpen, setShareOpen] = useState(false);
  
  const useGetReferralStats = (ApiHooks as any).useGetReferralStats;
  const useListReferralEarnings = (ApiHooks as any).useListReferralEarnings;

  const { data: stats, isLoading: statsLoading } = useGetReferralStats ? useGetReferralStats() : { data: null, isLoading: true };
  const { data: earnings, isLoading: earningsLoading } = useListReferralEarnings ? useListReferralEarnings() : { data: [], isLoading: true };
  const { toast } = useToast();

  const referralCode = (user as any)?.referralCode || "";
  const referralLink = buildReferralLink(referralCode);
  const earningsRows = (earnings ?? []) as EarningRow[];

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link Copied", description: "Share it with your friends to start earning!" });
  };

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          Referral Program
        </h1>
      }
      subtitle="Invite your friends and earn premium commissions on their trades."
    >
      <div className={APP_STAT_GRID}>
        <KpiStatCard
          label="Total Referrals"
          value={stats?.totalReferrals ?? 0}
          loading={statsLoading}
          icon={<Users className="h-4 w-4" />}
          iconClassName="text-blue-600 dark:text-blue-400"
          compact
        />
        <KpiStatCard
          label="Total Earnings"
          value={`$${stats?.totalEarnings || 0}`}
          loading={statsLoading}
          icon={<DollarSign className="h-4 w-4" />}
          iconClassName="text-green-600 dark:text-green-400"
          compact
        />
        <KpiStatCard
          label="Active Referrals"
          value={stats?.activeReferrals ?? 0}
          loading={statsLoading}
          icon={<TrendingUp className="h-4 w-4" />}
          iconClassName="text-amber-600 dark:text-amber-400"
          compact
        />
        <KpiStatCard
          label="Bonus Tier"
          value="Platinum"
          icon={<Award className="h-4 w-4" />}
          iconClassName="text-purple-600 dark:text-purple-400"
          compact
        />
      </div>

      <div className={APP_DASHBOARD_SPLIT}>
        <Card className={cn(APP_CARD, "border-amber-500/20 min-w-0")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Gift className="h-5 w-5 text-amber-500 shrink-0" />
              Invite Friends
            </CardTitle>
            <CardDescription>Share your unique referral link to earn rewards.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Referral Link</p>
              <div className="flex flex-col xs:flex-row gap-2 min-w-0">
                <Input value={referralLink} readOnly className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10 min-w-0" />
                <Button size="icon" variant="outline" className="shrink-0 border-amber-500/30 hover:bg-amber-500/10 xs:w-10 w-full touch-target" onClick={copyLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-4 pt-4">
              {[
                { step: "1", title: "Invite your network", desc: "Share your link via email, social media, or directly." },
                { step: "2", title: "They join & trade", desc: "When they make their first investment or trade." },
                { step: "3", title: "You earn commission", desc: "Get up to 10% of their trading profits instantly." },
              ].map(item => (
                <div key={item.step} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-amber-500">{item.step}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full bg-amber-500 text-black font-bold touch-target" onClick={() => setShareOpen(true)} disabled={!referralCode}>
              <Share2 className="mr-2 h-4 w-4" /> Share Now
            </Button>
          </CardContent>
        </Card>

        <Card className={cn(APP_DASHBOARD_MAIN, APP_CARD, "min-w-0")}>
          <CardHeader>
            <CardTitle className="text-base">Recent Referral Earnings</CardTitle>
            <CardDescription>Track your commission history from your network.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            {earningsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : earningsRows.length ? (
              <ResponsiveDataView
                caption="Referral earnings"
                columns={earningsColumns}
                data={earningsRows}
                rowKey={(earning) => earning.id}
                rowClassName="border-border dark:border-white/10"
              />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>You haven&apos;t earned any commissions yet.</p>
                <p className="text-xs mt-1">Start sharing your link to build your network!</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ReferralShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        referralCode={referralCode}
        inviterName={getShareUserDisplayName(user)}
        avatarUrl={user?.avatarUrl}
      />
    </AppPage>
  );
}
