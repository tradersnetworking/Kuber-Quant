import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Inbox, RefreshCw, Save } from "lucide-react";
import { authFetchJson } from "@/lib/token-store";
import { STAFF_CARD, STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";
import { APP_ACTION_ROW } from "@/lib/ui-system";

type SupportInboxConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  inboxAddress: string;
  tlsRejectUnauthorized: boolean;
  configured: boolean;
  envFallback: boolean;
};

export function SupportInboxSettingsPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<SupportInboxConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setConfig(await authFetchJson<SupportInboxConfig>("/super-admin/settings/support-inbox"));
    } catch (e: any) {
      toast({ title: "Failed to load inbox settings", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/support-inbox", {
        method: "POST",
        body: JSON.stringify(config),
      });
      toast({ title: "Support inbox settings saved" });
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    try {
      const result = await authFetchJson<{ ok: boolean; message: string }>("/super-admin/settings/support-inbox/test", { method: "POST" });
      toast({
        title: result.ok ? "Connection OK" : "Connection failed",
        description: result.message,
        variant: result.ok ? "default" : "destructive",
      });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading || !config) return <Skeleton className="h-64 w-full" />;

  return (
    <Card className={STAFF_CARD}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Inbox className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          Support Inbox (IMAP)
        </CardTitle>
        <CardDescription>
          Connect support@kuberquant.com via IMAP so support and admin teams can read and reply to client emails from the dashboard.
        </CardDescription>
        <div className="flex gap-2 pt-2">
          {config.configured && <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/30">Configured</Badge>}
          {config.envFallback && <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30">Using environment variables</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border dark:border-white/10 p-3">
          <div>
            <p className="text-sm font-medium">Enable IMAP sync</p>
            <p className="text-xs text-muted-foreground">Allow support/admin to pull new emails into the dashboard inbox</p>
          </div>
          <Switch checked={config.enabled} onCheckedChange={v => setConfig({ ...config, enabled: v })} />
        </div>

        <div className={STAFF_FORM_GRID}>
          <div>
            <Label>Inbox address</Label>
            <Input
              value={config.inboxAddress}
              onChange={e => setConfig({ ...config, inboxAddress: e.target.value })}
              placeholder="support@kuberquant.com"
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
          </div>
          <div>
            <Label>IMAP Host</Label>
            <Input value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} placeholder="imap.kuberquant.com" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
          </div>
          <div>
            <Label>Port</Label>
            <Input type="number" value={config.port} onChange={e => setConfig({ ...config, port: Number(e.target.value) })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={config.user} onChange={e => setConfig({ ...config, user: e.target.value })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={config.pass} onChange={e => setConfig({ ...config, pass: e.target.value })} placeholder={config.pass ? "••••••••" : ""} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border dark:border-white/10 p-3">
            <div>
              <p className="text-sm">SSL / TLS</p>
              <p className="text-xs text-muted-foreground">Use secure connection (port 993)</p>
            </div>
            <Switch checked={config.secure} onCheckedChange={v => setConfig({ ...config, secure: v })} />
          </div>
        </div>

        <div className={APP_ACTION_ROW}>
          <Button size="sm" className="bg-amber-500 text-black" onClick={save} disabled={saving}>
            <Save className="h-4 w-4 mr-1" />{saving ? "Saving..." : "Save Inbox Settings"}
          </Button>
          <Button size="sm" variant="outline" onClick={test} disabled={testing}>
            <RefreshCw className={`h-4 w-4 mr-1 ${testing ? "animate-spin" : ""}`} />Test IMAP
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
