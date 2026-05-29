import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Smartphone, ShieldCheck, Mail, KeyRound, MessageSquare, Phone } from "lucide-react";
import { saveTrustedDeviceToken } from "@/lib/trusted-device";

type VerifyMethod = "totp" | "email_otp" | "sms_otp" | "whatsapp_otp" | "backup";

type Props = {
  tempToken: string;
  maskedEmail?: string;
  maskedPhone?: string;
  availableMethods?: string[];
  onSuccess: (data: { token: string; user: any; refreshToken?: string }) => void;
  onError: (message: string) => void;
  onBack: () => void;
  verifyPending?: boolean;
  onVerify: (payload: {
    tempToken: string;
    code: string;
    method?: VerifyMethod;
    trustDevice?: boolean;
  }) => void;
  onSendOtp?: (tempToken: string, channel: "email" | "sms" | "whatsapp") => Promise<void>;
};

export function TwoFactorVerifyForm({
  tempToken,
  maskedEmail,
  maskedPhone,
  availableMethods = ["totp", "email_otp", "backup"],
  onError,
  onBack,
  verifyPending,
  onVerify,
  onSendOtp,
}: Props) {
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<VerifyMethod>("totp");
  const [trustDevice, setTrustDevice] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const canEmail = availableMethods.includes("email_otp");
  const canSms = availableMethods.includes("sms_otp");
  const canWhatsapp = availableMethods.includes("whatsapp_otp");

  async function sendOtp(channel: "email" | "sms" | "whatsapp", nextMethod: VerifyMethod) {
    if (!onSendOtp) return;
    setSendingOtp(true);
    try {
      await onSendOtp(tempToken, channel);
      setOtpSent(true);
      setMethod(nextMethod);
      setCode("");
    } catch (err: any) {
      onError(err?.message || "Failed to send code.");
    } finally {
      setSendingOtp(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onVerify({
      tempToken,
      code: code.trim(),
      method,
      trustDevice,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex justify-center mb-2">
        <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
          <Smartphone className="h-7 w-7 text-amber-600 dark:text-amber-400" />
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-700 dark:text-green-400">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Credentials verified. Complete 2FA to access your account.
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button type="button" size="sm" variant={method === "totp" ? "cta" : "outline"}
          onClick={() => { setMethod("totp"); setCode(""); }}>
          <Smartphone className="h-3.5 w-3.5 mr-1" /> Authenticator
        </Button>
        {canEmail && (
          <Button type="button" size="sm" variant={method === "email_otp" ? "cta" : "outline"}
            onClick={() => { setMethod("email_otp"); setCode(""); sendOtp("email", "email_otp"); }}>
            <Mail className="h-3.5 w-3.5 mr-1" /> Email OTP
          </Button>
        )}
        {canSms && (
          <Button type="button" size="sm" variant={method === "sms_otp" ? "cta" : "outline"}
            onClick={() => { setMethod("sms_otp"); setCode(""); sendOtp("sms", "sms_otp"); }}>
            <Phone className="h-3.5 w-3.5 mr-1" /> SMS OTP
          </Button>
        )}
        {canWhatsapp && (
          <Button type="button" size="sm" variant={method === "whatsapp_otp" ? "cta" : "outline"}
            onClick={() => { setMethod("whatsapp_otp"); setCode(""); sendOtp("whatsapp", "whatsapp_otp"); }}>
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> WhatsApp
          </Button>
        )}
        <Button type="button" size="sm" variant={method === "backup" ? "cta" : "outline"}
          onClick={() => { setMethod("backup"); setCode(""); }}>
          <KeyRound className="h-3.5 w-3.5 mr-1" /> Backup Code
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-muted-foreground">
          {method === "totp" && "Authenticator Code"}
          {method === "email_otp" && `Email Code${maskedEmail ? ` (${maskedEmail})` : ""}`}
          {method === "sms_otp" && `SMS Code${maskedPhone ? ` (${maskedPhone})` : ""}`}
          {method === "whatsapp_otp" && `WhatsApp Code${maskedPhone ? ` (${maskedPhone})` : ""}`}
          {method === "backup" && "Backup Recovery Code"}
        </Label>
        <Input
          type="text"
          inputMode={method === "backup" ? "text" : "numeric"}
          maxLength={method === "backup" ? 16 : 6}
          placeholder={method === "backup" ? "XXXX-XXXX" : "000000"}
          value={code}
          onChange={e => setCode(method === "backup" ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""))}
          className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-center text-2xl tracking-[0.4em] font-mono h-14"
          autoFocus
        />
        {(method === "email_otp" || method === "sms_otp" || method === "whatsapp_otp") && (
          <p className="text-xs text-muted-foreground text-center">
            {otpSent ? "Code sent." : "Select a channel above to receive a code."}
            {" "}
            <button
              type="button"
              className="text-amber-500 hover:underline"
              onClick={() => sendOtp(
                method === "whatsapp_otp" ? "whatsapp" : method === "sms_otp" ? "sms" : "email",
                method,
              )}
              disabled={sendingOtp}
            >
              {sendingOtp ? "Sending…" : "Resend"}
            </button>
          </p>
        )}
        {method === "totp" && (
          <p className="text-xs text-muted-foreground text-center">
            Open Google Authenticator and enter the current 6-digit code.
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="trust-device" checked={trustDevice} onCheckedChange={v => setTrustDevice(Boolean(v))} />
        <Label htmlFor="trust-device" className="text-sm text-muted-foreground cursor-pointer">
          Trust this device for 30 days
        </Label>
      </div>

      <Button
        type="submit"
        variant="cta"
        className="w-full h-12"
        disabled={verifyPending || (method !== "backup" && code.length !== 6) || (method === "backup" && code.length < 8)}
      >
        {verifyPending ? "Verifying..." : "Verify & Sign In"}
      </Button>

      <Button type="button" variant="ghost"
        className="w-full text-muted-foreground hover:text-foreground"
        onClick={onBack}>
        ← Back to Login
      </Button>
    </form>
  );
}

export function handleTrustedDeviceResponse(data: any) {
  if (data?.trustedDeviceToken) {
    saveTrustedDeviceToken(data.trustedDeviceToken);
  }
}
