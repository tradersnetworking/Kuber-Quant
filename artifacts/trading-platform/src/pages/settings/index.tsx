import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Copy, CheckCircle, AlertTriangle, ExternalLink, Key, Monitor, Globe, Clock, RefreshCw, Lock, Eye, EyeOff, User, CreditCard, Activity, Download } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as ApiHooks from "@workspace/api-client-react";
import QRCode from "qrcode";
import { PersonalPaymentAccounts } from "@/components/wallet/PersonalPaymentAccounts";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { AppPage } from "@/components/layout/AppPage";
import { APP_FORM_GRID, APP_PAGE_STACK } from "@/lib/ui-system";
import { cn } from "@/lib/utils";
import { apiPath, authFetch, authFetchJson } from "@/lib/token-store";

function ChangePasswordCard() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "New password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "New password and confirmation must match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(apiPath("/auth/change-password"), {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");
      toast({ title: "Password changed", description: "Your password has been updated successfully." });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to change password.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Change Password
        </CardTitle>
        <CardDescription>Update your account password. Use a strong, unique password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Current Password</Label>
            <div className="relative">
              <Input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-foreground placeholder:text-muted-foreground/80 focus:border-amber-500/50 pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">New Password</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required minLength={8}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-foreground placeholder:text-muted-foreground/80 focus:border-amber-500/50 pr-10"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-foreground placeholder:text-muted-foreground/80 focus:border-amber-500/50"
            />
          </div>
          <Button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold border-0"
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function TrustedDevicesCard() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await authFetchJson<any[]>("/auth/2fa/trusted-devices");
      setDevices(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: number) {
    const r = await authFetch(apiPath(`/auth/2fa/trusted-devices/${id}`), { method: "DELETE" });
    if (r.ok) { toast({ title: "Device removed" }); load(); }
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Trusted Devices</CardTitle>
        <CardDescription>Devices that can skip 2FA for 30 days.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No trusted devices.</p>
        ) : (
          <div className="space-y-2">
            {devices.map(d => (
              <div key={d.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/80 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium">{d.deviceLabel}</p>
                  <p className="text-xs text-muted-foreground">{d.ipAddress || "Unknown IP"} · Last used {new Date(d.lastUsedAt).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => revoke(d.id)}>Remove</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveSessionsCard() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await authFetchJson<any[]>("/auth/2fa/sessions");
      setSessions(data);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function revoke(id: number) {
    const r = await authFetch(apiPath(`/auth/2fa/sessions/${id}`), { method: "DELETE" });
    if (r.ok) { toast({ title: "Session revoked" }); load(); }
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Active Sessions</CardTitle>
        <CardDescription>Manage signed-in devices and revoke access.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active sessions.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/80 dark:border-white/5">
                <div>
                  <p className="text-sm font-medium">{s.deviceLabel}</p>
                  <p className="text-xs text-muted-foreground">{s.ipAddress || "Unknown IP"} · {new Date(s.createdAt).toLocaleString()}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => revoke(s.id)}>Revoke</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoginHistoryCard() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const d = await authFetchJson<any[]>("/audit-logs/my-login-history");
      setHistory(d);
    } catch { /* ignore */ }
    finally { setLoading(false); setLoaded(true); }
  }

  useEffect(() => { load(); }, []);

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-base">Login History</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>Recent sign-in activity on your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded || loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/60 dark:bg-white/5 animate-pulse rounded-lg" />
          ))}</div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No login history available.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((h: any, i: number) => (
              <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${i === 0 ? "border-amber-500/20 bg-amber-500/5" : "border-border/80 dark:border-white/5 bg-white/3"}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${h.success ? "bg-green-500" : "bg-red-500"}`} />
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">
                      {h.browser || "Unknown browser"} · {h.device || "Desktop"}
                      {i === 0 && <Badge className="ml-2 text-[10px] py-0 bg-amber-500/20 text-amber-600 dark:text-amber-400">Current</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground">{h.ipAddress || "Unknown IP"}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {h.createdAt ? new Date(h.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function QRCodeCanvas({ uri }: { uri: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && uri) {
      QRCode.toCanvas(canvasRef.current, uri, {
        width: 200, margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).catch(() => {});
    }
  }, [uri]);
  return <canvas ref={canvasRef} className="rounded-lg border border-border dark:border-white/10" />;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const allowedTabs = new Set(["profile", "payout", "security", "activity"]);
  const tabFromUrl = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search).get("tab");
  const [activeTab, setActiveTab] = useState(() => (tabFromUrl && allowedTabs.has(tabFromUrl) ? tabFromUrl : "profile"));

  useEffect(() => {
    if (tabFromUrl && allowedTabs.has(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
    params.set("tab", tab);
    setLocation(`/account?${params.toString()}`);
  };

  const useTwoFactorSetup   = (ApiHooks as any).useTwoFactorSetup;
  const useTwoFactorEnable  = (ApiHooks as any).useTwoFactorEnable;
  const useTwoFactorDisable = (ApiHooks as any).useTwoFactorDisable;
  const useGetMe            = (ApiHooks as any).useGetMe;

  const { data: meData, refetch: refetchMe } = useGetMe
    ? useGetMe()
    : { data: null, refetch: () => {} };

  const setupMutation   = useTwoFactorSetup   ? useTwoFactorSetup()   : { mutate: (_: any, __: any) => {}, isPending: false };
  const enableMutation  = useTwoFactorEnable  ? useTwoFactorEnable()  : { mutate: (_: any, __: any) => {}, isPending: false };
  const disableMutation = useTwoFactorDisable ? useTwoFactorDisable() : { mutate: (_: any, __: any) => {}, isPending: false };

  const [showSetup,   setShowSetup]   = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [setupData,   setSetupData]   = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [verifyCode,  setVerifyCode]  = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupStep,   setSetupStep]   = useState<"scan" | "verify" | "backup" | "done">("scan");
  const [copied,      setCopied]      = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [regenCode,   setRegenCode]   = useState("");

  const twoFactorEnabled = meData?.twoFactorEnabled ?? user?.twoFactorEnabled ?? false;

  const handleStartSetup = () => {
    setSetupData(null);
    setVerifyCode("");
    setSetupStep("scan");
    setShowSetup(true);
    setupMutation.mutate(undefined, {
      onSuccess: (data: any) => setSetupData(data),
      onError: () => { toast({ title: "Failed to start setup", variant: "destructive" }); setShowSetup(false); },
    });
  };

  const handleEnable = async () => {
    if (verifyCode.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    try {
      const res = await authFetch(apiPath("/auth/2fa/enable"), {
        method: "POST",
        body: JSON.stringify({ code: verifyCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setBackupCodes(data.backupCodes || []);
      setSetupStep("backup");
      refetchMe();
    } catch (err: any) {
      toast({ title: "Invalid code", description: err?.message || "Try again.", variant: "destructive" });
    }
  };

  const handleDisable = () => {
    if (disableCode.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    disableMutation.mutate({ data: { code: disableCode } }, {
      onSuccess: () => { setShowDisable(false); setDisableCode(""); refetchMe(); toast({ title: "2FA Disabled" }); },
      onError: (err: any) => toast({ title: "Invalid code", description: err?.message || "Try again.", variant: "destructive" }),
    });
  };

  const copySecret = () => {
    if (setupData?.secret) { navigator.clipboard.writeText(setupData.secret); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <>
    <AppPage
      className="max-w-4xl mx-auto w-full"
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          My Account
        </h1>
      }
      subtitle="Profile, payout accounts, security, and wallet actions in one place."
    >
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 min-w-0">
          <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex flex-wrap h-auto w-full justify-start gap-1 p-1">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="payout" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Payout Accounts</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <AccountProfilePanel />
            <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-base">Wallet Quick Actions</CardTitle>
                <CardDescription>Deposit to portal wallet or withdraw to your personal account</CardDescription>
              </CardHeader>
              <CardContent>
                <WalletQuickActions layout="row" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payout" className="mt-4">
            <PersonalPaymentAccounts />
          </TabsContent>

          <TabsContent value="security" className="space-y-6 mt-4">
        {/* Change Password */}
        <ChangePasswordCard />
        <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div>
                  <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                  <CardDescription className="mt-0.5">
                    Google Authenticator TOTP with email OTP fallback and backup codes.
                  </CardDescription>
                </div>
              </div>
              {twoFactorEnabled
                ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 shrink-0"><ShieldCheck className="h-3 w-3 mr-1 inline" />Enabled</Badge>
                : <Badge variant="outline" className="text-muted-foreground border-border dark:border-white/20 shrink-0">Disabled</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorEnabled ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <ShieldCheck className="h-5 w-5 text-green-700 dark:text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">2FA is active on your account</p>
                    <p className="text-xs text-muted-foreground mt-1">A 6-digit code from your authenticator app is required at every login.</p>
                  </div>
                </div>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => { setDisableCode(""); setShowDisable(true); }}>
                  <ShieldOff className="h-4 w-4 mr-2" /> Disable Two-Factor Authentication
                </Button>
                <div className="pt-4 border-t border-border/80 dark:border-white/10 space-y-3">
                  <p className="text-sm font-medium">Backup Recovery Codes</p>
                  <p className="text-xs text-muted-foreground">Regenerate codes if you lost them. Requires authenticator code.</p>
                  <div className="flex gap-2">
                    <Input value={regenCode} onChange={e => setRegenCode(e.target.value.replace(/\D/g, ""))} maxLength={6}
                      placeholder="6-digit code" className="max-w-[140px] bg-muted/60 dark:bg-white/5" />
                    <Button variant="outline" disabled={regenCode.length !== 6} onClick={async () => {
                      const res = await authFetch(apiPath("/auth/2fa/regenerate-backup-codes"), {
                        method: "POST",
                        body: JSON.stringify({ code: regenCode }),
                      });
                      const data = await res.json();
                      if (!res.ok) { toast({ title: "Failed", description: data.error, variant: "destructive" }); return; }
                      setBackupCodes(data.backupCodes || []);
                      setShowSetup(true);
                      setSetupStep("backup");
                      setRegenCode("");
                      toast({ title: "New backup codes generated" });
                    }}>Regenerate</Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Your account is not protected by 2FA</p>
                    <p className="text-xs text-muted-foreground mt-1">Enable 2FA to add an extra layer of security against unauthorized access.</p>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-1">
                  <li>Install <strong className="text-foreground">Google Authenticator</strong> on your phone</li>
                  <li>Click "Enable 2FA" and scan the QR code</li>
                  <li>Enter the 6-digit code to activate</li>
                </ol>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  onClick={handleStartSetup} disabled={setupMutation.isPending}>
                  <Smartphone className="h-4 w-4 mr-2" />
                  {setupMutation.isPending ? "Loading..." : "Enable Two-Factor Authentication"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Download className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Privacy & Data Export
            </CardTitle>
            <CardDescription>Download a copy of your account data (GDPR-style export).</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="border-border dark:border-white/10"
              onClick={async () => {
                try {
                  const res = await authFetch(apiPath("/auth/data-export"));
                  if (!res.ok) throw new Error("Export failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `kuber-data-export-${user?.id || "account"}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: "Data export downloaded" });
                } catch {
                  toast({ title: "Export failed", variant: "destructive" });
                }
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Download my data
            </Button>
          </CardContent>
        </Card>

        <TrustedDevicesCard />
        <ActiveSessionsCard />

          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-4">
        {/* Referral Code */}
        <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Your Referral Code
            </CardTitle>
            <CardDescription>Share this code to earn commission on referred investors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-2.5 rounded-lg bg-muted dark:bg-white/10 border border-border dark:border-white/10 font-mono text-amber-600 dark:text-amber-400 tracking-widest text-sm">
                {user?.referralCode || "—"}
              </code>
              <Button variant="outline" className="border-border dark:border-white/10 hover:bg-muted dark:bg-white/10 shrink-0"
                onClick={() => { if (user?.referralCode) { navigator.clipboard.writeText(user.referralCode); toast({ title: "Copied!" }); } }}>
                <Copy className="h-4 w-4 mr-2" /> Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {user?.referralCount || 0} referrals &bull; ${Number(user?.referralEarnings || 0).toLocaleString()} earned
            </p>
          </CardContent>
        </Card>

        {/* Login History */}
        <LoginHistoryCard />
          </TabsContent>
        </Tabs>
    </AppPage>

      {/* ── 2FA Setup Dialog ── */}
      <Dialog open={showSetup} onOpenChange={open => { if (!open) { setShowSetup(false); setVerifyCode(""); } }}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>Follow the steps below to activate 2FA on your account.</DialogDescription>
          </DialogHeader>

          {setupStep === "done" ? (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-700 dark:text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">2FA Enabled!</h3>
                <p className="text-sm text-muted-foreground mt-1">Your account is now protected with two-factor authentication.</p>
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={() => setShowSetup(false)}>
                Done
              </Button>
            </div>
          ) : setupStep === "backup" ? (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground text-center">Save these backup codes in a secure place. Each can be used once if you lose your authenticator.</p>
              <div className={cn(APP_FORM_GRID, "keep-cols-2")}>
                {backupCodes.map(code => (
                  <code key={code} className="px-3 py-2 rounded-lg bg-muted dark:bg-white/10 border border-border dark:border-white/10 text-xs font-mono text-amber-600 dark:text-amber-400 text-center">{code}</code>
                ))}
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={() => { navigator.clipboard.writeText(backupCodes.join("\n")); toast({ title: "Copied to clipboard" }); setSetupStep("done"); }}>
                Copy All & Finish
              </Button>
            </div>
          ) : setupStep === "scan" ? (
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Scan this QR code with <strong className="text-foreground">Google Authenticator</strong>
              </p>
              <div className="flex justify-center">
                {setupData
                  ? <QRCodeCanvas uri={setupData.otpauthUri} />
                  : <div className="h-[200px] w-[200px] flex items-center justify-center rounded-lg border border-border dark:border-white/10 bg-muted/60 dark:bg-white/5">
                      <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                    </div>
                }
              </div>
              {setupData && (
                <div className="space-y-1">
                  <p className="text-xs text-center text-muted-foreground">Can't scan? Enter this key manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-muted dark:bg-white/10 border border-border dark:border-white/10 text-xs font-mono text-amber-600 dark:text-amber-400 break-all">
                      {setupData.secret}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copySecret} className="shrink-0 text-muted-foreground hover:text-foreground">
                      {copied ? <CheckCircle className="h-4 w-4 text-green-700 dark:text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                Search "Google Authenticator" on App Store or Google Play
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
                onClick={() => setSetupStep("verify")} disabled={!setupData}>
                I've Scanned the Code →
              </Button>
            </div>
          ) : (
            <div className="space-y-5 py-2">
              <p className="text-sm text-muted-foreground text-center">
                Enter the <strong className="text-foreground">6-digit code</strong> shown in your authenticator app to confirm setup.
              </p>
              <Input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                placeholder="000000" value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-center text-2xl tracking-[0.5em] font-mono h-14"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setSetupStep("scan")} className="flex-1 border border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5">
                  Back
                </Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-bold"
                  onClick={handleEnable} disabled={enableMutation.isPending || verifyCode.length !== 6}>
                  {enableMutation.isPending ? "Verifying..." : "Activate 2FA"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Disable 2FA Dialog ── */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2">
              <ShieldOff className="h-5 w-5" /> Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to confirm removing 2FA.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              Warning: Removing 2FA makes your account less secure.
            </div>
            <Input
              type="text" inputMode="numeric" maxLength={6}
              placeholder="000000" value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, ""))}
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-center text-2xl tracking-[0.5em] font-mono h-14"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDisable(false)} className="flex-1 border border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5">
                Cancel
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold"
                onClick={handleDisable} disabled={disableMutation.isPending || disableCode.length !== 6}>
                {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
