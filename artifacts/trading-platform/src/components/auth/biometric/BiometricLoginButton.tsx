import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { isWebAuthnSupported, loginWithPasskey } from "@/lib/webauthn-api";

type Props = {
  email: string;
  disabled?: boolean;
  className?: string;
  onSuccess: (data: { token: string; user: any; refreshToken?: string }) => void;
  onError: (message: string) => void;
};

export function BiometricLoginButton({ email, disabled, className, onSuccess, onError }: Props) {
  const [supported, setSupported] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
  }, []);

  if (!supported) return null;

  async function handlePasskeyLogin() {
    if (!email.trim()) {
      onError("Enter your email first to use fingerprint login.");
      return;
    }
    setPending(true);
    try {
      const data = await loginWithPasskey(email.trim());
      onSuccess(data);
    } catch (err: any) {
      onError(err?.message || "Passkey login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-foreground font-semibold",
        className,
      )}
      disabled={disabled || pending || !email.trim()}
      onClick={handlePasskeyLogin}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Fingerprint className="h-4 w-4 mr-2 text-amber-600 dark:text-amber-400" />
      )}
      Login with Fingerprint / Passkey
    </Button>
  );
}
