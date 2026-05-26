import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Copy, CheckCircle, AlertTriangle, ExternalLink, Key, Monitor, Globe, Clock, RefreshCw, Lock, Eye, EyeOff, User, CreditCard, Activity } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import * as ApiHooks from "@workspace/api-client-react";
import QRCode from "qrcode";
import { PersonalPaymentAccounts } from "@/components/wallet/PersonalPaymentAccounts";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { AccountProfilePanel } from "@/components/account/AccountProfilePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const getToken = () => localStorage.getItem("token");

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
      const res = await fetch("/api/auth/change-password", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
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
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lock className="h-4 w-4 text-amber-400" /> Change Password
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
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 pr-10"
              />
              <button type="button" onClick={() => setShowCurrent(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
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
                className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 pr-10"
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
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
              className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50"
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

function LoginHistoryCard() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/audit-logs/my-login-history", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (r.ok) { const d = await r.json(); setHistory(d); }
    } catch { /* ignore */ }
    finally { setLoading(false); setLoaded(true); }
  }

  useEffect(() => { load(); }, []);

  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-amber-400" />
            <CardTitle className="text-base">Login History</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-white">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <CardDescription>Recent sign-in activity on your account.</CardDescription>
      </CardHeader>
      <CardContent>
        {!loaded || loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-white/5 animate-pulse rounded-lg" />
          ))}</div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No login history available.</p>
        ) : (
          <div className="space-y-2">
            {history.slice(0, 10).map((h: any, i: number) => (
              <div key={i} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${i === 0 ? "border-amber-500/20 bg-amber-500/5" : "border-white/5 bg-white/3"}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${h.success ? "bg-green-500" : "bg-red-500"}`} />
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-medium">
                      {h.browser || "Unknown browser"} · {h.device || "Desktop"}
                      {i === 0 && <Badge className="ml-2 text-[10px] py-0 bg-amber-500/20 text-amber-400">Current</Badge>}
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
  return <canvas ref={canvasRef} className="rounded-lg border border-white/10" />;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

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
  const [setupStep,   setSetupStep]   = useState<"scan" | "verify" | "done">("scan");
  const [copied,      setCopied]      = useState(false);

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

  const handleEnable = () => {
    if (verifyCode.length !== 6) { toast({ title: "Enter the 6-digit code", variant: "destructive" }); return; }
    enableMutation.mutate({ data: { code: verifyCode } }, {
      onSuccess: () => { setSetupStep("done"); refetchMe(); toast({ title: "2FA Enabled!", description: "Your account is now protected." }); },
      onError: (err: any) => toast({ title: "Invalid code", description: err?.message || "Try again.", variant: "destructive" }),
    });
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
    <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            My Account
          </h1>
          <p className="text-muted-foreground mt-1">Profile, payout accounts, security, and wallet actions in one place.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
            <TabsTrigger value="profile" className="gap-1.5"><User className="h-3.5 w-3.5" />Profile</TabsTrigger>
            <TabsTrigger value="payout" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" />Payout Accounts</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" />Security</TabsTrigger>
            <TabsTrigger value="activity" className="gap-1.5"><Activity className="h-3.5 w-3.5" />Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-4">
            <AccountProfilePanel />
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
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
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <CardTitle className="text-base">Two-Factor Authentication</CardTitle>
                  <CardDescription className="mt-0.5">
                    Secure your account with Google Authenticator TOTP.
                  </CardDescription>
                </div>
              </div>
              {twoFactorEnabled
                ? <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0"><ShieldCheck className="h-3 w-3 mr-1 inline" />Enabled</Badge>
                : <Badge variant="outline" className="text-muted-foreground border-white/20 shrink-0">Disabled</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {twoFactorEnabled ? (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                  <ShieldCheck className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-400">2FA is active on your account</p>
                    <p className="text-xs text-muted-foreground mt-1">A 6-digit code from your authenticator app is required at every login.</p>
                  </div>
                </div>
                <Button variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => { setDisableCode(""); setShowDisable(true); }}>
                  <ShieldOff className="h-4 w-4 mr-2" /> Disable Two-Factor Authentication
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-400">Your account is not protected by 2FA</p>
                    <p className="text-xs text-muted-foreground mt-1">Enable 2FA to add an extra layer of security against unauthorized access.</p>
                  </div>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-xs text-muted-foreground pl-1">
                  <li>Install <strong className="text-white">Google Authenticator</strong> on your phone</li>
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

          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-4">
        {/* Referral Code */}
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4 text-amber-400" /> Your Referral Code
            </CardTitle>
            <CardDescription>Share this code to earn commission on referred investors.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <code className="flex-1 px-4 py-2.5 rounded-lg bg-white/10 border border-white/10 font-mono text-amber-400 tracking-widest text-sm">
                {user?.referralCode || "—"}
              </code>
              <Button variant="outline" className="border-white/10 hover:bg-white/10 shrink-0"
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
      </div>

      {/* ── 2FA Setup Dialog ── */}
      <Dialog open={showSetup} onOpenChange={open => { if (!open) { setShowSetup(false); setVerifyCode(""); } }}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-amber-400" /> Set Up Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>Follow the steps below to activate 2FA on your account.</DialogDescription>
          </DialogHeader>

          {setupStep === "done" ? (
            <div className="py-8 text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-400" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">2FA Enabled!</h3>
                <p className="text-sm text-muted-foreground mt-1">Your account is now protected with two-factor authentication.</p>
              </div>
              <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={() => setShowSetup(false)}>
                Done
              </Button>
            </div>
          ) : setupStep === "scan" ? (
            <div className="space-y-5 py-2">
              <p className="text-sm text-zinc-400 text-center">
                Scan this QR code with <strong className="text-white">Google Authenticator</strong>
              </p>
              <div className="flex justify-center">
                {setupData
                  ? <QRCodeCanvas uri={setupData.otpauthUri} />
                  : <div className="h-[200px] w-[200px] flex items-center justify-center rounded-lg border border-white/10 bg-white/5">
                      <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full" />
                    </div>
                }
              </div>
              {setupData && (
                <div className="space-y-1">
                  <p className="text-xs text-center text-muted-foreground">Can't scan? Enter this key manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/10 text-xs font-mono text-amber-400 break-all">
                      {setupData.secret}
                    </code>
                    <Button variant="ghost" size="icon" onClick={copySecret} className="shrink-0 text-muted-foreground hover:text-white">
                      {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-white/5 border border-white/10">
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
              <p className="text-sm text-zinc-400 text-center">
                Enter the <strong className="text-white">6-digit code</strong> shown in your authenticator app to confirm setup.
              </p>
              <Input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                placeholder="000000" value={verifyCode}
                onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                className="bg-white/5 border-white/10 text-center text-2xl tracking-[0.5em] font-mono h-14"
                autoFocus
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setSetupStep("scan")} className="flex-1 border border-white/10 hover:bg-white/5">
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
        <DialogContent className="bg-[#050A14] border-white/10 max-w-md">
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
              className="bg-white/5 border-white/10 text-center text-2xl tracking-[0.5em] font-mono h-14"
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setShowDisable(false)} className="flex-1 border border-white/10 hover:bg-white/5">
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
