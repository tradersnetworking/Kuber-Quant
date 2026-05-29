import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { Key, Plus, Trash2, Copy, Webhook } from "lucide-react";

type PartnerKey = {
  id: number;
  name: string;
  keyPrefix: string;
  scopes: string[];
  webhookUrl: string | null;
  webhookEvents: string[];
  hasWebhookSecret: boolean;
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
};

export function PartnerIntegrationsPanel() {
  const { toast } = useToast();
  const [keys, setKeys] = useState<PartnerKey[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    scopes: [] as string[],
    webhookUrl: "",
    webhookSecret: "",
    webhookEvents: [] as string[],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [keyRows, scopeRes, eventRes] = await Promise.all([
        authFetchJson<PartnerKey[]>("/super-admin/partner-keys"),
        authFetchJson<{ scopes: string[] }>("/super-admin/partner-keys/scopes"),
        authFetchJson<{ events: string[] }>("/super-admin/partner-keys/webhook-events"),
      ]);
      setKeys(keyRows);
      setScopes(scopeRes.scopes);
      setEvents(eventRes.events);
    } catch (err: any) {
      toast({ title: "Failed to load partner keys", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const toggleScope = (scope: string) => {
    setForm(f => ({
      ...f,
      scopes: f.scopes.includes(scope) ? f.scopes.filter(s => s !== scope) : [...f.scopes, scope],
    }));
  };

  const toggleEvent = (event: string) => {
    setForm(f => ({
      ...f,
      webhookEvents: f.webhookEvents.includes(event)
        ? f.webhookEvents.filter(e => e !== event)
        : [...f.webhookEvents, event],
    }));
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const result = await authFetchJson<{ key: string; record: PartnerKey }>("/super-admin/partner-keys", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setNewKey(result.key);
      setForm({ name: "", scopes: [], webhookUrl: "", webhookSecret: "", webhookEvents: [] });
      await load();
      toast({ title: "Partner API key created" });
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number) => {
    try {
      await authFetchJson(`/super-admin/partner-keys/${id}`, { method: "DELETE" });
      await load();
      toast({ title: "Partner key revoked" });
    } catch (err: any) {
      toast({ title: "Revoke failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          Partner API Keys
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Scoped read-only API access and outbound webhooks for external integrations. Authenticate with the <code className="text-xs">X-Partner-Key</code> header.
        </p>
      </div>

      {newKey && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base">New API key — copy now</CardTitle>
            <CardDescription>This key is shown once and cannot be retrieved again.</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2 items-center">
            <code className="flex-1 text-xs break-all p-2 rounded bg-muted">{newKey}</code>
            <Button size="sm" variant="secondary" onClick={() => {
              void navigator.clipboard.writeText(newKey);
              toast({ title: "Copied to clipboard" });
            }}>
              <Copy className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Create partner key</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Integration name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CRM / Analytics partner" />
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="grid sm:grid-cols-2 gap-2">
              {scopes.map(scope => (
                <label key={scope} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={form.scopes.includes(scope)} onCheckedChange={() => toggleScope(scope)} />
                  {scope}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Webhook className="h-3.5 w-3.5" /> Webhook URL (optional)</Label>
            <Input value={form.webhookUrl} onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} placeholder="https://partner.example.com/webhooks/kuber" />
          </div>

          <div className="space-y-2">
            <Label>Webhook secret (optional, for HMAC signature)</Label>
            <Input value={form.webhookSecret} onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))} type="password" />
          </div>

          {form.webhookUrl && (
            <div className="space-y-2">
              <Label>Webhook events</Label>
              <div className="grid sm:grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                {events.map(event => (
                  <label key={event} className="flex items-center gap-2 text-xs">
                    <Checkbox checked={form.webhookEvents.includes(event)} onCheckedChange={() => toggleEvent(event)} />
                    {event}
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button onClick={() => void handleCreate()} disabled={creating}>
            <Plus className="h-4 w-4 mr-1" />
            Create key
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active keys</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {!loading && keys.length === 0 && (
            <p className="text-sm text-muted-foreground">No partner keys yet.</p>
          )}
          {keys.map(k => (
            <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border">
              <div>
                <p className="font-medium">{k.name}</p>
                <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}…</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {k.scopes.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                </div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => void revoke(k.id)}>
                <Trash2 className="h-4 w-4 mr-1" /> Revoke
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
