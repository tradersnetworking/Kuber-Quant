import { useState } from "react";
import logo from "@/assets/logo.png";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff } from "lucide-react";

type Step = "email" | "otp" | "new-password" | "success";

const API = "/api/auth";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  function startResendTimer() {
    setResendTimer(60);
    const id = setInterval(() => {
      setResendTimer(t => {
        if (t <= 1) { clearInterval(id); return 0; }
        return t - 1;
      });
    }, 1000);
  }

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setStep("otp");
      startResendTimer();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, purpose: "password_reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      setResetToken(data.resetToken);
      setStep("new-password");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setStep("success");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const pwStrength = (() => {
    if (!newPassword) return 0;
    let score = 0;
    if (newPassword.length >= 8) score++;
    if (/[A-Z]/.test(newPassword)) score++;
    if (/[0-9]/.test(newPassword)) score++;
    if (/[^A-Za-z0-9]/.test(newPassword)) score++;
    return score;
  })();

  const PW_COLORS = ["bg-red-500", "bg-orange-500", "bg-yellow-500", "bg-green-500"];
  const PW_LABELS = ["Weak", "Fair", "Good", "Strong"];

  return (
    <div className="min-h-screen bg-[#050A14] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logo} alt="Kuber Quant" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
        </div>

        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          {step === "email" && (
            <>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><Mail className="h-5 w-5 text-amber-400" /> Forgot Password</CardTitle>
                <CardDescription>Enter your email to receive a verification code</CardDescription>
              </CardHeader>
              <CardContent>
                {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                <form onSubmit={handleRequestOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10" />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black" disabled={isLoading}>
                    {isLoading ? "Sending..." : "Send Verification Code"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "otp" && (
            <>
              <CardHeader>
                <CardTitle className="text-white">Enter Verification Code</CardTitle>
                <CardDescription>We sent a 6-digit code to {email}</CardDescription>
              </CardHeader>
              <CardContent>
                {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input id="otp" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} className="bg-white/5 border-white/10 text-center text-2xl tracking-widest" />
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black" disabled={isLoading}>
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" disabled={resendTimer > 0 || isLoading} onClick={() => handleRequestOTP({ preventDefault: () => {} } as any)}>
                    {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Code"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "new-password" && (
            <>
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2"><KeyRound className="h-5 w-5 text-amber-400" /> New Password</CardTitle>
                <CardDescription>Create a strong new password</CardDescription>
              </CardHeader>
              <CardContent>
                {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{error}</AlertDescription></Alert>}
                <form onSubmit={handleSetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input id="newPassword" type={showNew ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="bg-white/5 border-white/10 pr-10" />
                      <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-1">
                        <div className="flex gap-1">{[0,1,2,3].map(i => (<div key={i} className={`h-1 flex-1 rounded ${i < pwStrength ? PW_COLORS[pwStrength-1] : "bg-white/10"}`} />))}</div>
                        <p className="text-xs text-muted-foreground">{PW_LABELS[pwStrength - 1] || ""}</p>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Input id="confirmPassword" type={showConfirm ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="bg-white/5 border-white/10 pr-10" />
                      <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-black" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Reset Password"}
                  </Button>
                </form>
              </CardContent>
            </>
          )}

          {step === "success" && (
            <CardContent className="pt-8 pb-8 text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
              <h3 className="text-xl font-bold text-white">Password Reset!</h3>
              <p className="text-muted-foreground">Your password has been updated. You can now sign in.</p>
              <Link href="/login"><Button className="bg-amber-500 hover:bg-amber-600 text-black">Go to Login</Button></Link>
            </CardContent>
          )}

          <CardFooter className="justify-center pb-6">
            <Link href="/login" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" /> Back to Login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
