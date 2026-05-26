import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import * as ApiHooks from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { getPostLoginPath } from "@/lib/nav-config";

const STAFF_ROLES = new Set(["superadmin", "admin", "manager"]);

function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role);
}

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
            return;
          }
          if (!isStaffRole(data.user.role)) {
            setLoginError("This portal is for staff accounts only. Please use the user login page.");
            return;
          }
          login(data.token, data.user);
          setLocation(getPostLoginPath(data.user.role));
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Invalid credentials. Please try again.");
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
          if (!isStaffRole(data.user.role)) {
            setLoginError("This portal is for staff accounts only.");
            return;
          }
          login(data.token, data.user);
          setLocation(getPostLoginPath(data.user.role));
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Invalid authenticator code. Please try again.");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#030709] flex flex-col md:flex-row">
      {/* Left: Dark security panel */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-b from-[#030709] via-[#060D18] to-[#030709] items-center justify-center p-12 border-r border-amber-500/10 relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          <BrandLogo className="h-28 w-28 mx-auto mb-6" />
          <h1 className="text-4xl font-black tracking-tight mb-2">
            <span className="text-amber-400">KUBER</span>
            <span className="text-zinc-200"> QUANT</span>
          </h1>
          <p className="text-zinc-500 text-sm font-mono tracking-widest uppercase mb-10">
            Staff Control Center
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, label: "Secured Access", desc: "256-bit encrypted portal" },
              { icon: Lock, label: "Role-Based Control", desc: "Super Admin, Admin & Manager access" },
              { icon: ShieldAlert, label: "Audit Logged", desc: "All actions are recorded" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 text-left">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-zinc-600">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-white/5">
            <p className="text-xs text-zinc-600">
              Regular investor?{" "}
              <Link href="/login" className="text-amber-500 hover:text-amber-400 hover:underline">
                Use the user portal →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-[#030709] to-[#060D18]">
        {!tempToken ? (
          <Card className="w-full max-w-md border-amber-500/10 bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/50">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex justify-center mb-2 md:hidden">
                <BrandLogo className="h-16 w-16" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs font-mono tracking-widest uppercase px-3 py-1">
                  <Shield className="h-3 w-3 mr-1.5 inline" /> Secure Staff Portal
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-white">Staff Sign In</CardTitle>
              <CardDescription className="text-center text-zinc-500">
                Super Admin, Admin and Manager access only
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleLogin} className="space-y-5">
                {loginError && (
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertDescription className="ml-2">{loginError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs font-mono tracking-widest uppercase">Staff Email</Label>
                  <Input
                    type="email"
                    placeholder="admin@kuberquant.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="bg-white/[0.04] border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/40 h-12 font-mono"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs font-mono tracking-widest uppercase">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className="bg-white/[0.04] border-white/10 text-white focus:border-amber-500/40 h-12 pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-3.5 text-zinc-600 hover:text-zinc-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-bold tracking-wide transition-all shadow-lg shadow-amber-500/20"
                  disabled={loginMutation.isPending}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {loginMutation.isPending ? "Authenticating..." : "Secure Sign In"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <div className="w-full h-px bg-white/5" />
              <p className="text-xs text-zinc-600 text-center font-mono">
                Unauthorised access is prohibited and logged.
              </p>
            </CardFooter>
          </Card>
        ) : (
          /* 2FA Step */
          <Card className="w-full max-w-md border-amber-500/10 bg-white/[0.03] backdrop-blur-xl">
            <CardHeader className="space-y-2 text-center">
              <div className="flex justify-center">
                <div className="h-14 w-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <Shield className="h-7 w-7 text-amber-400" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-white">Two-Factor Verification</CardTitle>
              <CardDescription className="text-zinc-500">
                Enter the 6-digit code from your authenticator app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerify2FA} className="space-y-5">
                {loginError && (
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                    <AlertDescription>{loginError}</AlertDescription>
                  </Alert>
                )}
                <Input
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder="000000" value={twoFactorCode}
                  onChange={e => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  className="bg-white/5 border-white/10 text-center text-3xl tracking-[0.6em] font-mono h-16"
                  autoFocus
                />
                <Button
                  type="submit"
                  className="w-full h-12 bg-amber-500 hover:bg-amber-400 text-black font-bold"
                  disabled={verifyMutation.isPending || twoFactorCode.length !== 6}
                >
                  {verifyMutation.isPending ? "Verifying..." : "Verify & Access"}
                </Button>
                <Button type="button" variant="ghost"
                  className="w-full text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
                  onClick={() => { setTempToken(null); setTwoFactorCode(""); setLoginError(null); }}>
                  ← Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
