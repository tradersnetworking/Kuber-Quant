import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { AppPage } from "@/components/layout/AppPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Coins,
  Crown,
  Clock,
  TrendingUp,
  Wallet,
  Sparkles,
  RefreshCw,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  createStake,
  fetchMyStakes,
  fetchStakingDashboard,
  fetchStakingPlans,
  projectStakingReturns,
  downloadStakingAgreementPreview,
  type StakingDashboard,
  type StakingPlan,
  type UserStake,
} from "@/lib/staking-api";
import { StakingProfitChart } from "@/components/staking/StakingProfitChart";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDuration(days: number, flexible: boolean) {
  if (flexible) return "Flexible";
  if (days === 7) return "7 days";
  if (days === 30) return "30 days";
  if (days === 90) return "90 days";
  if (days === 180) return "180 days";
  if (days === 365) return "365 days";
  return `${days} days`;
}

function MaturityCountdown({ maturesAt }: { maturesAt: string | null }) {
  const [label, setLabel] = useState("—");
  useEffect(() => {
    if (!maturesAt) {
      setLabel("No lock");
      return;
    }
    const tick = () => {
      const diff = new Date(maturesAt).getTime() - Date.now();
      if (diff <= 0) {
        setLabel("Matured");
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      setLabel(`${d}d ${h}h`);
    };
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [maturesAt]);
  return <span className="font-mono text-sm text-violet-700 dark:text-violet-300">{label}</span>;
}

function PlanCard({
  plan,
  onStake,
}: {
  plan: StakingPlan;
  onStake: (plan: StakingPlan) => void;
}) {
  const color = plan.themeColor || "#f59e0b";
  return (
    <Card
      className="staking-plan-card overflow-hidden border-border/70 dark:border-white/10 transition hover:shadow-lg"
      style={{ borderTopColor: color, borderTopWidth: 3 }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg">{plan.name}</CardTitle>
          <div className="flex flex-wrap gap-1 justify-end">
            {plan.isFeatured && <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30">Featured</Badge>}
            {plan.isPopular && <Badge className="bg-sky-500/15 text-sky-800 dark:text-sky-300 border-sky-500/30">Popular</Badge>}
            {plan.isRecommended && <Badge className="bg-violet-500/15 text-violet-800 dark:text-violet-300 border-violet-500/30">Recommended</Badge>}
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 p-3 border border-emerald-500/20">
            <p className="text-xs text-muted-foreground">APR</p>
            <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{plan.aprPercent}%</p>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3 border border-indigo-500/20">
            <p className="text-xs text-muted-foreground">APY</p>
            <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{plan.apyPercent}%</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">{plan.currency}</Badge>
          <Badge variant="outline">{formatDuration(plan.lockDurationDays, plan.isFlexible)}</Badge>
          <Badge variant="outline" className="capitalize">{plan.planType}</Badge>
          {plan.compoundEnabled && <Badge variant="outline">Compound</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          Min {plan.minAmount.toLocaleString()} · Max {plan.maxAmount.toLocaleString()} {plan.currency}
        </p>
        <Button className="w-full" style={{ backgroundColor: color }} onClick={() => onStake(plan)}>
          Stake Now
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StakingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<StakingPlan[]>([]);
  const [stakes, setStakes] = useState<UserStake[]>([]);
  const [dashboard, setDashboard] = useState<StakingDashboard | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<StakingPlan | null>(null);
  const [amount, setAmount] = useState("");
  const [autoReinvest, setAutoReinvest] = useState(false);
  const [agreement, setAgreement] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [calcAmount, setCalcAmount] = useState("1000");
  const [calcPlan, setCalcPlan] = useState<StakingPlan | null>(null);
  const [projection, setProjection] = useState<{
    estimatedReward: number;
    estimatedTotal: number;
    series?: Array<{ day: number; label: string; rewards: number; total: number }>;
  } | null>(null);
  const [previewingPdf, setPreviewingPdf] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, d] = await Promise.all([
        fetchStakingPlans(),
        fetchMyStakes().catch(() => [] as UserStake[]),
        fetchStakingDashboard().catch(() => null),
      ]);
      setPlans(p);
      setStakes(s);
      setDashboard(d);
      if (!calcPlan && p[0]) setCalcPlan(p[0]);
    } catch (e: any) {
      toast({ title: "Failed to load staking", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [calcPlan, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeStakes = useMemo(() => stakes.filter((s) => s.status === "active"), [stakes]);

  useEffect(() => {
    if (!calcPlan) return;
    const principal = Number(calcAmount);
    if (!Number.isFinite(principal) || principal <= 0) return;
    void projectStakingReturns({
      principal,
      aprPercent: calcPlan.aprPercent,
      durationDays: calcPlan.isFlexible ? 30 : calcPlan.lockDurationDays || 30,
      compoundEnabled: calcPlan.compoundEnabled,
      rewardFrequency: calcPlan.rewardFrequency,
    }).then((r) => setProjection({
      estimatedReward: r.estimatedReward,
      estimatedTotal: r.estimatedTotal,
      series: r.series,
    }));
  }, [calcAmount, calcPlan]);

  async function previewAgreementPdf() {
    if (!selectedPlan || !amount) return;
    setPreviewingPdf(true);
    try {
      const blob = await downloadStakingAgreementPreview(selectedPlan.id, Number(amount));
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      toast({ title: "PDF unavailable", description: e.message, variant: "destructive" });
    } finally {
      setPreviewingPdf(false);
    }
  }

  const submitStake = async () => {
    if (!selectedPlan || !agreement) return;
    setSubmitting(true);
    try {
      const stake = await createStake({
        planId: selectedPlan.id,
        amount: Number(amount),
        autoReinvest,
        agreementAccepted: true,
      });
      toast({ title: "Stake created", description: `${stake.principal} ${stake.currency} staked successfully.` });
      setSelectedPlan(null);
      setAmount("");
      setAgreement(false);
      await load();
    } catch (e: any) {
      toast({ title: "Stake failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage
      title="Crypto Staking & Earn"
      subtitle="Stake USDT, BTC and more. Earn daily rewards with flexible or fixed lock periods."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
            {[
              { label: "Total Staked", value: dashboard?.totalStaked ?? 0, icon: Coins, tone: "text-emerald-700 dark:text-emerald-400", bg: "from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20" },
              { label: "Rewards Earned", value: dashboard?.totalRewardsEarned ?? 0, icon: TrendingUp, tone: "text-amber-700 dark:text-amber-400", bg: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20" },
              { label: "Pending Rewards", value: dashboard?.pendingRewards ?? 0, icon: Sparkles, tone: "text-violet-700 dark:text-violet-400", bg: "from-violet-50 to-indigo-50 dark:from-violet-950/30 dark:to-indigo-950/20" },
              { label: "Active Stakes", value: dashboard?.activeStakes ?? 0, icon: Wallet, tone: "text-sky-700 dark:text-sky-400", bg: "from-sky-50 to-cyan-50 dark:from-sky-950/30 dark:to-cyan-950/20" },
            ].map((kpi) => (
              <Card key={kpi.label} className={cn("border-border/70 bg-gradient-to-br", kpi.bg)}>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="rounded-xl bg-background/60 p-2.5 dark:bg-white/5">
                    <kpi.icon className={cn("h-5 w-5", kpi.tone)} />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    <p className={cn("mobile-stat-value", kpi.tone)}>{kpi.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3 mb-8">
            <Card className="lg:col-span-2 border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 via-background to-violet-50/50 dark:from-indigo-950/20 dark:via-card dark:to-violet-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300">
                  <TrendingUp className="h-5 w-5" /> Returns Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plan</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={calcPlan?.id ?? ""}
                    onChange={(e) => setCalcPlan(plans.find((p) => p.id === Number(e.target.value)) ?? null)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount ({calcPlan?.currency ?? "USDT"})</Label>
                  <Input type="number" min={0} value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} />
                </div>
                {projection && calcPlan && (
                  <div className="sm:col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                        <p className="text-xs text-muted-foreground">Estimated reward</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                          {projection.estimatedReward.toLocaleString(undefined, { maximumFractionDigits: 4 })} {calcPlan.currency}
                        </p>
                      </div>
                      <div className="rounded-xl border border-sky-500/25 bg-sky-500/10 p-4">
                        <p className="text-xs text-muted-foreground">Estimated total</p>
                        <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">
                          {projection.estimatedTotal.toLocaleString(undefined, { maximumFractionDigits: 4 })} {calcPlan.currency}
                        </p>
                      </div>
                    </div>
                    {projection.series && projection.series.length > 1 && (
                      <div className="rounded-xl border border-border/70 bg-background/60 dark:bg-white/[0.02] p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Profit projection</p>
                        <StakingProfitChart series={projection.series} currency={calcPlan.currency} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="text-amber-800 dark:text-amber-300">Your Active Stakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-72 overflow-y-auto">
                {activeStakes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active stakes yet.</p>
                ) : (
                  activeStakes.map((s) => (
                    <Link key={s.id} href={`/earn/staking/${s.id}`}>
                      <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 dark:bg-white/[0.03] p-3 hover:bg-muted/70 transition">
                        <div>
                          <p className="font-medium text-sm">{s.planName}</p>
                          <p className="text-xs text-muted-foreground">{s.principal} {s.currency} · {s.aprPercent}% APR</p>
                        </div>
                        <div className="text-right">
                          <MaturityCountdown maturesAt={s.maturesAt} />
                          <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Available Plans
          </h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} onStake={setSelectedPlan} />
            ))}
          </div>
        </>
      )}

      <Dialog open={!!selectedPlan} onOpenChange={(o) => !o && setSelectedPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="break-words">Stake in {selectedPlan?.name}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400 mt-0.5" />
                <p className="text-muted-foreground">
                  Rewards are estimated and variable. Early withdrawal may incur a {selectedPlan.earlyWithdrawalPenalty}% penalty on locked plans.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Amount ({selectedPlan.currency})</Label>
                <Input
                  type="number"
                  min={selectedPlan.minAmount}
                  max={selectedPlan.maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`${selectedPlan.minAmount} – ${selectedPlan.maxAmount}`}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-reinvest">Auto-reinvest rewards</Label>
                <Switch id="auto-reinvest" checked={autoReinvest} onCheckedChange={setAutoReinvest} />
              </div>
              <div className="flex items-start gap-2">
                <Checkbox id="agreement" checked={agreement} onCheckedChange={(v) => setAgreement(v === true)} />
                <Label htmlFor="agreement" className="text-sm leading-snug text-muted-foreground">
                  I accept the staking terms, risk disclosure, and confirm KYC/AML compliance.{" "}
                  <button
                    type="button"
                    className="text-amber-600 dark:text-amber-400 underline font-medium inline-flex items-center gap-1"
                    disabled={previewingPdf || !amount}
                    onClick={() => void previewAgreementPdf()}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {previewingPdf ? "Loading PDF…" : "Preview agreement PDF"}
                  </button>
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPlan(null)}>Cancel</Button>
            <Button disabled={submitting || !agreement || !amount} onClick={() => void submitStake()}>
              {submitting ? "Processing…" : "Confirm Stake"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
