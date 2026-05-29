import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Building2, Save } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_HEADER_ROW } from "@/lib/staff-dashboard-ui";

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
    <div className="space-y-4 min-w-0">
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            Institutional Partners & Brokers
          </h2>
          <p className="text-sm text-muted-foreground">
            Manage partner names shown on the home page footer section.
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 shrink-0">
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

      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Section Title</CardTitle>
          <CardDescription>Heading displayed above the partner logos on the home page.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3">
          <Input
            value={sectionTitle}
            onChange={(e) => setSectionTitle(e.target.value)}
            placeholder="Institutional Partners & Brokers"
            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
          />
          <Button onClick={saveTitle} disabled={savingTitle} className="bg-amber-500 text-black shrink-0">
            <Save className="h-4 w-4 mr-1" />
            {savingTitle ? "Saving..." : "Save Title"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
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
            <ResponsiveDataView
              data={[...config.items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)}
              rowKey={partner => partner.id}
              mobileFooter={partner => (
                <div className="mt-3 pt-3 border-t border-border/80 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(partner)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-400 hover:text-red-600 dark:text-red-300"
                    onClick={() => remove(partner.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  mobileTitle: true,
                  cell: partner => (
                    <span className="font-black italic tracking-tighter">{partner.name}</span>
                  ),
                },
                {
                  key: "order",
                  header: "Order",
                  cell: partner => partner.sortOrder,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: partner => (
                    <Badge className={partner.isActive ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {partner.isActive ? "Active" : "Hidden"}
                    </Badge>
                  ),
                },
                {
                  key: "website",
                  header: "Website",
                  cellClassName: "max-w-[180px] truncate text-muted-foreground",
                  cell: partner => partner.websiteUrl || "—",
                },
                {
                  key: "actions",
                  header: "Actions",
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  hideOnMobile: true,
                  cell: partner => (
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(partner)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-400 hover:text-red-600 dark:text-red-300"
                        onClick={() => remove(partner.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#0a1528] border-border dark:border-white/10">
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
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-black italic tracking-tighter"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (optional)</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://..."
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Website URL (optional)</Label>
              <Input
                value={form.websiteUrl}
                onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                placeholder="https://..."
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input
                type="number"
                min={1}
                value={form.sortOrder}
                onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
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
