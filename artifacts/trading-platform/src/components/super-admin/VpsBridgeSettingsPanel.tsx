import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Server, Wifi, WifiOff, Settings2, RefreshCw, CheckCircle, Eye, EyeOff, AlertCircle,
} from "lucide-react";
import { authFetchJson } from "@/lib/token-store";

type VpsConfig = {
  enabled: boolean;
  host: string;
  port: number;
  basePath: string;
  apiKey: string;
  useHttps: boolean;
  marketQuotesPath: string;
  tradeCopierDumpPath: string;
  notes: string;
};

export function VpsBridgeSettingsPanel() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<VpsConfig>({
    enabled: false, host: "", port: 8080, basePath: "/api", apiKey: "",
    useHttps: true, marketQuotesPath: "/v1/quotes", tradeCopierDumpPath: "/v1/trades/dump", notes: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    authFetchJson<VpsConfig>("/super-admin/settings/vps-bridge")
      .then(d => { setCfg(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/vps-bridge", { method: "POST", body: JSON.stringify(cfg) });
      toast({ title: "Windows VPS bridge saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await authFetchJson<{ ok: boolean; message: string }>("/super-admin/settings/vps-bridge/test", { method: "POST" });
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  const configured = Boolean(cfg.host);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
            <Server className="h-5 w-5 text-violet-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              Windows VPS Bridge
              {configured
                ? <Badge className="bg-green-500/20 text-green-400 text-xs"><Wifi className="h-2.5 w-2.5 mr-1" />Configured</Badge>
                : <Badge className="bg-orange-500/20 text-orange-400 text-xs"><WifiOff className="h-2.5 w-2.5 mr-1" />Not configured</Badge>}
            </CardTitle>
            <CardDescription>
              Connect your Windows VPS running MT4/MT5 bridge software. Used for live market quotes and trade copier dump (Duplikium / custom relay).
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={cfg.enabled} onChange={e => setCfg(c => ({ ...c, enabled: e.target.checked }))} className="rounded" />
              Enable VPS bridge for live quotes &amp; trade dumps
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label>VPS Host / IP</Label>
                <Input value={cfg.host} onChange={e => setCfg(c => ({ ...c, host: e.target.value }))} placeholder="203.0.113.10 or vps.yourdomain.com" className="bg-white/5 border-white/10 font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input type="number" value={cfg.port} onChange={e => setCfg(c => ({ ...c, port: Number(e.target.value) }))} className="bg-white/5 border-white/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Base Path</Label>
                <Input value={cfg.basePath} onChange={e => setCfg(c => ({ ...c, basePath: e.target.value }))} placeholder="/api" className="bg-white/5 border-white/10 font-mono" />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} value={cfg.apiKey} onChange={e => setCfg(c => ({ ...c, apiKey: e.target.value }))} className="bg-white/5 border-white/10 font-mono pr-10" />
                  <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={cfg.useHttps} onChange={e => setCfg(c => ({ ...c, useHttps: e.target.checked }))} className="rounded" />
              Use HTTPS (uncheck for plain HTTP on private VPS)
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Market Quotes Path</Label>
                <Input value={cfg.marketQuotesPath} onChange={e => setCfg(c => ({ ...c, marketQuotesPath: e.target.value }))} placeholder="/v1/quotes" className="bg-white/5 border-white/10 font-mono text-sm" />
                <p className="text-xs text-muted-foreground">GET ?symbols=EUR/USD,BTC/USD — returns ticks array</p>
              </div>
              <div className="space-y-2">
                <Label>Trade Copier Dump Path</Label>
                <Input value={cfg.tradeCopierDumpPath} onChange={e => setCfg(c => ({ ...c, tradeCopierDumpPath: e.target.value }))} placeholder="/v1/trades/dump" className="bg-white/5 border-white/10 font-mono text-sm" />
                <p className="text-xs text-muted-foreground">POST trade events from Duplikium / copier relay</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={cfg.notes} onChange={e => setCfg(c => ({ ...c, notes: e.target.value }))} placeholder="Optional admin notes" className="bg-white/5 border-white/10" />
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">
                {saving ? "Saving..." : <><Settings2 className="h-4 w-4 mr-2" />Save VPS Settings</>}
              </Button>
              <Button variant="outline" onClick={test} disabled={testing || !cfg.host}>
                {testing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</> : <><Wifi className="h-4 w-4 mr-2" />Test Connection</>}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${testResult.ok ? "bg-green-500/10 border-green-500/20 text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {testResult.ok ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                {testResult.message}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
