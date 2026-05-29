import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plus, RefreshCw, Play, Coins } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_CARD, STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";

type StakingSettings = {
  stakingEnabled: boolean;
  rewardsPaused: boolean;
  autoPayoutEnabled: boolean;
  manualApprovalRequired: boolean;
  defaultCurrency: string;
};

const emptyPlan = {
  name: "",
  description: "",
  planType: "fixed",
  currency: "USDT",
  minAmount: 100,
  maxAmount: 100000,
  aprPercent: 12,
  lockDurationDays: 30,
  isFlexible: false,
  rewardFrequency: "daily",
  compoundEnabled: false,
  autoRenew: false,
  earlyWithdrawalPenalty: 2,
  isActive: true,
  themeColor: "#f59e0b",
};

export function StakingAdminPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<StakingSettings | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [stakes, setStakes] = useState<any[]>([]);
  const [form, setForm] = useState({ ...emptyPlan });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, st, p, sk] = await Promise.all([
        staffFetch<any>("/staking/admin/stats"),
        staffFetch<StakingSettings>("/staking/admin/settings"),
        staffFetch<any[]>("/staking/admin/plans"),
        staffFetch<any[]>("/staking/admin/stakes"),
      ]);
      setStats(s);
      setSettings(st);
      setPlans(p);
      setStakes(sk);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveSettings = async (patch: Partial<StakingSettings>) => {
    try {
      const next = await staffFetch<StakingSettings>("/staking/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
      setSettings(next);
      toast({ title: "Settings updated" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const createPlan = async () => {
    try {
      await staffFetch("/staking/admin/plans", { method: "POST", body: JSON.stringify(form) });
      toast({ title: "Plan created" });
      setShowForm(false);
      setForm({ ...emptyPlan });
      await load();
    } catch (e: any) {
      toast({ title: "Create failed", description: e.message, variant: "destructive" });
    }
  };

  const runRewards = async () => {
    try {
      const r = await staffFetch<{ processed: number; matured: number }>("/staking/admin/process-rewards", { method: "POST" });
      toast({ title: "Reward cycle complete", description: `${r.processed} processed, ${r.matured} matured` });
      await load();
    } catch (e: any) {
      toast({ title: "Cycle failed", description: e.message, variant: "destructive" });
    }
  };

  if (loading) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
          <Coins className="h-5 w-5" /> Staking & Earn Control
        </h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => void load()}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={() => void runRewards()}><Play className="h-4 w-4 mr-1" /> Run rewards</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total staked", value: stats?.totalStaked, color: "text-emerald-700 dark:text-emerald-400" },
          { label: "Rewards paid", value: stats?.totalRewardsPaid, color: "text-amber-700 dark:text-amber-400" },
          { label: "Active stakes", value: stats?.activeStakes, color: "text-sky-700 dark:text-sky-400" },
          { label: "Active users", value: stats?.activeUsers, color: "text-violet-700 dark:text-violet-400" },
        ].map((k) => (
          <Card key={k.label} className={STAFF_CARD}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-2xl font-bold ${k.color}`}>{Number(k.value ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {settings && (
        <Card className={STAFF_CARD}>
          <CardHeader><CardTitle>Global controls</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {([
              ["stakingEnabled", "Staking enabled"],
              ["rewardsPaused", "Pause rewards"],
              ["autoPayoutEnabled", "Auto payout"],
              ["manualApprovalRequired", "Manual claim approval"],
            ] as const).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 dark:bg-white/[0.03] px-3 py-2">
                <Label>{label}</Label>
                <Switch
                  checked={settings[key]}
                  onCheckedChange={(v) => void saveSettings({ [key]: v })}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger>
          <TabsTrigger value="stakes">User stakes ({stakes.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="plans" className="space-y-4">
          <Button size="sm" onClick={() => setShowForm((v) => !v)}><Plus className="h-4 w-4 mr-1" /> New plan</Button>
          {showForm && (
            <Card className={STAFF_CARD}>
              <CardContent className={`pt-6 ${STAFF_FORM_GRID}`}>
                <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
                <div className="space-y-2"><Label>APR %</Label><Input type="number" value={form.aprPercent} onChange={(e) => setForm({ ...form, aprPercent: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Min</Label><Input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Max</Label><Input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Lock days</Label><Input type="number" value={form.lockDurationDays} onChange={(e) => setForm({ ...form, lockDurationDays: Number(e.target.value) })} /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <Button className="sm:col-span-2" onClick={() => void createPlan()}>Create plan</Button>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {plans.map((p) => (
              <Card key={p.id} className={STAFF_CARD}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between"><span className="font-medium">{p.name}</span><Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? "Active" : "Off"}</Badge></div>
                  <p className="text-sm text-muted-foreground">{p.aprPercent}% APR · {p.currency} · {p.planType}</p>
                  <p className="text-xs text-muted-foreground">Staked {p.totalStaked} · {p.activeStakers} stakers</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="stakes">
          <Card className={STAFF_CARD}>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border/60 text-left text-muted-foreground"><th className="p-3">ID</th><th className="p-3">Plan</th><th className="p-3">Principal</th><th className="p-3">Rewards</th><th className="p-3">Status</th></tr></thead>
                <tbody>
                  {stakes.slice(0, 100).map((s) => (
                    <tr key={s.id} className="border-b border-border/40">
                      <td className="p-3">{s.id}</td>
                      <td className="p-3">{s.planName}</td>
                      <td className="p-3">{s.principal} {s.currency}</td>
                      <td className="p-3 text-emerald-700 dark:text-emerald-400">{s.accruedRewards}</td>
                      <td className="p-3 capitalize">{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
