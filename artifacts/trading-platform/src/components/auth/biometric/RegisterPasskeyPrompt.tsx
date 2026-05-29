import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { isWebAuthnSupported, registerPasskey, fetchBiometricSettings } from "@/lib/webauthn-api";

const DISMISS_KEY = "kuber_passkey_prompt_dismissed";

export function RegisterPasskeyPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [registering, setRegistering] = useState(false);

  useEffect(() => {
    if (!user || !isWebAuthnSupported()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    void (async () => {
      try {
        const { credentials } = await fetchBiometricSettings();
        if (credentials.length === 0) setOpen(true);
      } catch {
        /* ignore */
      }
    })();
  }, [user]);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setOpen(false);
  }

  async function enable() {
    setRegistering(true);
    try {
      await registerPasskey("Primary Device");
      dismiss();
    } catch {
      /* user cancelled or unsupported — keep dialog open */
    } finally {
      setRegistering(false);
    }
  }

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) dismiss(); else setOpen(v); }}>
      <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fingerprint className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            Enable Fingerprint Login?
          </DialogTitle>
          <DialogDescription>
            Sign in faster with fingerprint, face unlock, or your device PIN. Your biometric data stays on your device — only a secure passkey is stored.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-400">
          <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
          Bank-grade WebAuthn security. Works on Android, iPhone, Chrome, and installed PWAs.
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold border-0"
            disabled={registering}
            onClick={enable}
          >
            {registering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Fingerprint className="h-4 w-4 mr-2" />}
            Enable Now
          </Button>
          <Button variant="outline" className="flex-1" onClick={dismiss}>Maybe Later</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
