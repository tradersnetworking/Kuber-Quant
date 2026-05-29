import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { STAFF_FORM_GRID, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";
import { MessageSquare, Phone, Mail, Flame, Save, Send, RefreshCw } from "lucide-react";

type OtpConfig = {
  email: { enabled: boolean };
  sms: {
    enabled: boolean;
    provider: "msg91" | "twilio" | "generic";
    apiKey: string;
    accountSid: string;
    senderId: string;
    templateId: string;
    apiUrl: string;
  };
  whatsapp: {
    enabled: boolean;
    phoneNumberId: string;
    accessToken: string;
    templateName: string;
    templateLanguage: string;
  };
  firebase: {
    enabled: boolean;
    projectId: string;
    apiKey: string;
    authDomain: string;
    appId: string;
  };
  preferredMobileChannel: "sms" | "whatsapp" | "firebase";
  login2faSms: boolean;
  login2faWhatsapp: boolean;
  otpMessageTemplate: string;
};

type Summary = {
  emailOtpEnabled: boolean;
  smsOtpEnabled: boolean;
  whatsappOtpEnabled: boolean;
  firebaseOtpEnabled: boolean;
};

const DEFAULT_CONFIG: OtpConfig = {
  email: { enabled: true },
  sms: { enabled: false, provider: "msg91", apiKey: "", accountSid: "", senderId: "", templateId: "", apiUrl: "" },
  whatsapp: { enabled: false, phoneNumberId: "", accessToken: "", templateName: "otp_verification", templateLanguage: "en" },
  firebase: { enabled: false, projectId: "", apiKey: "", authDomain: "", appId: "" },
  preferredMobileChannel: "sms",
  login2faSms: false,
  login2faWhatsapp: false,
  otpMessageTemplate: "Your Kuber Quant verification code is {{otp}}. Valid for {{minutes}} minutes. Do not share this code.",
};

export function OtpChannelsSettingsPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<OtpConfig>(DEFAULT_CONFIG);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testChannel, setTestChannel] = useState<"email" | "sms" | "whatsapp">("sms");
  const [testing, setTesting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetchJson<{ config: OtpConfig; summary: Summary }>("/super-admin/settings/otp-communication");
      setConfig({ ...DEFAULT_CONFIG, ...data.config });
      setSummary(data.summary);
    } catch (e: any) {
      toast({ title: "Failed to load OTP settings", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await authFetchJson("/super-admin/settings/otp-communication", {
        method: "POST",
        body: JSON.stringify({ config }),
      });
      toast({ title: "OTP channel settings saved" });
      await load();
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const result = await authFetchJson<{ ok: boolean; message: string; devOtp?: string }>("/super-admin/settings/otp-communication/test", {
        method: "POST",
        body: JSON.stringify({
          channel: testChannel,
          phone: testPhone,
          email: testEmail,
          name: "Super Admin Test",
        }),
      });
      toast({ title: result.ok ? "Test sent" : "Test failed", description: result.message });
      if (result.devOtp) toast({ title: `Dev OTP: ${result.devOtp}`, duration: 12000 });
    } catch (e: any) {
      toast({ title: "Test failed", description: e.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  const patch = <K extends keyof OtpConfig>(section: K, patch: Partial<OtpConfig[K]>) => {
    setConfig(prev => ({ ...prev, [section]: { ...(prev[section] as object), ...patch } as OtpConfig[K] }));
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground p-4">Loading OTP settings…</p>;
  }

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">OTP &amp; Verification Channels</h3>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Enable or disable Email, SMS, WhatsApp Business API, and Google Firebase phone OTP. Used for registration, login 2FA, and verification flows.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" /> Refresh</Button>
          <Button size="sm" onClick={save} disabled={saving} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Save className="h-4 w-4 mr-1" /> {saving ? "Saving…" : "Save OTP Settings"}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="flex flex-wrap gap-2">
          <Badge variant={summary.emailOtpEnabled ? "default" : "outline"}><Mail className="h-3 w-3 mr-1" /> Email {summary.emailOtpEnabled ? "ON" : "OFF"}</Badge>
          <Badge variant={summary.smsOtpEnabled ? "default" : "outline"}><Phone className="h-3 w-3 mr-1" /> SMS {summary.smsOtpEnabled ? "ON" : "OFF"}</Badge>
          <Badge variant={summary.whatsappOtpEnabled ? "default" : "outline"}><MessageSquare className="h-3 w-3 mr-1" /> WhatsApp {summary.whatsappOtpEnabled ? "ON" : "OFF"}</Badge>
          <Badge variant={summary.firebaseOtpEnabled ? "default" : "outline"}><Flame className="h-3 w-3 mr-1" /> Firebase {summary.firebaseOtpEnabled ? "ON" : "OFF"}</Badge>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Email OTP</CardTitle>
          <CardDescription>Uses SMTP + Auto Emails → OTP purpose (configure in Auto Emails tab).</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="email-otp">Enable email OTP</Label>
          <Switch id="email-otp" checked={config.email.enabled} onCheckedChange={v => patch("email", { enabled: v })} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> SMS OTP</CardTitle>
          <CardDescription>MSG91, Twilio, or custom HTTP API for registration and optional login 2FA.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="sms-otp">Enable SMS OTP</Label>
            <Switch id="sms-otp" checked={config.sms.enabled} onCheckedChange={v => patch("sms", { enabled: v })} />
          </div>
          <div className={STAFF_FORM_GRID}>
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={config.sms.provider} onValueChange={v => patch("sms", { provider: v as OtpConfig["sms"]["provider"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="msg91">MSG91</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="generic">Generic HTTP API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>API Key / Auth Token</Label>
              <Input value={config.sms.apiKey} onChange={e => patch("sms", { apiKey: e.target.value })} placeholder="Leave blank to keep existing" />
            </div>
            {config.sms.provider === "twilio" && (
              <div className="space-y-1.5">
                <Label>Account SID</Label>
                <Input value={config.sms.accountSid} onChange={e => patch("sms", { accountSid: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Sender ID / From number</Label>
              <Input value={config.sms.senderId} onChange={e => patch("sms", { senderId: e.target.value })} placeholder="KUBERQ or +1..." />
            </div>
            <div className="space-y-1.5">
              <Label>Template / Flow ID (MSG91)</Label>
              <Input value={config.sms.templateId} onChange={e => patch("sms", { templateId: e.target.value })} />
            </div>
            {config.sms.provider === "generic" && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>API URL</Label>
                <Input value={config.sms.apiUrl} onChange={e => patch("sms", { apiUrl: e.target.value })} placeholder="https://your-sms-gateway/send" />
              </div>
            )}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div>
              <Label htmlFor="login2fa-sms">Allow SMS OTP for login 2FA</Label>
              <p className="text-xs text-muted-foreground">Requires user phone on profile</p>
            </div>
            <Switch id="login2fa-sms" checked={config.login2faSms} onCheckedChange={v => setConfig(c => ({ ...c, login2faSms: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp Business API OTP</CardTitle>
          <CardDescription>Meta Cloud API template message with OTP body parameter.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="wa-otp">Enable WhatsApp OTP</Label>
            <Switch id="wa-otp" checked={config.whatsapp.enabled} onCheckedChange={v => patch("whatsapp", { enabled: v })} />
          </div>
          <div className={STAFF_FORM_GRID}>
            <div className="space-y-1.5">
              <Label>Phone Number ID</Label>
              <Input value={config.whatsapp.phoneNumberId} onChange={e => patch("whatsapp", { phoneNumberId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Access Token</Label>
              <Input type="password" value={config.whatsapp.accessToken} onChange={e => patch("whatsapp", { accessToken: e.target.value })} placeholder="Leave blank to keep existing" />
            </div>
            <div className="space-y-1.5">
              <Label>Template name</Label>
              <Input value={config.whatsapp.templateName} onChange={e => patch("whatsapp", { templateName: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Template language</Label>
              <Input value={config.whatsapp.templateLanguage} onChange={e => patch("whatsapp", { templateLanguage: e.target.value })} placeholder="en" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div>
              <Label htmlFor="login2fa-wa">Allow WhatsApp OTP for login 2FA</Label>
              <p className="text-xs text-muted-foreground">Requires user phone on profile</p>
            </div>
            <Switch id="login2fa-wa" checked={config.login2faWhatsapp} onCheckedChange={v => setConfig(c => ({ ...c, login2faWhatsapp: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4" /> Google Firebase Phone OTP</CardTitle>
          <CardDescription>Client-side Firebase Auth phone verification; server validates ID token. Create a Firebase web app and enable Phone sign-in.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="fb-otp">Enable Firebase phone OTP</Label>
            <Switch id="fb-otp" checked={config.firebase.enabled} onCheckedChange={v => patch("firebase", { enabled: v })} />
          </div>
          <div className={STAFF_FORM_GRID}>
            <div className="space-y-1.5">
              <Label>Project ID</Label>
              <Input value={config.firebase.projectId} onChange={e => patch("firebase", { projectId: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Web API Key</Label>
              <Input value={config.firebase.apiKey} onChange={e => patch("firebase", { apiKey: e.target.value })} placeholder="Leave blank to keep existing" />
            </div>
            <div className="space-y-1.5">
              <Label>Auth domain</Label>
              <Input value={config.firebase.authDomain} onChange={e => patch("firebase", { authDomain: e.target.value })} placeholder="your-app.firebaseapp.com" />
            </div>
            <div className="space-y-1.5">
              <Label>App ID</Label>
              <Input value={config.firebase.appId} onChange={e => patch("firebase", { appId: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Defaults &amp; message template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5 max-w-xs">
            <Label>Preferred mobile channel</Label>
            <Select value={config.preferredMobileChannel} onValueChange={v => setConfig(c => ({ ...c, preferredMobileChannel: v as OtpConfig["preferredMobileChannel"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="firebase">Firebase</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>SMS / WhatsApp message template</Label>
            <Textarea
              value={config.otpMessageTemplate}
              onChange={e => setConfig(c => ({ ...c, otpMessageTemplate: e.target.value }))}
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Use {"{{otp}}"} and {"{{minutes}}"} placeholders.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4" /> Send test OTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select value={testChannel} onValueChange={v => setTestChannel(v as typeof testChannel)}>
                <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {testChannel === "email" ? (
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label>Test email</Label>
                <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            ) : (
              <div className="space-y-1.5 flex-1 min-w-[200px]">
                <Label>Test phone (E.164)</Label>
                <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="+919876543210" />
              </div>
            )}
            <Button onClick={sendTest} disabled={testing} variant="outline">
              {testing ? "Sending…" : "Send test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
