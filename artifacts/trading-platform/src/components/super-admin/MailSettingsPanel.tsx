import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Mail, Send, Settings2, RefreshCw, CheckCircle, Eye, EyeOff, AlertCircle, Server,
} from "lucide-react";
import { authFetchJson } from "@/lib/token-store";
import { STAFF_CARD, STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";
import { APP_ACTION_ROW } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

type SmtpConfig = {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  tlsRejectUnauthorized: boolean;
  configured?: boolean;
  envFallback?: boolean;
  source?: string;
};

export function MailSettingsPanel() {
  const { toast } = useToast();
  const [cfg, setCfg] = useState<SmtpConfig>({
    enabled: true,
    host: "",
    port: 587,
    secure: false,
    user: "",
    pass: "",
    from: "Kuber Quant <noreply@kuberquant.com>",
    tlsRejectUnauthorized: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [envFallback, setEnvFallback] = useState(false);

  useEffect(() => {
    authFetchJson<SmtpConfig>("/super-admin/settings/smtp")
      .then(d => {
        setCfg(d);
        setEnvFallback(Boolean(d.envFallback));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/smtp", { method: "POST", body: JSON.stringify(cfg) });
      toast({ title: "Mail settings saved" });
      setEnvFallback(false);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function test(sendEmail = false) {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await authFetchJson<{ ok: boolean; message: string }>("/super-admin/settings/smtp/test", {
        method: "POST",
        body: JSON.stringify(sendEmail ? { testTo } : {}),
      });
      setTestResult(r);
    } catch (e: any) {
      setTestResult({ ok: false, message: e.message });
    } finally {
      setTesting(false);
    }
  }

  const configured = Boolean(cfg.host && cfg.user && (cfg.pass || cfg.configured));

  return (
    <Card className={STAFF_CARD}>
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="p-2 bg-sky-500/10 border border-sky-500/20 rounded-lg">
            <Mail className="h-5 w-5 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              SMTP &amp; Mail Delivery
              {configured
                ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs"><CheckCircle className="h-2.5 w-2.5 mr-1" />Configured</Badge>
                : <Badge className="bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs"><AlertCircle className="h-2.5 w-2.5 mr-1" />Not configured</Badge>}
              {envFallback && (
                <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs"><Server className="h-2.5 w-2.5 mr-1" />Using .env fallback</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Configure outgoing email for OTP verification, password reset, welcome messages, and admin notifications.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] px-4 py-3">
              <div>
                <p className="text-sm font-medium">Enable outbound email</p>
                <p className="text-xs text-muted-foreground">When off, OTP and notification emails are skipped silently.</p>
              </div>
              <Switch checked={cfg.enabled} onCheckedChange={v => setCfg(c => ({ ...c, enabled: v }))} />
            </div>

            <div className={cn(STAFF_FORM_GRID, "md:grid-cols-3")}>
              <div className="md:col-span-2 space-y-2">
                <Label>SMTP Host</Label>
                <Input value={cfg.host} onChange={e => setCfg(c => ({ ...c, host: e.target.value }))} placeholder="smtp.gmail.com" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
              </div>
              <div className="space-y-2">
                <Label>Port</Label>
                <Input type="number" value={cfg.port} onChange={e => setCfg(c => ({ ...c, port: Number(e.target.value) || 587 }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
            </div>

            <div className={STAFF_FORM_GRID}>
              <div className="space-y-2">
                <Label>Username</Label>
                <Input value={cfg.user} onChange={e => setCfg(c => ({ ...c, user: e.target.value }))} placeholder="noreply@yourdomain.com" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
              <div className="space-y-2">
                <Label>Password / App Password</Label>
                <div className="relative">
                  <Input
                    type={showPass ? "text" : "password"}
                    value={cfg.pass}
                    onChange={e => setCfg(c => ({ ...c, pass: e.target.value }))}
                    placeholder="••••••••"
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 pr-10"
                  />
                  <button type="button" onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>From Address</Label>
              <Input value={cfg.from} onChange={e => setCfg(c => ({ ...c, from: e.target.value }))} placeholder="Kuber Quant <noreply@kuberquant.com>" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.secure} onChange={e => setCfg(c => ({ ...c, secure: e.target.checked }))} className="rounded" />
                Use SSL/TLS (port 465)
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={cfg.tlsRejectUnauthorized} onChange={e => setCfg(c => ({ ...c, tlsRejectUnauthorized: e.target.checked }))} className="rounded" />
                Reject unauthorized TLS certificates
              </label>
            </div>

            <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Send test email</p>
              <div className={APP_ACTION_ROW}>
                <Input
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                  placeholder="you@company.com (optional)"
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 max-w-xs"
                />
                <Button variant="outline" onClick={() => test(false)} disabled={testing || !cfg.host}>
                  {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Settings2 className="h-4 w-4 mr-2" />Verify connection</>}
                </Button>
                <Button variant="outline" onClick={() => test(true)} disabled={testing || !cfg.host || !testTo.trim()}>
                  {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" />Send test</>}
                </Button>
              </div>
            </div>

            <div className={APP_ACTION_ROW}>
              <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">
                {saving ? "Saving..." : <><Settings2 className="h-4 w-4 mr-2" />Save Mail Settings</>}
              </Button>
            </div>

            {testResult && (
              <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${testResult.ok ? "bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                {testResult.ok ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                {testResult.message}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Database settings override <code className="text-[10px]">SMTP_*</code> environment variables. Use app passwords for Gmail/Outlook.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
