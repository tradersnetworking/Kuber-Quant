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
import { Plus, Edit2, Trash2, RefreshCw, Users, Copy } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_CARD, STAFF_FORM_GRID, STAFF_HEADER_ROW, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";
import { APP_MODAL_MD } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

const emptyTrader = {
  name: "", bio: "", roi: 0, monthlyRoi: 0, winRate: 0, totalTrades: 0,
  minInvestment: 100, riskLevel: "medium", status: "active",
};

export function CopyTradersPanel() {
  const { toast } = useToast();
  const [traders, setTraders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyTrader });

  const load = async () => {
    setLoading(true);
    try {
      setTraders(await staffFetch<any[]>("/super-admin/copy-traders"));
    } catch (e: any) {
      toast({ title: "Failed to load copy traders", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/copy-traders/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
        toast({ title: "Copy trader updated" });
      } else {
        await staffFetch("/super-admin/copy-traders", { method: "POST", body: JSON.stringify(form) });
        toast({ title: "Copy trader created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyTrader });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this copy trader profile?")) return;
    try {
      await staffFetch(`/super-admin/copy-traders/${id}`, { method: "DELETE" });
      toast({ title: "Copy trader deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const duplicate = (t: any) => {
    setEditing(null);
    setForm({ ...emptyTrader, ...t, name: `${t.name} (Copy)`, status: "inactive" });
    setOpen(true);
  };

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400 shrink-0" />Copy Trading Profiles</h2>
          <p className="text-sm text-muted-foreground">Manage master traders users can follow for copy trading.</p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
          <Button size="sm" className="bg-amber-500 text-black" onClick={() => { setEditing(null); setForm({ ...emptyTrader }); setOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Add Trader
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : traders.length === 0 ? (
        <Card className={cn(STAFF_CARD, "p-8 text-center text-muted-foreground")}>No copy traders configured. Add master trader profiles for users to follow.</Card>
      ) : (
        <div className="space-y-2 min-w-0">
          {traders.map(t => (
            <Card key={t.id} className={STAFF_CARD}>
              <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{t.name}</p>
                    <Badge className={t.status === "active" ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>{t.status}</Badge>
                    <Badge variant="outline" className="text-xs capitalize">{t.riskLevel} risk</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{t.bio || "No bio"}</p>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    ROI {t.roi}% · Monthly {t.monthlyRoi}% · Win {t.winRate}% · {t.followers} followers · Min ${t.minInvestment}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setEditing(t); setForm({ ...emptyTrader, ...t }); setOpen(true); }}>
                    <Edit2 className="h-3 w-3 mr-1" />Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(t)} title="Duplicate"><Copy className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" className="text-red-400" onClick={() => remove(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={cn(APP_MODAL_MD, "bg-background border-border dark:border-white/10")}>
          <DialogHeader><DialogTitle>{editing ? "Edit Copy Trader" : "New Copy Trader"}</DialogTitle></DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1"><Label>Name</Label><Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className="space-y-1"><Label>Bio</Label><Textarea value={form.bio || ""} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            <div className={STAFF_FORM_GRID}>
              <div className="space-y-1"><Label>ROI %</Label><Input type="number" step="0.1" value={form.roi} onChange={e => setForm(f => ({ ...f, roi: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Monthly ROI %</Label><Input type="number" step="0.1" value={form.monthlyRoi} onChange={e => setForm(f => ({ ...f, monthlyRoi: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Win Rate %</Label><Input type="number" step="0.1" value={form.winRate} onChange={e => setForm(f => ({ ...f, winRate: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Min Investment ($)</Label><Input type="number" value={form.minInvestment} onChange={e => setForm(f => ({ ...f, minInvestment: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Risk Level</Label>
                <Select value={form.riskLevel} onValueChange={v => setForm(f => ({ ...f, riskLevel: v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["low", "medium", "high"].map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="bg-amber-500 text-black w-full">{editing ? "Save Changes" : "Create Trader"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
