import { useState } from "react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { sendRegistrationOtp, verifyRegistrationOtp } from "@/lib/onboarding/api";
import { toast } from "sonner";

type Props = {
  channel: "email" | "mobile";
  email?: string;
  phone?: string;
  fullName?: string;
  verified: boolean;
  onVerified: (v: boolean, verificationToken?: string) => void;
  label?: string;
};

export function OtpVerification({ channel, email, phone, fullName, verified, onVerified, label }: Props) {
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (channel === "email" && !email) {
      toast.error("Enter email first");
      return;
    }
    if (channel === "mobile" && !phone) {
      toast.error("Enter mobile number first");
      return;
    }
    setSending(true);
    try {
      const res = await sendRegistrationOtp({ email, phone, channel, fullName });
      setSent(true);
      toast.success(res.message);
      if (res.devOtp) toast.info(`Dev OTP: ${res.devOtp}`, { duration: 10000 });
    } catch (e: any) {
      toast.error(e.message || "Failed to send OTP");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify() {
    if (otp.length !== 6) return;
    setVerifying(true);
    try {
      const res = await verifyRegistrationOtp({ email, phone, otp, channel });
      onVerified(true, res.verificationToken);
      toast.success(`${channel === "email" ? "Email" : "Mobile"} verified`);
    } catch (e: any) {
      toast.error(e.message || "Invalid OTP");
      onVerified(false);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">{label || `${channel === "email" ? "Email" : "Mobile"} OTP Verification`}</p>
        {verified && <span className="text-xs text-green-600 font-semibold">✓ Verified</span>}
      </div>
      {!verified && (
        <>
          <Button type="button" variant="outline" size="sm" onClick={handleSend} disabled={sending}>
            {sending ? "Sending…" : sent ? "Resend OTP" : "Send OTP"}
          </Button>
          {sent && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                </InputOTPGroup>
              </InputOTP>
              <Button type="button" size="sm" onClick={handleVerify} disabled={verifying || otp.length !== 6}>
                {verifying ? "Verifying…" : "Verify"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
