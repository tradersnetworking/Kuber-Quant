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

const emptyStrategy = {
  name: "", type: "trend", description: "", backtestRoi: 0, winRate: 0,
  pairs: "", timeframe: "H1", platform: "mt5", priceMonthly: 49,
  priceQuarterly: 129, priceBiannual: 229, priceAnnual: 399,
  riskLevel: "Medium", category: "Forex",
};

export function EAStrategiesPanel() {
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
      setStrategies(await staffFetch<any[]>("/super-admin/ea-catalog"));
    } catch (e: any) {
      toast({ title: "Failed to load EA catalog", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/ea-catalog/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Strategy updated" });
      } else {
        await staffFetch("/super-admin/ea-catalog", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Strategy added to catalog" });
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
    if (!confirm("Remove this EA strategy from the catalog?")) return;
    try {
      await staffFetch(`/super-admin/ea-catalog/${id}`, { method: "DELETE" });
      toast({ title: "Strategy removed" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const duplicate = (s: any) => {
    setEditing(null);
    setForm({
      ...emptyStrategy,
      ...s,
      id: undefined,
      name: `${s.name} (Copy)`,
    });
    setOpen(true);
  };

  const filtered = strategies.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Cpu className="h-5 w-5 text-purple-400" />EA Strategies Catalog</h2>
          <p className="text-sm text-muted-foreground">Manage EA strategies shown to users — create, edit, delete, modify pricing and metadata.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="w-40 bg-white/5 border-white/10" />
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
          <Button size="sm" className="bg-amber-500 text-black" onClick={() => { setEditing(null); setForm({ ...emptyStrategy }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Strategy
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : (
        <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          {filtered.map(s => (
            <Card key={s.id} className="bg-white/5 border-white/10">
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium truncate">{s.name}</p>
                    <Badge variant="outline" className="text-xs capitalize">{s.type}</Badge>
                    <Badge variant="outline" className="text-xs">{s.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{s.description}</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    ROI {s.backtestRoi}% · Win {s.winRate}% · From ${s.priceMonthly}/mo
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(s); setForm({ ...emptyStrategy, ...s }); setOpen(true); }}>
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(s)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(s.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit EA Strategy" : "Add EA Strategy"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-white/5 border-white/10" /></div>
            <div className="space-y-1"><Label>Description</Label><Textarea required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="bg-white/5 border-white/10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["scalping", "swing", "trend", "grid", "arbitrage"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Category</Label><Input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Backtest ROI %</Label><Input type="number" step="0.1" value={form.backtestRoi} onChange={e => setForm(f => ({ ...f, backtestRoi: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Win Rate %</Label><Input type="number" step="0.1" value={form.winRate} onChange={e => setForm(f => ({ ...f, winRate: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Monthly Price ($)</Label><Input type="number" value={form.priceMonthly} onChange={e => setForm(f => ({ ...f, priceMonthly: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Annual Price ($)</Label><Input type="number" value={form.priceAnnual} onChange={e => setForm(f => ({ ...f, priceAnnual: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Pairs</Label><Input value={form.pairs} onChange={e => setForm(f => ({ ...f, pairs: e.target.value }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Risk Level</Label><Input value={form.riskLevel} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value }))} className="bg-white/5 border-white/10" /></div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-amber-500 text-black w-full">{editing ? "Save Changes" : "Add to Catalog"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
