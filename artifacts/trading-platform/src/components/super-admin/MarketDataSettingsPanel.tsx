import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, Settings2, RefreshCw, CheckCircle, AlertCircle, Eye, EyeOff, X,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { authFetchJson } from "@/lib/token-store";
import { STAFF_CARD, STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";

type MarketConfig = {
  provider: "auto" | "vps" | "public";
  defaultPairs: string[];
  refreshSeconds: number;
  customApiUrl: string;
  customApiKey: string;
};

const ALL_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD", "USD/CHF", "NZD/USD",
  "EUR/GBP", "EUR/JPY", "GBP/JPY", "XAU/USD", "XAG/USD", "BTC/USD", "ETH/USD",
  "US30", "NAS100", "GER40", "USOIL", "UKOIL", "USD/INR",
];

export function MarketDataSettingsPanel() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<MarketConfig>({
    provider: "auto", defaultPairs: ALL_PAIRS.slice(0, 10), refreshSeconds: 30, customApiUrl: "", customApiKey: "",
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; sample?: Array<{ symbol: string; price: number }> } | null>(null);
  const [addPair, setAddPair] = useState<string | undefined>(undefined);

  useEffect(() => {
    authFetchJson<MarketConfig>("/super-admin/settings/market-data")
      .then(d => { setCfg(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  function togglePair(pair: string) {
    setCfg(c => {
      if (c.defaultPairs.includes(pair)) {
        return { ...c, defaultPairs: c.defaultPairs.filter(p => p !== pair) };
      }
      if (c.defaultPairs.length >= 10) {
        toast({ title: "Maximum 10 pairs", variant: "destructive" });
        return c;
      }
      return { ...c, defaultPairs: [...c.defaultPairs, pair] };
    });
  }

  async function save() {
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/market-data", { method: "POST", body: JSON.stringify(cfg) });
      toast({ title: "Market data settings saved" });
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
      const r = await authFetchJson<{ ok: boolean; message: string; sample?: Array<{ symbol: string; price: number }> }>(
        "/super-admin/settings/market-data/test", { method: "POST" },
      );
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  return (
    <Card className={STAFF_CARD}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
            <LineChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <CardTitle>Live Market Data API</CardTitle>
            <CardDescription>
              Configure how the dashboard and header ticker fetch live prices. Users can personalize up to 10 pairs on their dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {!loaded ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <div className={STAFF_FORM_GRID}>
              <div className="space-y-2">
                <Label>Data Provider</Label>
                <Select value={cfg.provider} onValueChange={v => setCfg(c => ({ ...c, provider: v as MarketConfig["provider"] }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (VPS if enabled, else public APIs)</SelectItem>
                    <SelectItem value="vps">Windows VPS only</SelectItem>
                    <SelectItem value="public">Public APIs only (CoinGecko + Frankfurter)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Refresh Interval (seconds)</Label>
                <Input type="number" min={10} max={300} value={cfg.refreshSeconds} onChange={e => setCfg(c => ({ ...c, refreshSeconds: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
            </div>

            <div className={STAFF_FORM_GRID}>
              <div className="space-y-2">
                <Label>Custom Market API URL (optional)</Label>
                <Input value={cfg.customApiUrl} onChange={e => setCfg(c => ({ ...c, customApiUrl: e.target.value }))} placeholder="https://api.example.com/quotes" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm" />
              </div>
              <div className="space-y-2">
                <Label>Custom API Key</Label>
                <div className="relative">
                  <Input type={showKey ? "text" : "password"} value={cfg.customApiKey} onChange={e => setCfg(c => ({ ...c, customApiKey: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 pr-10" />
                  <button type="button" onClick={() => setShowKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Default Platform Pairs ({cfg.defaultPairs.length}/10)</Label>
                <p className="text-xs text-muted-foreground">Shown to new users &amp; header ticker when logged out</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {cfg.defaultPairs.map(pair => (
                  <Badge key={pair} variant="outline" className="cursor-pointer border-amber-500/40 text-amber-700 dark:text-amber-300 pr-1">
                    {pair}
                    <button type="button" onClick={() => togglePair(pair)} className="ml-1 hover:text-foreground"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={addPair} onValueChange={setAddPair}>
                  <SelectTrigger className="w-[180px] bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue placeholder="Add pair..." /></SelectTrigger>
                  <SelectContent>
                    {ALL_PAIRS.filter(p => !cfg.defaultPairs.includes(p)).map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={!addPair || cfg.defaultPairs.length >= 10} onClick={() => { if (addPair) { togglePair(addPair); setAddPair(undefined); } }}>
                  Add Pair
                </Button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">
                {saving ? "Saving..." : <><Settings2 className="h-4 w-4 mr-2" />Save Market Settings</>}
              </Button>
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</> : <><RefreshCw className="h-4 w-4 mr-2" />Test Live Feed</>}
              </Button>
            </div>

            {testResult && (
              <div className={`p-3 rounded-lg border text-sm space-y-2 ${testResult.ok ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                <div className="flex items-start gap-2">
                  {testResult.ok ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                  {testResult.message}
                </div>
                {testResult.sample?.length ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {testResult.sample.map(t => (
                      <span key={t.symbol} className="text-xs font-mono bg-muted dark:bg-black/30 px-2 py-1 rounded">{t.symbol}: {t.price}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
