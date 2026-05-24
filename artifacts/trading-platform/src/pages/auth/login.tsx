import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import logo from "@/assets/kuber-quant-logo.png";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smartphone, ShieldCheck } from "lucide-react";
import * as ApiHooks from "@workspace/api-client-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const useVerifyTwoFactor = (ApiHooks as any).useTwoFactorVerifyLogin;
  const verifyMutation = useVerifyTwoFactor ? useVerifyTwoFactor() : { mutate: () => {}, isPending: false };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    loginMutation.mutate(
      { data: { email, password } },
      {
        onSuccess: (data: any) => {
          if (data.requiresTwoFactor) {
            setTempToken(data.tempToken);
          } else {
            login(data.token, data.user);
            setLocation("/dashboard");
          }
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Invalid email or password. Please try again.");
        },
      }
    );
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    verifyMutation.mutate(
      { data: { tempToken: tempToken!, code: twoFactorCode } },
      {
        onSuccess: (data: any) => {
          login(data.token, data.user);
          setLocation("/dashboard");
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Invalid authenticator code. Please try again.");
        },
      }
    );
  };

  const BrandPanel = () => (
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#050A14] to-[#0a1528] items-center justify-center p-12 border-r border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-lg">
        <div className="mb-8">
          <img src={logo} alt="Kuber Capital" className="h-20 w-20 object-contain mb-6" />
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Kuber <span className="text-amber-500">Capital</span>
          </h1>
          <p className="text-xl text-zinc-400 font-light leading-relaxed">
            Where Wealth Multiplies — Premium hedge-fund management and institutional-grade trading solutions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-12">
          {[["36%", "Max ROI"], ["99.9%", "Uptime"], ["10,000+", "Investors"], ["$500M+", "AUM"]].map(([val, lbl]) => (
            <div key={lbl} className="p-4 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="text-amber-500 font-bold text-2xl mb-1">{val}</div>
              <div className="text-zinc-500 text-sm">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050A14] flex flex-col md:flex-row">
      <BrandPanel />

      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        {/* ── Step 1: Email + Password ── */}
        {!tempToken ? (
          <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4 md:hidden">
                <span className="text-3xl font-bold text-amber-500 tracking-tight">Kuber Capital</span>
              </div>
              <CardTitle className="text-3xl font-bold text-center text-white">Sign In</CardTitle>
              <CardDescription className="text-center text-zinc-400">
                Access your premium wealth dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {loginError && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
                  <Input
                    id="email" type="email" placeholder="name@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required
                    className="bg-white/5 border-white/10 text-white placeholder:text-zinc-600 focus:border-amber-500/50 h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-zinc-300">Password</Label>
                  <Input
                    id="password" type="password"
                    value={password} onChange={e => setPassword(e.target.value)} required
                    className="bg-white/5 border-white/10 text-white focus:border-amber-500/50 h-12"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold text-base shadow-lg shadow-amber-500/20"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-zinc-400 text-center w-full">
                Don't have an account?{" "}
                <Link href="/register" className="text-amber-500 hover:text-amber-400 hover:underline font-semibold">
                  Register here
                </Link>
              </p>
            </CardFooter>
          </Card>
        ) : (
          /* ── Step 2: 2FA TOTP Verification ── */
          <Card className="w-full max-w-md border-white/10 bg-white/5 backdrop-blur-md shadow-2xl">
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Smartphone className="h-7 w-7 text-amber-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-white">Two-Factor Verification</CardTitle>
              <CardDescription className="text-center text-zinc-400">
                Enter the 6-digit code from your authenticator app to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-5">
                {loginError && (
                  <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Credentials verified. Complete 2FA to access your account.
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300">Authenticator Code</Label>
                  <Input
                    type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                    placeholder="000000" value={twoFactorCode}
                    onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                    className="bg-white/5 border-white/10 text-center text-3xl tracking-[0.6em] font-mono h-16"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Open Google Authenticator and enter the current 6-digit code.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold text-base"
                  disabled={verifyMutation.isPending || twoFactorCode.length !== 6}
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify & Sign In"}
                </Button>

                <Button
                  type="button" variant="ghost"
                  className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                  onClick={() => { setTempToken(null); setTwoFactorCode(""); setLoginError(null); }}
                >
                  ← Back to Login
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
