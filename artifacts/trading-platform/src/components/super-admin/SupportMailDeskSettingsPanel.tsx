import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Headset, Plus, Save, Trash2 } from "lucide-react";
import { authFetchJson } from "@/lib/token-store";

type DeskConfig = {
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  autoCreateTickets: boolean;
  autoTicketCategories: string[];
  notifyAgentsOnInbound: boolean;
  slaHours: { query: number; complaint: number; dispute: number; general: number };
};

type Template = { id: number; name: string; category: string; subject: string | null; body: string; isActive: boolean };

interface SupportMailDeskSettingsPanelProps {
  apiBase?: string;
}

export function SupportMailDeskSettingsPanel({ apiBase = "/support-team/mail" }: SupportMailDeskSettingsPanelProps) {
  const { toast } = useToast();
  const [config, setConfig] = useState<DeskConfig | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: "", category: "general", subject: "", body: "" });

  const superAdminApi = apiBase.includes("mail-desk");
  const deskUrl = superAdminApi ? apiBase : `${apiBase}/desk-config`;
  const templatesUrl = superAdminApi ? `${apiBase}/templates` : `${apiBase}/templates/all`;

  const load = async () => {
    setLoading(true);
    try {
      const [desk, tpls] = await Promise.all([
        authFetchJson<DeskConfig>(deskUrl),
        authFetchJson<Template[]>(templatesUrl),
      ]);
      setConfig(desk);
      setTemplates(tpls);
    } catch (e: any) {
      toast({ title: "Failed to load desk settings", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [apiBase]);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await authFetchJson(deskUrl, { method: "POST", body: JSON.stringify(config) });
      toast({ title: "Mail desk settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = async () => {
    if (!draft.name.trim() || !draft.body.trim()) return;
    try {
      await authFetchJson(templatesUrl, { method: "POST", body: JSON.stringify(draft) });
      setDraft({ name: "", category: "general", subject: "", body: "" });
      await load();
      toast({ title: "Template added" });
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const removeTemplate = async (id: number) => {
    await authFetchJson(`${templatesUrl}/${id}`, { method: "DELETE" });
    await load();
  };

  if (loading || !config) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Headset className="h-4 w-4 text-sky-400" />
            Mail Desk Automation
          </CardTitle>
          <CardDescription>Configure auto-sync, SLA targets, auto-ticketing, and agent notifications for support@kuberquant.com</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <div><p className="text-sm font-medium">Auto IMAP sync</p><p className="text-xs text-muted-foreground">Pull new emails every 5 minutes</p></div>
              <Switch checked={config.autoSyncEnabled} onCheckedChange={v => setConfig({ ...config, autoSyncEnabled: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
              <div><p className="text-sm font-medium">Notify agents on inbound</p><p className="text-xs text-muted-foreground">In-app alert for support & admin</p></div>
              <Switch checked={config.notifyAgentsOnInbound} onCheckedChange={v => setConfig({ ...config, notifyAgentsOnInbound: v })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 p-3 md:col-span-2">
              <div><p className="text-sm font-medium">Auto-create tickets</p><p className="text-xs text-muted-foreground">For complaints & disputes when sender is a platform user</p></div>
              <Switch checked={config.autoCreateTickets} onCheckedChange={v => setConfig({ ...config, autoCreateTickets: v })} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(["query", "complaint", "dispute", "general"] as const).map(key => (
              <div key={key}>
                <Label className="text-xs capitalize">SLA hours — {key}</Label>
                <Input
                  type="number"
                  value={config.slaHours[key]}
                  onChange={e => setConfig({ ...config, slaHours: { ...config.slaHours, [key]: Number(e.target.value) } })}
                  className="bg-white/5 border-white/10 mt-1"
                />
              </div>
            ))}
          </div>

          <Button size="sm" className="bg-amber-500 text-black" onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save Desk Settings"}
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Canned Reply Templates</CardTitle>
          <CardDescription>Use merge fields: {"{{userName}}"}, {"{{userEmail}}"}, {"{{ticketId}}"}, {"{{subject}}"}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="Template name" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} className="bg-white/5 border-white/10" />
            <Input placeholder="Optional subject" value={draft.subject} onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))} className="bg-white/5 border-white/10" />
          </div>
          <Textarea placeholder="Template body..." value={draft.body} onChange={e => setDraft(d => ({ ...d, body: e.target.value }))} rows={4} className="bg-white/5 border-white/10" />
          <Button size="sm" variant="outline" onClick={addTemplate}><Plus className="h-4 w-4 mr-1" />Add Template</Button>

          <Table>
            <TableHeader>
              <TableRow className="border-white/10">
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map(t => (
                <TableRow key={t.id} className="border-white/10">
                  <TableCell>{t.name}</TableCell>
                  <TableCell><Badge variant="outline">{t.category}</Badge></TableCell>
                  <TableCell>{t.isActive ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" onClick={() => removeTemplate(t.id)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
