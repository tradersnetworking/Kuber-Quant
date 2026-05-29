import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint, Loader2, Smartphone, Trash2, Pencil } from "lucide-react";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import {
  fetchBiometricLoginHistory,
  registerPasskey,
  removePasskey,
  renamePasskey,
  updateBiometricPreferences,
} from "@/lib/webauthn-api";

export function BiometricSettingsCard() {
  const { toast } = useToast();
  const { supported, credentials, preferences, refreshSettings, hasPasskeys } = useBiometricAuth();
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [quickLogin, setQuickLogin] = useState(true);
  const [withdrawals, setWithdrawals] = useState(false);
  const [threshold, setThreshold] = useState("10000");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!supported) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        await refreshSettings();
        const logs = await fetchBiometricLoginHistory();
        setHistory(logs.slice(0, 8));
      } finally {
        setLoading(false);
      }
    })();
  }, [supported, refreshSettings]);

  useEffect(() => {
    if (!preferences) return;
    setQuickLogin(Boolean(preferences.quickLoginEnabled));
    setWithdrawals(Boolean(preferences.biometricWithdrawalsEnabled));
    setThreshold(String(preferences.withdrawalThresholdInr ?? 10000));
  }, [preferences]);

  if (!supported) return null;

  async function handleRegister() {
    setRegistering(true);
    try {
      const label = /iPhone|iPad|Android/i.test(navigator.userAgent)
        ? `${/iPhone|iPad/.test(navigator.userAgent) ? "iPhone" : "Android"} Passkey`
        : "This Device";
      await registerPasskey(label);
      await refreshSettings();
      toast({ title: "Passkey registered", description: "You can now sign in with fingerprint or face unlock." });
    } catch (err: any) {
      toast({ title: "Registration failed", description: err?.message || "Could not register passkey.", variant: "destructive" });
    } finally {
      setRegistering(false);
    }
  }

  async function savePrefs(patch: Partial<{ quickLoginEnabled: boolean; biometricWithdrawalsEnabled: boolean; withdrawalThresholdInr: number }>) {
    try {
      await updateBiometricPreferences(patch);
      await refreshSettings();
      toast({ title: "Security preferences saved" });
    } catch (err: any) {
      toast({ title: "Save failed", description: err?.message, variant: "destructive" });
    }
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Biometric & Passkey Login
        </CardTitle>
        <CardDescription>
          Use fingerprint, face unlock, or device PIN for fast, secure sign-in. Biometric data never leaves your device.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                className="bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold border-0"
                disabled={registering}
                onClick={handleRegister}
              >
                {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Fingerprint className="h-4 w-4 mr-2" />}
                {hasPasskeys ? "Add Another Passkey" : "Enable Fingerprint Login"}
              </Button>
            </div>

            {credentials.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Registered Devices</Label>
                {credentials.map(c => (
                  <div key={c.id} className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg border border-border/80 dark:border-white/5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
                      {editingId === c.id ? (
                        <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8" />
                      ) : (
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{c.deviceName}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.lastUsedAt ? `Last used ${new Date(c.lastUsedAt).toLocaleDateString()}` : "Never used"}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {editingId === c.id ? (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          await renamePasskey(c.id, editName);
                          setEditingId(null);
                          await refreshSettings();
                        }}>Save</Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditName(c.deviceName); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={async () => {
                        await removePasskey(c.id);
                        await refreshSettings();
                        toast({ title: "Passkey removed" });
                      }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 pt-2 border-t border-border/60 dark:border-white/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Quick login with passkey</p>
                  <p className="text-xs text-muted-foreground">Sign in from the login screen without password.</p>
                </div>
                <Switch checked={quickLogin} onCheckedChange={v => { setQuickLogin(v); void savePrefs({ quickLoginEnabled: v }); }} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Biometric withdrawal verification</p>
                  <p className="text-xs text-muted-foreground">Require passkey for large INR withdrawals.</p>
                </div>
                <Switch checked={withdrawals} onCheckedChange={v => { setWithdrawals(v); void savePrefs({ biometricWithdrawalsEnabled: v }); }} />
              </div>
              {withdrawals && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Threshold (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={threshold}
                    onChange={e => setThreshold(e.target.value)}
                    onBlur={() => void savePrefs({ withdrawalThresholdInr: Number(threshold) || 10000 })}
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </div>

            {history.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border/60 dark:border-white/10">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Recent Biometric Activity</Label>
                {history.map(h => (
                  <div key={h.id} className="text-xs flex justify-between gap-2 py-1.5 px-2 rounded bg-muted/40 dark:bg-white/5">
                    <span className={h.success ? "text-green-600 dark:text-green-400" : "text-red-400"}>
                      {h.eventType} · {h.deviceLabel || "Device"}
                    </span>
                    <span className="text-muted-foreground shrink-0">{new Date(h.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
