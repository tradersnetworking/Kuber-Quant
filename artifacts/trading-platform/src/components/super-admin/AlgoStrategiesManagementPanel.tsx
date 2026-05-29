import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Cpu, Copy } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_CARD, STAFF_FORM_GRID, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_TOOLBAR_ROW } from "@/lib/staff-dashboard-ui";
import { APP_MODAL_MD } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

const emptyStrategy = {
  name: "",
  description: "",
  roi: 0,
  riskLevel: "medium",
  status: "active",
  minInvestment: 100,
  currency: "USD",
  priceMonthly: 99,
  priceQuarterly: 249,
  priceBiannual: 449,
  priceAnnual: 799,
};

export function AlgoStrategiesManagementPanel() {
  const { toast } = useToast();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyStrategy });
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      setStrategies(await staffFetch<any[]>("/super-admin/algo-strategies"));
    } catch (e: any) {
      toast({ title: "Failed to load algo strategies", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/algo-strategies/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Algo strategy updated" });
      } else {
        await staffFetch("/super-admin/algo-strategies", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Algo strategy created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyStrategy });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this algo strategy? Existing subscriptions may be affected.")) return;
    try {
      await staffFetch(`/super-admin/algo-strategies/${id}`, { method: "DELETE" });
      toast({ title: "Algo strategy deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const duplicate = (s: any) => {
    setEditing(null);
    setForm({
      name: `${s.name} (Copy)`,
      description: s.description,
      roi: s.roi,
      riskLevel: s.riskLevel,
      status: "paused",
      minInvestment: s.minInvestment,
      currency: s.currency,
      priceMonthly: s.priceMonthly ?? 99,
      priceQuarterly: s.priceQuarterly ?? 249,
      priceBiannual: s.priceBiannual ?? 449,
      priceAnnual: s.priceAnnual ?? 799,
    });
    setOpen(true);
  };

  const filtered = strategies.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />Algo Strategies</h2>
          <p className="text-sm text-muted-foreground">Create, edit, and delete algorithmic trading strategies offered to investors.</p>
        </div>
        <div className={STAFF_TOOLBAR_ROW}>
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-full sm:w-40 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
          <div className="flex flex-col xs:flex-row gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
            <Button size="sm" className="bg-amber-500 text-black" onClick={() => { setEditing(null); setForm({ ...emptyStrategy }); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Add Strategy
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card className={cn(STAFF_CARD, "p-8 text-center")}>
          <p className="text-muted-foreground text-sm">No algo strategies yet. Add one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2 max-h-[min(420px,60vh)] overflow-y-auto pr-1 min-w-0">
          {filtered.map(s => (
            <Card key={s.id} className={STAFF_CARD}>
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{s.name}</p>
                    <Badge className={s.status === "active" ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>{s.status}</Badge>
                    <Badge variant="outline" className="capitalize">{s.riskLevel} risk</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{s.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ROI {s.roi}% · Min ${s.minInvestment} {s.currency} · From ${s.priceMonthly ?? 99}/mo · {s.subscribers} subscribers
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); setForm({ ...s }); setOpen(true); }}>
                    <Edit2 className="h-3.5 w-3.5 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(s)} title="Duplicate">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" className="text-red-400 border-red-500/30" onClick={() => remove(s.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(APP_MODAL_MD, "max-h-[90vh] overflow-y-auto")}>
          <DialogHeader><DialogTitle>{editing ? "Edit Algo Strategy" : "Add Algo Strategy"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className={STAFF_FORM_GRID}>
              <div><Label>ROI (%)</Label><Input type="number" step="0.01" value={form.roi} onChange={e => setForm(f => ({ ...f, roi: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div><Label>Min Investment</Label><Input type="number" value={form.minInvestment} onChange={e => setForm(f => ({ ...f, minInvestment: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            </div>
            <div className={STAFF_FORM_GRID}>
              <div>
                <Label>Risk Level</Label>
                <Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className={STAFF_FORM_GRID}>
              <div><Label>Monthly ($)</Label><Input type="number" value={form.priceMonthly} onChange={e => setForm(f => ({ ...f, priceMonthly: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div><Label>Quarterly ($)</Label><Input type="number" value={form.priceQuarterly} onChange={e => setForm(f => ({ ...f, priceQuarterly: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div><Label>Half-Yearly ($)</Label><Input type="number" value={form.priceBiannual} onChange={e => setForm(f => ({ ...f, priceBiannual: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div><Label>Annual ($)</Label><Input type="number" value={form.priceAnnual} onChange={e => setForm(f => ({ ...f, priceAnnual: parseFloat(e.target.value) || 0 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-500 text-black">{editing ? "Save Changes" : "Create Strategy"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
