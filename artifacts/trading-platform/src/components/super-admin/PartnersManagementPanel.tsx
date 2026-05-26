import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Building2, Save } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";

type Partner = {
  id: number;
  name: string;
  logoUrl?: string;
  websiteUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

type PartnersConfig = {
  title: string;
  items: Partner[];
};

const emptyPartner = {
  name: "",
  logoUrl: "",
  websiteUrl: "",
  sortOrder: 1,
  isActive: true,
};

export function PartnersManagementPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<PartnersConfig>({ title: "", items: [] });
  const [sectionTitle, setSectionTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partner | null>(null);
  const [form, setForm] = useState({ ...emptyPartner });

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PartnersConfig>("/super-admin/partners");
      setConfig(data);
      setSectionTitle(data.title);
    } catch (e: any) {
      toast({ title: "Failed to load partners", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveTitle = async () => {
    setSavingTitle(true);
    try {
      const data = await staffFetch<PartnersConfig>("/super-admin/partners/title", {
        method: "PATCH",
        body: JSON.stringify({ title: sectionTitle }),
      });
      setConfig(data);
      toast({ title: "Section title updated" });
    } catch (e: any) {
      toast({ title: "Failed to update title", description: e.message, variant: "destructive" });
    } finally {
      setSavingTitle(false);
    }
  };

  const savePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/partners/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Partner updated" });
      } else {
        await staffFetch("/super-admin/partners", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ title: "Partner created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyPartner });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this partner from the home page?")) return;
    try {
      await staffFetch(`/super-admin/partners/${id}`, { method: "DELETE" });
      toast({ title: "Partner deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyPartner,
      sortOrder: (config.items.length || 0) + 1,
    });
    setOpen(true);
  };

  const openEdit = (partner: Partner) => {
    setEditing(partner);
    setForm({
      name: partner.name,
      logoUrl: partner.logoUrl || "",
      websiteUrl: partner.websiteUrl || "",
      sortOrder: partner.sortOrder,
      isActive: partner.isActive,
    });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-400" />
            Institutional Partners & Brokers
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage partner names shown on the home page footer section.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" className="bg-amber-500 text-black" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Partner
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Section Title</CardTitle>
          <CardDescription>Heading displayed above the partner logos on the home page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="Institutional Partners & Brokers"
            className="bg-white/5 border-white/10"
          />
          <Button onClick={saveTitle} disabled={savingTitle} className="bg-amber-500 text-black shrink-0">
            <Save className="h-4 w-4 mr-1" />
            {savingTitle ? "Saving..." : "Save Title"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Partners List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : config.items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No partners configured yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...config.items]
                  .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
                  .map((partner) => (
                    <TableRow key={partner.id}>
                      <TableCell className="font-black italic tracking-tighter">{partner.name}</TableCell>
                      <TableCell>{partner.sortOrder}</TableCell>
                      <TableCell>
                        <Badge className={partner.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}>
                          {partner.isActive ? "Active" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">
                        {partner.websiteUrl || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(partner)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-400 hover:text-red-300" onClick={() => remove(partner.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a1528] border-white/10">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Partner" : "Add Partner"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={savePartner} className="space-y-4">
            <div className="space-y-2">
              <Label>Partner Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value.toUpperCase() })}
                placeholder="BINANCE"
                required
                className="bg-white/5 border-white/10 font-black italic tracking-tighter"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Website URL (optional)</Label>
              <Input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://..."
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min={1}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
              <Label>Show on home page</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-500 text-black">
                {editing ? "Save Changes" : "Create Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
