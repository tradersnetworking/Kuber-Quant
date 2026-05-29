import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { AppPage } from "@/components/layout/AppPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock, Gift, LogOut } from "lucide-react";
import { claimStakeRewards, fetchStakeDetail, withdrawStakeEarly } from "@/lib/staking-api";
import { cn } from "@/lib/utils";

export default function StakeDetailPage() {
  const [, params] = useRoute("/earn/staking/:id");
  const id = Number(params?.id);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stake, setStake] = useState<Awaited<ReturnType<typeof fetchStakeDetail>> | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      setStake(await fetchStakeDetail(id));
    } catch (e: any) {
      toast({ title: "Failed to load stake", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [id]);

  const onClaim = async () => {
    try {
      const res = await claimStakeRewards(id);
      toast({
        title: res.status === "pending_approval" ? "Claim submitted" : "Rewards claimed",
        description: res.amount ? `${res.amount} credited` : "Awaiting admin approval",
      });
      await load();
    } catch (e: any) {
      toast({ title: "Claim failed", description: e.message, variant: "destructive" });
    }
  };

  const onEarlyWithdraw = async () => {
    if (!confirm("Request early withdrawal? Penalties may apply on locked stakes.")) return;
    try {
      const res = await withdrawStakeEarly(id);
      toast({ title: "Withdrawal processed", description: `Received ${res.amount} (penalty ${res.penalty})` });
      await load();
    } catch (e: any) {
      toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!stake) return <AppPage title="Stake not found"><Button asChild variant="link"><Link href="/earn/staking">Back</Link></Button></AppPage>;

  return (
    <AppPage
      title={stake.planName}
      subtitle={`Stake #${stake.id} · ${stake.currency}`}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href="/earn/staking"><ArrowLeft className="mr-2 h-4 w-4" /> All stakes</Link>
        </Button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {[
          { label: "Principal", value: stake.principal, tone: "text-sky-700 dark:text-sky-400" },
          { label: "Accrued", value: stake.accruedRewards, tone: "text-emerald-700 dark:text-emerald-400" },
          { label: "Pending", value: stake.pendingRewards, tone: "text-amber-700 dark:text-amber-400" },
          { label: "Claimed", value: stake.claimedRewards, tone: "text-violet-700 dark:text-violet-400" },
        ].map((k) => (
          <Card key={k.label} className="border-border/70 bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={cn("text-xl font-bold", k.tone)}>{k.value.toLocaleString()} {stake.currency}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Status
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-center">
          <Badge className="capitalize">{stake.status}</Badge>
          <span className="text-sm text-muted-foreground">APR {stake.aprPercent}% · APY {stake.apyPercent}%</span>
          {stake.maturesAt && (
            <span className="text-sm">Matures {new Date(stake.maturesAt).toLocaleString()}</span>
          )}
          <div className="ml-auto flex gap-2">
            {stake.pendingRewards > 0 && stake.status === "active" && (
              <Button size="sm" onClick={() => void onClaim()}>
                <Gift className="mr-2 h-4 w-4" /> Claim rewards
              </Button>
            )}
            {stake.status === "active" && (
              <Button size="sm" variant="outline" onClick={() => void onEarlyWithdraw()}>
                <LogOut className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Reward history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(stake.rewardHistory ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No rewards yet.</p>
          ) : (
            stake.rewardHistory.map((r) => (
              <div key={r.id} className="flex justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                <span>{r.note || r.rewardType}</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">+{r.amount} {stake.currency}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </AppPage>
  );
}
