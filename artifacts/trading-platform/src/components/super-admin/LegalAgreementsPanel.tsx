import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, FileText, Copy, Eye, Save, Heading2 } from "lucide-react";
import { authFetchJson, getStoredToken } from "@/lib/token-store";

const AGREEMENT_TYPES = [
  "investment", "profit_sharing", "ea_subscription", "copy_trading", "account_handling",
  "algo_trading", "risk_disclosure", "aml_kyc", "privacy_policy", "terms_conditions", "withdrawal_policy",
];

type Placeholder = { key: string; label: string; group: string };
type TemplateRow = {
  id: number | null; type: string; title: string; version: string; isActive: boolean;
  isBuiltIn?: boolean; sectionCount?: number; content?: string;
};

const SAMPLE_TEMPLATE = `# {{FULL_NAME}} — Service Agreement

## Investor Details
Full Name: {{FULL_NAME}}
Username: {{USERNAME}}
Email: {{EMAIL}}
Investor ID: {{INVESTOR_ID}}
Mobile: {{MOBILE}}
Date of Birth: {{DATE_OF_BIRTH}}
Gender: {{GENDER}}
Nationality: {{NATIONALITY}}

## Address
{{FULL_ADDRESS}}

## KYC & Identity
KYC Status: {{KYC_STATUS}}
PAN: {{PAN_NUMBER}}
Aadhaar: {{AADHAAR_NUMBER}}
Passport: {{PASSPORT_NUMBER}}
Tax ID: {{TAX_ID}}

## Banking
Account Holder: {{ACCOUNT_HOLDER_NAME}}
Bank: {{BANK_NAME}}
Account: {{BANK_ACCOUNT}}
IFSC: {{IFSC_CODE}}
UPI: {{UPI_ID}}

## Financial Profile
Occupation: {{OCCUPATION}}
Income Range: {{ANNUAL_INCOME_RANGE}}
Risk Appetite: {{RISK_APPETITE}}
Source of Funds: {{SOURCE_OF_FUNDS}}
Trading Interests: {{TRADING_INTERESTS}}

## Terms & Conditions
Write your legal terms here. Use {{PLACEHOLDER}} tokens — they auto-fill from user profile, KYC, and subscription data when the agreement is generated.

## Agreement Metadata
Reference: {{AGREEMENT_UID}}
Date: {{AGREEMENT_DATE}}
IP: {{IP_ADDRESS}}
`;

interface LegalAgreementsPanelProps {
  agreements: any[];
  agrFilter: string;
  setAgrFilter: (v: string) => void;
  agrGenerating: boolean;
  agrGenForm: { userId: string; type: string };
  setAgrGenForm: (v: { userId: string; type: string }) => void;
  onGenerate: () => Promise<void>;
  onRefreshAgreements: () => void;
  onRevoke: (id: number) => Promise<void>;
}

export function LegalAgreementsPanel({
  agreements, agrFilter, setAgrFilter, agrGenerating, agrGenForm, setAgrGenForm,
  onGenerate, onRefreshAgreements, onRevoke,
}: LegalAgreementsPanelProps) {
  const { toast } = useToast();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState("templates");
  const [defaults, setDefaults] = useState<TemplateRow[]>([]);
  const [custom, setCustom] = useState<TemplateRow[]>([]);
  const [placeholders, setPlaceholders] = useState<Placeholder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const [editing, setEditing] = useState<TemplateRow | null>(null);
  const [form, setForm] = useState({ type: "risk_disclosure", title: "", version: "1.0", content: SAMPLE_TEMPLATE, isActive: true });
  const [pending, setPending] = useState(false);
  const [previewUserId, setPreviewUserId] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const [tplData, ph] = await Promise.all([
        authFetchJson<{ defaults: TemplateRow[]; custom: TemplateRow[] }>("/agreements/templates"),
        authFetchJson<Placeholder[]>("/agreements/templates/placeholders"),
      ]);
      setDefaults(tplData.defaults);
      setCustom(tplData.custom);
      setPlaceholders(ph);
    } catch (e: any) {
      toast({ title: "Failed to load templates", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, []);

  const openCreate = () => {
    setEditing(null);
    setEditorTab("write");
    setPreviewHtml("");
    setForm({ type: "risk_disclosure", title: "", version: "1.0", content: SAMPLE_TEMPLATE, isActive: true });
    setOpen(true);
  };

  const openEdit = async (tpl: TemplateRow) => {
    if (tpl.isBuiltIn || !tpl.id) return;
    try {
      const full = await authFetchJson<TemplateRow>(`/agreements/templates/custom/${tpl.id}`);
      setEditing(tpl);
      setEditorTab("write");
      setPreviewHtml("");
      setForm({
        type: full.type,
        title: full.title,
        version: full.version,
        content: full.content || "",
        isActive: full.isActive,
      });
      setOpen(true);
    } catch (e: any) {
      toast({ title: "Could not load template", description: e.message, variant: "destructive" });
    }
  };

  const duplicateFromBuiltIn = async (tpl: TemplateRow) => {
    try {
      const exported = await authFetchJson<{ title: string; content: string; type: string }>(
        `/agreements/templates/default/${tpl.type}`,
      );
      setEditing(null);
      setEditorTab("write");
      setPreviewHtml("");
      setForm({
        type: exported.type,
        title: `${exported.title} (Custom)`,
        version: "1.0",
        content: exported.content,
        isActive: true,
      });
      setOpen(true);
      toast({ title: "Built-in template copied", description: "Edit and save as your custom version." });
    } catch (e: any) {
      toast({ title: "Copy failed", description: e.message, variant: "destructive" });
    }
  };

  const duplicateTemplate = async (tpl: TemplateRow) => {
    if (tpl.isBuiltIn) {
      await duplicateFromBuiltIn(tpl);
      return;
    }
    if (tpl.id) {
      try {
        const full = await authFetchJson<TemplateRow>(`/agreements/templates/custom/${tpl.id}`);
        setEditing(null);
        setEditorTab("write");
        setForm({
          type: full.type,
          title: `${full.title} (Copy)`,
          version: "1.0",
          content: full.content || SAMPLE_TEMPLATE,
          isActive: true,
        });
        setOpen(true);
        return;
      } catch { /* fall through */ }
    }
    setEditing(null);
    setForm({
      type: tpl.type,
      title: `${tpl.title} (Copy)`,
      version: "1.0",
      content: SAMPLE_TEMPLATE,
      isActive: true,
    });
    setOpen(true);
  };

  const insertAtCursor = (text: string) => {
    const el = contentRef.current;
    if (!el) {
      setForm(f => ({ ...f, content: `${f.content}${text}` }));
      return;
    }
    const start = el.selectionStart ?? form.content.length;
    const end = el.selectionEnd ?? start;
    const next = form.content.slice(0, start) + text + form.content.slice(end);
    setForm(f => ({ ...f, content: next }));
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertPlaceholder = (key: string) => {
    insertAtCursor(`{{${key}}}`);
  };

  const insertSection = () => {
    insertAtCursor("\n\n## New Section\n\nSection content here.\n");
  };

  const runPreview = async () => {
    if (!previewUserId.trim()) {
      toast({ title: "Enter a user ID to preview", variant: "destructive" });
      return;
    }
    if (!form.content.trim()) return;
    setPreviewLoading(true);
    try {
      const result = await authFetchJson<{ filledTitle: string; filledContent: string }>(
        "/agreements/templates/preview-content",
        {
          method: "POST",
          body: JSON.stringify({
            userId: previewUserId.trim(),
            type: form.type,
            title: form.title || "Agreement Preview",
            content: form.content,
          }),
        },
      );
      setPreviewHtml(`# ${result.filledTitle}\n\n${result.filledContent}`);
      setEditorTab("preview");
    } catch (e: any) {
      toast({ title: "Preview failed", description: e.message, variant: "destructive" });
    } finally {
      setPreviewLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Title and content are required", variant: "destructive" });
      return;
    }
    setPending(true);
    try {
      if (editing?.id) {
        await authFetchJson(`/agreements/templates/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(form),
        });
        toast({ title: "Template updated" });
      } else {
        await authFetchJson("/agreements/templates", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast({ title: "Template created" });
      }
      setOpen(false);
      await loadTemplates();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const deleteTemplate = async (id: number) => {
    if (!confirm("Delete this agreement template? Existing signed agreements are not affected.")) return;
    try {
      await authFetchJson(`/agreements/templates/${id}`, { method: "DELETE" });
      toast({ title: "Template deleted" });
      await loadTemplates();
    } catch (e: any) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const downloadAgreement = async (id: number, uid: string) => {
    const token = getStoredToken();
    const r = await fetch(`/api/agreements/admin/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${uid}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const groupedPlaceholders = placeholders.reduce<Record<string, Placeholder[]>>((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});

  const renderPreviewText = (text: string) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("# ")) return <h1 key={i} className="text-lg font-bold text-amber-400 mt-4 mb-2">{line.slice(2)}</h1>;
      if (line.startsWith("## ")) return <h2 key={i} className="text-base font-semibold mt-3 mb-1">{line.slice(3)}</h2>;
      if (!line.trim()) return <br key={i} />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-lime-400" />
          Legal Agreements
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Write agreement templates like a Word document — use <code className="text-amber-400">{`{{FULL_NAME}}`}</code> placeholders that auto-fill from user KYC, profile, and trading data.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="templates">Template Editor</TabsTrigger>
          <TabsTrigger value="generated">Generated Agreements</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-between gap-4 flex-wrap">
            <p className="text-sm text-muted-foreground max-w-xl">
              Use <strong>## Section Heading</strong> for document sections. Click placeholders to insert user data tokens. Active custom templates override built-in defaults for each type.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadTemplates}><RefreshCw className="h-4 w-4" /></Button>
              <Button size="sm" className="bg-amber-500 text-black" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-1" />New Template
              </Button>
            </div>
          </div>

          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader><CardTitle className="text-sm">Your Custom Templates</CardTitle>
                    <CardDescription className="text-xs">Create, edit, copy, and delete — full control over agreement wording</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!custom.length ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No custom templates yet. Create one or duplicate a built-in template.</p>
                    ) : custom.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                        <div>
                          <p className="text-sm font-medium">{t.title}
                            <Badge variant="outline" className="text-[10px] ml-1">v{t.version}</Badge>
                            {!t.isActive && <Badge variant="outline" className="text-[10px] ml-1 text-zinc-400">inactive</Badge>}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" title="Edit" onClick={() => openEdit(t)}><Edit2 className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" title="Duplicate" onClick={() => duplicateTemplate(t)}><Copy className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-red-400" title="Delete" onClick={() => t.id && deleteTemplate(t.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <CardTitle className="text-sm">Built-in Templates</CardTitle>
                    <CardDescription className="text-xs">Copy any built-in template to customize it with your own legal text</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {defaults.map(t => (
                      <div key={t.type} className="flex items-center justify-between p-2 rounded border border-white/5 text-sm gap-2">
                        <div className="min-w-0">
                          <p className="truncate">{t.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">{t.type.replace(/_/g, " ")}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-[10px]">{t.sectionCount} sections</Badge>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => duplicateFromBuiltIn(t)}>
                            <Copy className="h-3 w-3 mr-1" />Copy & Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-sm">User Data Placeholders</CardTitle>
                  <CardDescription className="text-xs">Click to insert into the template editor</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[520px]">
                    {Object.entries(groupedPlaceholders).map(([group, items]) => (
                      <div key={group} className="mb-4">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
                        <div className="space-y-1">
                          {items.map(p => (
                            <button
                              key={p.key}
                              type="button"
                              className="w-full text-left text-[11px] px-2 py-1.5 rounded bg-white/5 border border-white/10 hover:bg-amber-500/20 hover:border-amber-500/30"
                              onClick={() => {
                                if (open) insertPlaceholder(p.key);
                                else {
                                  navigator.clipboard.writeText(`{{${p.key}}}`).catch(() => {});
                                  toast({ title: "Copied", description: `{{${p.key}}}` });
                                }
                              }}
                            >
                              <span className="font-mono text-amber-400/90">{`{{${p.key}}}`}</span>
                              <span className="text-muted-foreground ml-2">{p.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="generated" className="space-y-4 mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Generate Agreement for User</CardTitle>
              <CardDescription>Uses the active template for the selected type and fills all placeholders from user data</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="User ID" value={agrGenForm.userId} onChange={e => setAgrGenForm({ ...agrGenForm, userId: e.target.value })} className="bg-white/5 border-white/10 sm:w-32" />
              <Select value={agrGenForm.type} onValueChange={v => setAgrGenForm({ ...agrGenForm, type: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 sm:flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGREEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button className="bg-amber-500 text-black" disabled={agrGenerating} onClick={onGenerate}>
                {agrGenerating ? "Generating..." : "Generate"}
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">All Agreements</CardTitle>
              <div className="flex gap-2">
                <Input placeholder="Search..." value={agrFilter} onChange={e => setAgrFilter(e.target.value)} className="w-40 bg-white/5 border-white/10" />
                <Button variant="outline" size="sm" onClick={onRefreshAgreements}><RefreshCw className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
              {agreements.filter(a =>
                !agrFilter || a.agreementUid?.includes(agrFilter) || a.userEmail?.includes(agrFilter) || a.userName?.includes(agrFilter)
              ).map(agr => (
                <div key={agr.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                  <div>
                    <p className="text-sm font-medium">{agr.agreementUid}</p>
                    <p className="text-xs text-muted-foreground">{agr.userName || agr.userEmail} · {agr.type?.replace(/_/g, " ")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{agr.status?.replace(/_/g, " ")}</Badge>
                    <Button size="sm" variant="outline" onClick={() => downloadAgreement(agr.id, agr.agreementUid)}>PDF</Button>
                    {agr.status !== "revoked" && (
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => onRevoke(agr.id)}>Revoke</Button>
                    )}
                  </div>
                </div>
              ))}
              {!agreements.length && <p className="text-sm text-muted-foreground text-center py-8">No agreements found</p>}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col bg-[#0a1628] border-white/10">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Agreement Template" : "Create Agreement Template"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 shrink-0">
            <div><Label className="text-xs">Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{AGREEMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2"><Label className="text-xs">Document Title</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="KUBER QUANT INVESTMENT AGREEMENT" className="bg-white/5 border-white/10 h-9" />
            </div>
            <div><Label className="text-xs">Version</Label>
              <Input value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))} className="bg-white/5 border-white/10 h-9" />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-xs">Active — overrides built-in template for this type</Label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={insertSection}><Heading2 className="h-3.5 w-3.5 mr-1" />Add Section</Button>
              <Input placeholder="User ID for preview" value={previewUserId} onChange={e => setPreviewUserId(e.target.value)} className="h-8 w-28 bg-white/5 border-white/10 text-xs" />
              <Button size="sm" variant="outline" onClick={runPreview} disabled={previewLoading}>
                <Eye className="h-3.5 w-3.5 mr-1" />{previewLoading ? "..." : "Preview"}
              </Button>
            </div>
          </div>

          <Tabs value={editorTab} onValueChange={v => setEditorTab(v as "write" | "preview")} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="bg-white/5 border border-white/10 w-fit shrink-0">
              <TabsTrigger value="write">Write</TabsTrigger>
              <TabsTrigger value="preview">Preview with User Data</TabsTrigger>
            </TabsList>

            <TabsContent value="write" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 h-[min(420px,50vh)]">
                <ScrollArea className="lg:col-span-1 border border-white/10 rounded-lg bg-white/[0.02] p-2 h-full">
                  {Object.entries(groupedPlaceholders).map(([group, items]) => (
                    <div key={group} className="mb-3">
                      <p className="text-[10px] uppercase text-muted-foreground mb-1">{group}</p>
                      <div className="flex flex-wrap gap-1">
                        {items.map(p => (
                          <button key={p.key} type="button" className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/10 hover:border-amber-500/40" onClick={() => insertPlaceholder(p.key)}>
                            {p.key}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
                <Textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="lg:col-span-3 bg-white/5 border-white/10 font-mono text-xs h-full min-h-[320px] resize-none"
                  placeholder="Write agreement content here..."
                />
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex-1 min-h-0 mt-3 data-[state=inactive]:hidden">
              <ScrollArea className="h-[min(420px,50vh)] border border-white/10 rounded-lg bg-white/[0.02] p-4">
                {previewHtml ? renderPreviewText(previewHtml) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Enter a user ID and click Preview to see the agreement with real user data filled in.
                  </p>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-amber-500 text-black" onClick={saveTemplate} disabled={pending}>
              <Save className="h-4 w-4 mr-1" />{pending ? "Saving..." : editing ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
