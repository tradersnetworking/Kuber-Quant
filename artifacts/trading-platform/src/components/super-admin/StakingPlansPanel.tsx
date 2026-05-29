import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Coins } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";

const emptyPlan = {
  name: "",
  description: "",
  planType: "fixed",
  currency: "USDT",
  minAmount: 100,
  maxAmount: 100000,
  aprPercent: 12,
  roiPercent: 12,
  lockDurationDays: 30,
  isFlexible: false,
  rewardFrequency: "daily",
  compoundEnabled: false,
  autoRenew: false,
  earlyWithdrawalPenalty: 2,
  promotionalBonusPercent: 0,
  isActive: true,
  isFeatured: false,
  isPopular: false,
  isRecommended: false,
  riskLevel: "medium",
  themeColor: "#10b981",
  sortOrder: 0,
  changeReason: "",
};

type ApiBase = "/staking/admin" | "/support-team" | "/manager";

function plansPath(apiBase: ApiBase) {
  if (apiBase === "/staking/admin") return "/staking/admin/plans";
  return `${apiBase}/staking-plans`;
}

export function StakingPlansPanel({
  apiBase = "/staking/admin",
  readOnly = false,
}: {
  apiBase?: ApiBase;
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyPlan });
  const canWrite = !readOnly && apiBase === "/staking/admin";

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await staffFetch<any[]>(plansPath(apiBase)));
    } catch (e: any) {
      toast({ title: "Failed to load staking plans", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [apiBase]);

  const save = async (e: React.FormEvent) => {
    if (!canWrite) return;
    e.preventDefault();
    try {
      const payload = { ...form };
      if (editing) {
        await staffFetch(`/staking/admin/plans/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast({ title: "Staking plan updated" });
      } else {
        await staffFetch("/staking/admin/plans", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast({ title: "Staking plan created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyPlan });
      await load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!canWrite) return;
    if (!confirm("Deactivate this staking plan? Existing stakes will remain active.")) return;
    try {
      await staffFetch(`/staking/admin/plans/${id}`, { method: "DELETE" });
      toast({ title: "Plan deactivated" });
      await load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Staking Plans
          </h2>
          <p className="text-sm text-muted-foreground">
            {readOnly
              ? "View platform staking catalog — APR, lock periods, and limits."
              : "Create, edit, and manage staking plans, ROI/APR rates, and deposit limits."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
          {canWrite && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => {
                setEditing(null);
                setForm({ ...emptyPlan });
                setOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> New Plan
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 p-8 text-center text-muted-foreground">
          No staking plans yet.
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <Card key={p.id} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{p.planType}</Badge>
                    <Badge variant="outline" className="text-xs uppercase">{p.currency}</Badge>
                    <Badge className={p.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {p.isFeatured && <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">Featured</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.minAmount.toLocaleString()} – {p.maxAmount.toLocaleString()} {p.currency} · {p.aprPercent}% APR
                    {p.roiPercent != null && p.roiPercent !== p.aprPercent ? ` · ${p.roiPercent}% ROI` : ""}
                    · {p.isFlexible ? "Flexible" : `${p.lockDurationDays}d lock`}
                    · {p.rewardFrequency} rewards
                  </p>
                  {(p.totalStaked > 0 || p.activeStakers > 0) && (
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {Number(p.totalStaked).toLocaleString()} staked · {p.activeStakers} stakers
                    </p>
                  )}
                </div>
                {canWrite && (
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(p);
                        setForm({
                          ...emptyPlan,
                          ...p,
                          changeReason: "",
                        });
                        setOpen(true);
                      }}
                    >
                      <Edit2 className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => void remove(p.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {canWrite && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-background border-border dark:border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Staking Plan" : "New Staking Plan"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className={STAFF_FORM_GRID}>
                <div className="space-y-1">
                  <Label>Plan type</Label>
                  <Select value={form.planType} onValueChange={(v) => setForm((f) => ({ ...f, planType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["flexible", "fixed", "vip", "compound", "promotional"].map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} />
                </div>
                <div className="space-y-1">
                  <Label>Min amount</Label>
                  <Input type="number" required value={form.minAmount} onChange={(e) => setForm((f) => ({ ...f, minAmount: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Max amount</Label>
                  <Input type="number" required value={form.maxAmount} onChange={(e) => setForm((f) => ({ ...f, maxAmount: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>APR %</Label>
                  <Input type="number" step="0.01" required value={form.aprPercent} onChange={(e) => setForm((f) => ({ ...f, aprPercent: Number(e.target.value), roiPercent: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>ROI %</Label>
                  <Input type="number" step="0.01" value={form.roiPercent} onChange={(e) => setForm((f) => ({ ...f, roiPercent: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Lock days</Label>
                  <Input type="number" value={form.lockDurationDays} onChange={(e) => setForm((f) => ({ ...f, lockDurationDays: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Early withdrawal penalty %</Label>
                  <Input type="number" step="0.1" value={form.earlyWithdrawalPenalty} onChange={(e) => setForm((f) => ({ ...f, earlyWithdrawalPenalty: Number(e.target.value) }))} />
                </div>
              </div>
              <div className={STAFF_FORM_GRID}>
                <div className="space-y-1">
                  <Label>Reward frequency</Label>
                  <Select value={form.rewardFrequency} onValueChange={(v) => setForm((f) => ({ ...f, rewardFrequency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["hourly", "daily", "weekly", "monthly", "at_maturity"].map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Risk level</Label>
                  <Select value={form.riskLevel} onValueChange={(v) => setForm((f) => ({ ...f, riskLevel: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["low", "medium", "high"].map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Sort order</Label>
                  <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
                </div>
                <div className="space-y-1">
                  <Label>Theme color</Label>
                  <Input value={form.themeColor || ""} onChange={(e) => setForm((f) => ({ ...f, themeColor: e.target.value }))} />
                </div>
              </div>
              {editing && (
                <div className="space-y-1">
                  <Label>Change reason (APR/ROI updates)</Label>
                  <Input value={form.changeReason || ""} onChange={(e) => setForm((f) => ({ ...f, changeReason: e.target.value }))} placeholder="Optional audit note" />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1">
                {([
                  ["isFlexible", "Flexible stake"],
                  ["compoundEnabled", "Compound rewards"],
                  ["autoRenew", "Auto-renew"],
                  ["isActive", "Active"],
                  ["isFeatured", "Featured"],
                  ["isPopular", "Popular"],
                  ["isRecommended", "Recommended"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch checked={!!form[key]} onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))} />
                    <Label className="text-xs">{label}</Label>
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
                  {editing ? "Save Changes" : "Create Plan"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
