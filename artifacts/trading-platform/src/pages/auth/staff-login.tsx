import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLogin } from "@workspace/api-client-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPostLoginPath } from "@/lib/nav-config";
import { getTrustedDeviceToken } from "@/lib/trusted-device";
import { TwoFactorVerifyForm, handleTrustedDeviceResponse } from "@/components/auth/TwoFactorVerifyForm";
import { AUTH_INPUT, AUTH_PRIMARY_BTN } from "@/lib/ui-system";
import { cn } from "@/lib/utils";
import { apiPath } from "@/lib/token-store";

const STAFF_ROLES = new Set(["superadmin", "admin", "manager", "support"]);

function isStaffRole(role: string): boolean {
  return STAFF_ROLES.has(role);
}

async function sendLoginOtp(tempToken: string, channel: "email" | "sms" | "whatsapp" = "email") {
  const res = await fetch(apiPath("/auth/2fa/send-login-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tempToken, channel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send code");
}

async function verifyTwoFactorLogin(payload: {
  tempToken: string; code: string; method?: string; trustDevice?: boolean;
}) {
  const res = await fetch(apiPath("/auth/2fa/verify-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data;
}

export default function StaffLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>(["totp", "email_otp", "backup"]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    loginMutation.mutate(
      { data: { email, password, trustedDeviceToken: getTrustedDeviceToken() || undefined } as any },
      {
        onSuccess: (data: any) => {
          if (data.requiresTwoFactor) {
            setTempToken(data.tempToken);
            setMaskedEmail(data.maskedEmail);
            setMaskedPhone(data.maskedPhone);
            setTwoFactorMethods(Array.isArray(data.methods) ? data.methods : ["totp", "email_otp", "backup"]);
            return;
          }
          if (!isStaffRole(data.user.role)) {
            setLoginError("This portal is for staff accounts only. Please use the user login page.");
            return;
          }
          login(data.token, data.user, data.refreshToken);
          setLocation(getPostLoginPath(data.user.role));
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Invalid credentials. Please try again.");
        },
      }
    );
  };

  const handleVerify2FA = async (payload: {
    tempToken: string; code: string; method?: "totp" | "email_otp" | "sms_otp" | "whatsapp_otp" | "backup"; trustDevice?: boolean;
  }) => {
    setLoginError(null);
    setVerifyPending(true);
    try {
      const data = await verifyTwoFactorLogin(payload);
      if (!isStaffRole(data.user.role)) {
        setLoginError("This portal is for staff accounts only.");
        return;
      }
      handleTrustedDeviceResponse(data);
      login(data.token, data.user, data.refreshToken);
      setLocation(getPostLoginPath(data.user.role));
    } catch (err: any) {
      setLoginError(err?.message || "Invalid verification code.");
    } finally {
      setVerifyPending(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-[#030709] flex flex-col md:flex-row">
      {/* Left: Dark security panel */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-b from-[#030709] via-[#060D18] to-[#030709] items-center justify-center p-12 border-r border-amber-500/10 relative overflow-hidden">
        {/* Background grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-amber-600/5 rounded-full blur-3xl" />

        <div className="relative z-10 max-w-sm text-center">
          <BrandMark
            titleSize="xl"
            className="justify-center mb-6 flex-col items-center gap-4 lg:gap-5"
            logoClassName="h-36 lg:h-44 xl:h-48 w-auto max-w-[300px] lg:max-w-[360px] xl:max-w-[400px] mx-auto"
          />
          <p className="text-muted-foreground text-sm font-mono tracking-widest uppercase mb-10">
            Staff Control Center
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, label: "Secured Access", desc: "256-bit encrypted portal" },
              { icon: Lock, label: "Role-Based Control", desc: "Super Admin, Manager & Support access" },
              { icon: ShieldAlert, label: "Audit Logged", desc: "All actions are recorded" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border/80 dark:border-white/5 text-left">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-muted-foreground/80">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 pt-6 border-t border-border/80 dark:border-white/5">
            <p className="text-xs text-muted-foreground/80">
              Regular investor?{" "}
              <Link href="/login" className="text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline">
                Use the user portal →
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right: Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-gradient-to-br from-[#030709] to-[#060D18]">
        {!tempToken ? (
          <Card className="w-full max-w-md border-amber-500/10 bg-muted/50 dark:bg-white/[0.03] backdrop-blur-xl shadow-2xl shadow-black/50">
            <CardHeader className="space-y-3 pb-6">
              <div className="flex justify-center mb-2 md:hidden">
                <BrandLogo className="h-16 w-auto max-w-[200px]" />
              </div>
              <div className="flex items-center justify-center gap-2">
                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs font-mono tracking-widest uppercase px-3 py-1">
                  <Shield className="h-3 w-3 mr-1.5 inline" /> Secure Staff Portal
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-center text-white">Staff Sign In</CardTitle>
              <CardDescription className="text-center text-muted-foreground">
                Super Admin, Manager, and Support access
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
                  <Label className="text-muted-foreground text-xs font-mono tracking-widest uppercase">Staff Email</Label>
                  <Input
                    type="email"
                    placeholder="superadmin@kuberquant.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={cn(AUTH_INPUT, "focus:border-amber-500/40 font-mono")}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs font-mono tracking-widest uppercase">Password</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      className={cn(AUTH_INPUT, "focus:border-amber-500/40 pr-12")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-3.5 text-muted-foreground/80 hover:text-muted-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className={cn(AUTH_PRIMARY_BTN, "tracking-wide")}
                  disabled={loginMutation.isPending}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  {loginMutation.isPending ? "Authenticating..." : "Secure Sign In"}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-2">
              <div className="w-full h-px bg-muted/60 dark:bg-white/5" />
              <p className="text-xs text-muted-foreground/80 text-center font-mono">
                Unauthorised access is prohibited and logged.
              </p>
            </CardFooter>
          </Card>
        ) : (
          <Card className="w-full max-w-md border-amber-500/10 bg-muted/50 dark:bg-white/[0.03] backdrop-blur-xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-xl font-bold text-white">Two-Factor Verification</CardTitle>
              <CardDescription className="text-muted-foreground">
                Authenticator, email OTP, or backup code required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loginError && (
                <Alert className="bg-red-500/10 border-red-500/30 text-red-400 mb-4">
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <TwoFactorVerifyForm
                tempToken={tempToken!}
                maskedEmail={maskedEmail}
                maskedPhone={maskedPhone}
                availableMethods={twoFactorMethods}
                verifyPending={verifyPending}
                onVerify={handleVerify2FA}
                onSendOtp={sendLoginOtp}
                onSuccess={() => {}}
                onError={setLoginError}
                onBack={() => { setTempToken(null); setLoginError(null); }}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
