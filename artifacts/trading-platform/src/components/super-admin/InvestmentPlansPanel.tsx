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
import { Plus, Edit2, Trash2, RefreshCw } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";

const emptyPlan = {
  name: "", description: "", minAmount: 100, maxAmount: 10000, roiPercent: 5, durationDays: 30,
  currency: "USD", category: "starter", planType: "monthly", profitFrequency: "monthly",
  capitalReturn: "yes", isActive: true, earlyWithdrawalPenalty: 0,
};

export function InvestmentPlansPanel({
  apiBase = "/super-admin",
  readOnly = false,
}: {
  apiBase?: "/super-admin" | "/support-team" | "/manager";
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyPlan });

  const load = async () => {
    setLoading(true);
    try {
      setPlans(await staffFetch<any[]>(`${apiBase}/plans`));
    } catch (e: any) {
      toast({ title: "Failed to load plans", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [apiBase]);

  const save = async (e: React.FormEvent) => {
    if (readOnly) return;
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/plans/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Plan updated" });
      } else {
        await staffFetch("/super-admin/plans", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Plan created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyPlan });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this investment plan?")) return;
    try {
      await staffFetch(`/super-admin/plans/${id}`, { method: "DELETE" });
      toast({ title: "Plan deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Investment Plans</h2>
          <p className="text-sm text-muted-foreground">{readOnly ? "View platform investment plan catalog (read-only)." : "Create, edit, and delete platform investment plans."}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          {!readOnly && (
          <Button size="sm" className="bg-amber-500 text-black" onClick={() => { setEditing(null); setForm({ ...emptyPlan }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />New Plan
          </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 p-8 text-center text-muted-foreground">No investment plans yet.</Card>
      ) : (
        <div className="space-y-2">
          {plans.map(p => (
            <Card key={p.id} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{p.category}</Badge>
                    <Badge className={p.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {p.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${p.minAmount.toLocaleString()} – ${p.maxAmount.toLocaleString()} · {p.roiPercent}% ROI · {p.durationDays} days
                  </p>
                </div>
                {!readOnly && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(p); setForm({ ...p }); setOpen(true); }}>
                    <Edit2 className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!readOnly && (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Plan" : "New Investment Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className={STAFF_FORM_GRID}>
              <div className="space-y-1"><Label>Min ($)</Label><Input type="number" required value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Max ($)</Label><Input type="number" required value={form.maxAmount} onChange={e => setForm(f => ({ ...f, maxAmount: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>ROI %</Label><Input type="number" step="0.1" required value={form.roiPercent} onChange={e => setForm(f => ({ ...f, roiPercent: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Duration (days)</Label><Input type="number" required value={form.durationDays} onChange={e => setForm(f => ({ ...f, durationDays: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            </div>
            <div className={STAFF_FORM_GRID}>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["starter", "growth", "premium", "vip"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-amber-500 text-black w-full">{editing ? "Save Changes" : "Create Plan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}
