import * as ApiHooks from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, Share2, Copy, TrendingUp, Award, Gift } from "lucide-react";

export default function ReferralPage() {
  const { user } = useAuth();
  
  const useGetReferralStats = (ApiHooks as any).useGetReferralStats;
  const useListReferralEarnings = (ApiHooks as any).useListReferralEarnings;

  const { data: stats, isLoading: statsLoading } = useGetReferralStats ? useGetReferralStats() : { data: null, isLoading: true };
  const { data: earnings, isLoading: earningsLoading } = useListReferralEarnings ? useListReferralEarnings() : { data: [], isLoading: true };
  const { toast } = useToast();

  const referralLink = `${window.location.origin}/register?ref=${(user as any)?.referralCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Link Copied", description: "Share it with your friends to start earning!" });
  };

  const statCards = [
    { label: "Total Referrals", value: stats?.totalReferrals || 0, icon: Users, color: "text-blue-500" },
    { label: "Total Earnings", value: `$${stats?.totalEarnings || 0}`, icon: DollarSign, color: "text-green-500" },
    { label: "Active Referrals", value: stats?.activeReferrals || 0, icon: TrendingUp, color: "text-amber-500" },
    { label: "Bonus Tier", value: "Platinum", icon: Award, color: "text-purple-500" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Referral Program</h1>
          <p className="text-muted-foreground">Invite your friends and earn premium commissions on their trades.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((item, i) => (
            <Card key={i} className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                  <item.icon className={`h-4 w-4 ${item.color}`} />
                </div>
                <div className="text-2xl font-bold">{item.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Card className="lg:col-span-1 bg-white/5 backdrop-blur-sm border-white/10 border-amber-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                Invite Friends
              </CardTitle>
              <CardDescription>Share your unique referral link to earn rewards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Referral Link</p>
                <div className="flex gap-2">
                  <Input value={referralLink} readOnly className="bg-black/20 border-white/10" />
                  <Button size="icon" variant="outline" className="shrink-0 border-amber-500/30 hover:bg-amber-500/10" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-4 pt-4">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-amber-500">1</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">Invite your network</p>
                    <p className="text-xs text-muted-foreground">Share your link via email, social media, or directly.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-amber-500">2</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">They join & trade</p>
                    <p className="text-xs text-muted-foreground">When they make their first investment or trade.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[10px] font-bold text-amber-500">3</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">You earn commission</p>
                    <p className="text-xs text-muted-foreground">Get up to 10% of their trading profits instantly.</p>
                  </div>
                </div>
              </div>
              <Button className="w-full bg-amber-500 text-black font-bold">
                <Share2 className="mr-2 h-4 w-4" /> Share Now
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle>Recent Referral Earnings</CardTitle>
              <CardDescription>Track your commission history from your network.</CardDescription>
            </CardHeader>
            <CardContent>
              {earningsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : earnings?.length ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-muted-foreground">Referred User</TableHead>
                      <TableHead className="text-muted-foreground">Amount</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {earnings.map((earning: any) => (
                      <TableRow key={earning.id} className="border-white/10">
                        <TableCell className="text-xs">{new Date(earning.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{earning.referredUserName || "New Investor"}</TableCell>
                        <TableCell className="text-amber-500 font-bold">${earning.amount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-green-500/30 text-green-500 bg-green-500/10">
                            {earning.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>You haven't earned any commissions yet.</p>
                  <p className="text-xs mt-1">Start sharing your link to build your network!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
