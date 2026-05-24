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

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
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

  const handleRequestOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    // Simulate API call — replace with real endpoint when available
    setTimeout(() => {
      setIsLoading(false);
      setStep("otp");
      startResendTimer();
    }, 1200);
  };

  const handleVerifyOTP = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (otp.length !== 6) { setError("Please enter the 6-digit code."); return; }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Simulate OTP check — replace with real endpoint
      if (otp === "000000") { setError("Invalid code. Please try again."); return; }
      setStep("new-password");
    }, 1000);
  };

  const handleSetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setStep("success"); }, 1200);
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
    <div className="min-h-screen bg-[#050A14] flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="hidden md:flex md:w-[44%] bg-gradient-to-br from-[#050A14] to-[#0a1528] items-center justify-center p-12 border-r border-white/5 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-amber-600/8 rounded-full blur-3xl" />
        <div className="relative z-10 text-center max-w-xs">
          <img src={logo} alt="Kuber Quant" className="h-24 w-24 object-contain mx-auto mb-6" />
          <h1 className="text-4xl font-black text-white mb-2">
            Kuber <span className="text-amber-400">Quant</span>
          </h1>
          <p className="text-zinc-500 text-sm mb-10">Precision. Profit. Performance.</p>
          <div className="space-y-3 text-left">
            {[
              { n: "1", label: "Enter your email address" },
              { n: "2", label: "Receive a one-time code" },
              { n: "3", label: "Set your new password" },
            ].map(({ n, label }) => (
              <div key={n} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5">
                <div className="h-7 w-7 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0">{n}</div>
                <span className="text-sm text-zinc-400">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link href="/login" className="inline-flex items-center gap-2 text-zinc-500 hover:text-amber-400 text-sm mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Sign In
          </Link>

          {/* ── Step: Email ── */}
          {step === "email" && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-3 md:hidden">
                  <img src={logo} alt="Kuber Quant" className="h-12 w-12 object-contain" />
                </div>
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-amber-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-white">Forgot Password?</CardTitle>
                <CardDescription className="text-center text-zinc-400 text-sm">
                  Enter the email associated with your account and we'll send you a reset code.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRequestOTP} className="space-y-5">
                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Email Address</Label>
                    <Input
                      type="email" placeholder="name@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} required
                      className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 h-12"
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}
                    className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold">
                    {isLoading ? "Sending code..." : "Send Reset Code"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter>
                <p className="text-sm text-zinc-500 text-center w-full">
                  Remembered it?{" "}
                  <Link href="/login" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold">Sign In</Link>
                </p>
              </CardFooter>
            </Card>
          )}

          {/* ── Step: OTP ── */}
          {step === "otp" && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-white">Check Your Email</CardTitle>
                <CardDescription className="text-center text-zinc-400 text-sm">
                  We sent a 6-digit code to <span className="text-amber-400 font-medium">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleVerifyOTP} className="space-y-5">
                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label className="text-zinc-300 text-center block">Enter 6-digit OTP</Label>
                    <Input
                      type="text" inputMode="numeric" maxLength={6}
                      placeholder="000000" value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="bg-white/5 border-white/10 text-center text-3xl tracking-[0.5em] font-mono h-16 focus:border-amber-500/50"
                      autoFocus
                    />
                    <p className="text-xs text-zinc-600 text-center">Code expires in 10 minutes</p>
                  </div>
                  <Button type="submit" disabled={isLoading || otp.length !== 6}
                    className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold">
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                  <div className="text-center">
                    <button type="button" disabled={resendTimer > 0}
                      onClick={() => { startResendTimer(); }}
                      className="text-sm text-zinc-500 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend code"}
                    </button>
                  </div>
                </form>
              </CardContent>
              <CardFooter>
                <button type="button" onClick={() => { setStep("email"); setOtp(""); setError(null); }}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mx-auto">
                  ← Use a different email
                </button>
              </CardFooter>
            </Card>
          )}

          {/* ── Step: New Password ── */}
          {step === "new-password" && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
              <CardHeader className="space-y-1">
                <div className="flex justify-center mb-2">
                  <div className="h-12 w-12 rounded-full bg-green-500/15 border border-green-500/25 flex items-center justify-center">
                    <KeyRound className="h-6 w-6 text-green-400" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-center text-white">New Password</CardTitle>
                <CardDescription className="text-center text-zinc-400 text-sm">
                  Choose a strong password for your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSetPassword} className="space-y-5">
                  {error && (
                    <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-2">
                    <Label className="text-zinc-300">New Password</Label>
                    <div className="relative">
                      <Input type={showNew ? "text" : "password"} value={newPassword}
                        onChange={e => setNewPassword(e.target.value)} required minLength={8}
                        placeholder="Min. 8 characters"
                        className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 h-12 pr-12 placeholder:text-zinc-600" />
                      <button type="button" onClick={() => setShowNew(v => !v)}
                        className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                        {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {newPassword && (
                      <div className="space-y-1.5">
                        <div className="flex gap-1">
                          {[0, 1, 2, 3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < pwStrength ? PW_COLORS[pwStrength - 1] : "bg-white/10"}`} />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${["text-red-400","text-orange-400","text-yellow-400","text-green-400"][pwStrength-1] || "text-zinc-600"}`}>
                          {pwStrength > 0 ? PW_LABELS[pwStrength - 1] : "Enter a password"}
                        </p>
                      </div>
                    )}
                    <ul className="grid grid-cols-2 gap-1 mt-2">
                      {[
                        { ok: newPassword.length >= 8, text: "8+ characters" },
                        { ok: /[A-Z]/.test(newPassword), text: "Uppercase letter" },
                        { ok: /[0-9]/.test(newPassword), text: "Number" },
                        { ok: /[^A-Za-z0-9]/.test(newPassword), text: "Special character" },
                      ].map(({ ok, text }) => (
                        <li key={text} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-green-400" : "text-zinc-600"}`}>
                          <CheckCircle2 className={`h-3 w-3 shrink-0 ${ok ? "text-green-400" : "text-zinc-700"}`} />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-zinc-300">Confirm Password</Label>
                    <div className="relative">
                      <Input type={showConfirm ? "text" : "password"} value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)} required
                        placeholder="Re-enter your password"
                        className={`bg-white/5 border-white/10 text-white focus:border-amber-500/50 h-12 pr-12 placeholder:text-zinc-600 ${confirmPassword && confirmPassword !== newPassword ? "border-red-500/50" : confirmPassword && confirmPassword === newPassword ? "border-green-500/50" : ""}`} />
                      <button type="button" onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-3.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                        {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== newPassword && (
                      <p className="text-xs text-red-400">Passwords do not match</p>
                    )}
                    {confirmPassword && confirmPassword === newPassword && (
                      <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Passwords match</p>
                    )}
                  </div>
                  <Button type="submit" disabled={isLoading || pwStrength < 2}
                    className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold disabled:opacity-50">
                    {isLoading ? "Updating..." : "Reset Password"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* ── Step: Success ── */}
          {step === "success" && (
            <Card className="border-white/10 bg-white/5 backdrop-blur-md shadow-2xl text-center">
              <CardContent className="pt-10 pb-8 space-y-6">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-green-500/15 border-2 border-green-500/30 flex items-center justify-center">
                    <CheckCircle2 className="h-10 w-10 text-green-400" />
                  </div>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                  <p className="text-zinc-400 text-sm">Your password has been successfully updated. You can now sign in with your new password.</p>
                </div>
                <Link href="/login">
                  <Button className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold">
                    Sign In Now
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
