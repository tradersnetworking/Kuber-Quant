import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Award, Save, ExternalLink } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";

type AboutCategory = "registration" | "affiliation" | "partner" | "recognition" | "license";

type AboutItem = {
  id: number;
  category: AboutCategory;
  title: string;
  subtitle?: string;
  description?: string;
  referenceNumber?: string;
  issuedBy?: string;
  issuedDate?: string;
  expiryDate?: string;
  documentUrl?: string;
  sortOrder: number;
  isActive: boolean;
};

type AboutConfig = {
  sectionTitle: string;
  intro: string;
  footerDescription: string;
  items: AboutItem[];
  categoryLabels: Record<AboutCategory, string>;
};

const CATEGORIES: AboutCategory[] = ["registration", "affiliation", "partner", "recognition", "license"];

const emptyItem = {
  category: "registration" as AboutCategory,
  title: "",
  subtitle: "",
  description: "",
  referenceNumber: "",
  issuedBy: "",
  issuedDate: "",
  expiryDate: "",
  documentUrl: "",
  sortOrder: 1,
  isActive: true,
};

export function AboutCompanyPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<AboutConfig | null>(null);
  const [meta, setMeta] = useState({ sectionTitle: "", intro: "", footerDescription: "" });
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AboutItem | null>(null);
  const [form, setForm] = useState({ ...emptyItem });
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<AboutConfig>("/super-admin/about");
      setConfig(data);
      setMeta({
        sectionTitle: data.sectionTitle,
        intro: data.intro,
        footerDescription: data.footerDescription,
      });
    } catch (e: any) {
      toast({ title: "Failed to load about content", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveMeta = async () => {
    setSavingMeta(true);
    try {
      const data = await staffFetch<AboutConfig>("/super-admin/about/meta", {
        method: "PATCH",
        body: JSON.stringify(meta),
      });
      setConfig(data);
      toast({ title: "About section updated" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSavingMeta(false);
    }
  };

  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await staffFetch(`/super-admin/about/items/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Entry updated" });
      } else {
        await staffFetch("/super-admin/about/items", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ title: "Entry created" });
      }
      setOpen(false);
      setEditing(null);
      setForm({ ...emptyItem });
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this entry from the home page?")) return;
    try {
      await staffFetch(`/super-admin/about/items/${id}`, { method: "DELETE" });
      toast({ title: "Entry deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyItem,
      category: filterCategory !== "all" ? (filterCategory as AboutCategory) : "registration",
      sortOrder: (config?.items.length || 0) + 1,
    });
    setOpen(true);
  };

  const openEdit = (item: AboutItem) => {
    setEditing(item);
    setForm({
      category: item.category,
      title: item.title,
      subtitle: item.subtitle || "",
      description: item.description || "",
      referenceNumber: item.referenceNumber || "",
      issuedBy: item.issuedBy || "",
      issuedDate: item.issuedDate || "",
      expiryDate: item.expiryDate || "",
      documentUrl: item.documentUrl || "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const categoryLabels = config?.categoryLabels || {
    registration: "Company Registration",
    affiliation: "Affiliations & Memberships",
    partner: "Strategic Partners",
    recognition: "Awards & Recognitions",
    license: "Licences & Regulatory",
  };

  const filteredItems = (config?.items || [])
    .filter(item => filterCategory === "all" || item.category === filterCategory)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            About Kuber Quant
          </h2>
          <p className="text-sm text-muted-foreground">
            Edit company registration, affiliations, partners, recognitions, and licences shown on the home page.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" className="bg-amber-500 text-black" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Section Copy</CardTitle>
          <CardDescription>Main heading, intro paragraph, and footer description on the home page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Section Title</Label>
            <Input
              value={meta.sectionTitle}
              onChange={e => setMeta({ ...meta, sectionTitle: e.target.value })}
              placeholder="About Kuber Quant"
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label>Intro Paragraph</Label>
            <Textarea
              value={meta.intro}
              onChange={e => setMeta({ ...meta, intro: e.target.value })}
              rows={4}
              className="bg-white/5 border-white/10"
            />
          </div>
          <div className="space-y-2">
            <Label>Footer Description</Label>
            <Textarea
              value={meta.footerDescription}
              onChange={e => setMeta({ ...meta, footerDescription: e.target.value })}
              rows={3}
              className="bg-white/5 border-white/10"
            />
          </div>
          <Button onClick={saveMeta} disabled={savingMeta} className="bg-amber-500 text-black">
            <Save className="h-4 w-4 mr-1" />
            {savingMeta ? "Saving..." : "Save Section Copy"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="text-base">Credentials & Details</CardTitle>
            <CardDescription>Registration numbers, licences, affiliations, awards, and partner credentials.</CardDescription>
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-52 bg-white/5 border-white/10">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No entries yet. Add registration, licence, or affiliation details.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{categoryLabels[item.category]}</Badge>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm">{item.title}</p>
                      {item.subtitle && <p className="text-xs text-muted-foreground">{item.subtitle}</p>}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{item.referenceNumber || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">{item.issuedBy || "—"}</TableCell>
                    <TableCell>
                      <Badge className={item.isActive ? "bg-green-500/20 text-green-400" : "bg-zinc-500/20 text-zinc-400"}>
                        {item.isActive ? "Visible" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {item.documentUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={item.documentUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-400" onClick={() => remove(item.id)}>
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
        <DialogContent className="bg-[#0a1528] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Entry" : "Add Entry"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveItem} className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({ ...form, category: v as AboutCategory })}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{categoryLabels[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Subtitle (optional)</Label>
              <Input value={form.subtitle} onChange={e => setForm({ ...form, subtitle: e.target.value })} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="bg-white/5 border-white/10" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Reference / Reg. No.</Label>
                <Input value={form.referenceNumber} onChange={e => setForm({ ...form, referenceNumber: e.target.value })} className="bg-white/5 border-white/10 font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Issued By</Label>
                <Input value={form.issuedBy} onChange={e => setForm({ ...form, issuedBy: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Issued Date</Label>
                <Input type="date" value={form.issuedDate} onChange={e => setForm({ ...form, issuedDate: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="bg-white/5 border-white/10" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Document URL (optional)</Label>
              <Input value={form.documentUrl} onChange={e => setForm({ ...form, documentUrl: e.target.value })} placeholder="https://..." className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-2">
              <Label>Display Order</Label>
              <Input type="number" min={1} value={form.sortOrder} onChange={e => setForm({ ...form, sortOrder: Number(e.target.value) || 1 })} className="bg-white/5 border-white/10" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isActive} onCheckedChange={checked => setForm({ ...form, isActive: checked })} />
              <Label>Show on home page</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-amber-500 text-black">{editing ? "Save Changes" : "Create Entry"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
