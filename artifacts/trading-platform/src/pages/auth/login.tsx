import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useLogin, useGoogleAuth } from "@workspace/api-client-react";
import { BrandMark } from "@/components/brand/BrandMark";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { getPostLoginPath } from "@/lib/nav-config";
import { AuthPageLayout } from "@/components/auth/AuthPageLayout";
import { useGoogleAuthConfig } from "@/hooks/use-google-auth-config";
import { captureReferralFromSearch, readReferralCode, clearReferralCode } from "@/lib/referral-attribution";
import { getTrustedDeviceToken } from "@/lib/trusted-device";
import { TwoFactorVerifyForm, handleTrustedDeviceResponse } from "@/components/auth/TwoFactorVerifyForm";
import { BiometricLoginButton } from "@/components/auth/biometric/BiometricLoginButton";
import { verifyPasskey2fa } from "@/lib/webauthn-api";
import { AUTH_CARD, AUTH_INPUT, AUTH_PRIMARY_BTN } from "@/lib/ui-system";
import { cn } from "@/lib/utils";
import { apiPath } from "@/lib/token-store";

async function sendLoginOtp(tempToken: string, channel: "email" | "sms" | "whatsapp" = "email") {
  const res = await fetch(apiPath("/auth/2fa/send-login-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ tempToken, channel }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to send code");
  if (data.devOtp) console.info("[DEV] Login OTP:", data.devOtp);
}

async function verifyTwoFactorLogin(payload: {
  tempToken: string;
  code: string;
  method?: string;
  trustDevice?: boolean;
}) {
  const res = await fetch(apiPath("/auth/2fa/verify-login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Verification failed");
  return data;
}

function getLoginSuccessPath(role: string): string {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return getPostLoginPath(role);
}

export default function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string | undefined>();
  const [maskedPhone, setMaskedPhone] = useState<string | undefined>();
  const [twoFactorMethods, setTwoFactorMethods] = useState<string[]>(["totp", "email_otp", "backup"]);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);

  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const loginMutation = useLogin();
  const googleAuthMutation = useGoogleAuth();
  const { data: googleConfig } = useGoogleAuthConfig();
  const sessionExpired = typeof window !== "undefined" && window.location.search.includes("session=expired");
  const sessionReplaced = typeof window !== "undefined" && window.location.search.includes("session=replaced");

  const showGoogleLogin = Boolean(
    googleConfig?.googleOAuthEnabled && googleConfig?.googleClientId
  );

  useEffect(() => {
    if (sessionReplaced) setLoginError(t("auth.sessionReplaced"));
    else if (sessionExpired) setLoginError(t("auth.sessionExpired"));
  }, [sessionExpired, sessionReplaced, t]);

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
    setPendingReferralCode(readReferralCode());
  }, []);

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
          login(data.token, data.user, data.refreshToken);
          setLocation(getLoginSuccessPath(data.user.role));
        },
        onError: (err: any) => {
          setLoginError(err?.message || t("auth.invalidCredentials"));
        },
      }
    );
  };

  const handlePasskeyLogin = (data: { token: string; user: any; refreshToken?: string }) => {
    login(data.token, data.user, data.refreshToken);
    setLocation(getLoginSuccessPath(data.user.role));
  };

  const handleVerify2FA = async (payload: {
    tempToken: string;
    code: string;
    method?: "totp" | "email_otp" | "sms_otp" | "whatsapp_otp" | "backup";
    trustDevice?: boolean;
  }) => {
    setLoginError(null);
    setVerifyPending(true);
    try {
      const data = await verifyTwoFactorLogin(payload);
      handleTrustedDeviceResponse(data);
      login(data.token, data.user, data.refreshToken);
      setLocation(getLoginSuccessPath(data.user.role));
    } catch (err: any) {
      setLoginError(err?.message || "Invalid verification code.");
    } finally {
      setVerifyPending(false);
    }
  };

  const handlePasskey2FA = async (payload: { tempToken: string; trustDevice?: boolean }) => {
    setLoginError(null);
    setVerifyPending(true);
    try {
      const data = await verifyPasskey2fa(payload);
      handleTrustedDeviceResponse(data);
      login(data.token, data.user, data.refreshToken);
      setLocation(getLoginSuccessPath(data.user.role));
    } catch (err: any) {
      setLoginError(err?.message || "Passkey verification failed.");
    } finally {
      setVerifyPending(false);
    }
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    if (!idToken) { setLoginError("Google sign-in failed — no credential received."); return; }
    setLoginError(null);
    const referralCode = readReferralCode() || undefined;
    googleAuthMutation.mutate(
      { data: { idToken, referralCode } },
      {
        onSuccess: (data: any) => {
          if (data.requiresTwoFactor) {
            setTempToken(data.tempToken);
            setMaskedEmail(data.maskedEmail);
            setMaskedPhone(data.maskedPhone);
            setTwoFactorMethods(Array.isArray(data.methods) ? data.methods : ["totp", "email_otp", "backup"]);
            return;
          }
          clearReferralCode();
          login(data.token, data.user, data.refreshToken);
          if (data.needsOnboarding) { setLocation("/register"); return; }
          setLocation(getLoginSuccessPath(data.user.role));
        },
        onError: (err: any) => {
          setLoginError(err?.message || "Google sign-in failed. Please try again.");
        },
      }
    );
  };

  const BrandPanel = () => (
    <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-[#050A14] to-[#0a1528] items-center justify-center p-12 border-r border-border/80 dark:border-white/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
      <div className="relative z-10 max-w-lg">
        <div className="mb-8">
          <BrandMark titleSize="xl" className="mb-6 flex-col items-start gap-4 lg:gap-5"
            logoClassName="h-32 lg:h-40 xl:h-44 w-auto max-w-[280px] lg:max-w-[340px] xl:max-w-[380px]" />
          <p className="text-xl text-muted-foreground font-light leading-relaxed">
            Precision. Profit. Performance. — Premium hedge-fund management and institutional-grade trading solutions.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-6 mt-12">
          {[["36%", "Max ROI"], ["99.9%", "Uptime"], ["10,000+", "Investors"], ["$500M+", "AUM"]].map(([val, lbl]) => (
            <div key={lbl} className="p-4 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 backdrop-blur-sm">
              <div className="text-amber-500 font-bold text-2xl mb-1">{val}</div>
              <div className="text-muted-foreground text-sm">{lbl}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <AuthPageLayout brandPanel={<BrandPanel />}>
      {!tempToken ? (
        <Card className={AUTH_CARD}>
          <CardHeader className="space-y-1">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-amber-500 transition-colors mb-2">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <div className="flex justify-center mb-4 md:hidden">
              <BrandLogo className="h-16 w-auto max-w-[200px]" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold text-center text-foreground">{t("auth.signIn")}</CardTitle>
            <CardDescription className="text-center text-muted-foreground">{t("auth.signInToContinue")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {pendingReferralCode && (
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300">
                <AlertDescription className="text-sm">
                  You were invited with code <strong>{pendingReferralCode}</strong>.{" "}
                  <Link href={`/register?ref=${pendingReferralCode}`} className="underline font-semibold">Create an account</Link> to join under this referral.
                </AlertDescription>
              </Alert>
            )}
            {loginError && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            {showGoogleLogin && googleConfig?.googleClientId && (
              <>
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full flex justify-center [&>div]:w-full [&_iframe]:w-full">
                    <GoogleOAuthProvider clientId={googleConfig.googleClientId}>
                      <GoogleLogin
                        onSuccess={handleGoogleSuccess}
                        onError={() => setLoginError("Google sign-in was cancelled or failed.")}
                        theme="filled_black" size="large" text="continue_with" shape="rectangular" width="100%"
                      />
                    </GoogleOAuthProvider>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border dark:border-white/10" /></div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-card px-3 text-muted-foreground uppercase tracking-wider">or sign in with email</span>
                  </div>
                </div>
              </>
            )}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">{t("auth.email")}</Label>
                <Input id="email" type="email" placeholder="name@example.com" value={email}
                  onChange={e => setEmail(e.target.value)} required
                  className={cn(AUTH_INPUT, "text-foreground placeholder:text-muted-foreground/80 focus:border-amber-500/50")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-muted-foreground">{t("auth.password")}</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)} required
                    className={cn(AUTH_INPUT, "text-foreground focus:border-amber-500/50 pr-12")} />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-xs text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline">{t("auth.forgotPassword")}</Link>
              </div>
              <Button type="submit" className={AUTH_PRIMARY_BTN}
                disabled={loginMutation.isPending || googleAuthMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <BiometricLoginButton
              email={email}
              disabled={loginMutation.isPending}
              onSuccess={handlePasskeyLogin}
              onError={setLoginError}
            />
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground text-center w-full">
              Don't have an account?{" "}
              <Link href="/register" className="text-amber-500 hover:text-amber-600 dark:text-amber-400 hover:underline font-semibold">Create account</Link>
            </p>
            <p className="text-xs text-muted-foreground/80 text-center">
              Service team member?{" "}
              <Link href="/staff-login" className="text-muted-foreground hover:text-amber-500 hover:underline">Use service team portal →</Link>
            </p>
          </CardFooter>
        </Card>
      ) : (
        <Card className={AUTH_CARD}>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-foreground">Two-Factor Verification</CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Use Google Authenticator, email OTP, or a backup code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loginError && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/50 text-red-400 mb-4">
                <AlertDescription>{loginError}</AlertDescription>
              </Alert>
            )}
            <TwoFactorVerifyForm
              tempToken={tempToken}
              maskedEmail={maskedEmail}
              maskedPhone={maskedPhone}
              availableMethods={twoFactorMethods}
              verifyPending={verifyPending}
              onVerify={handleVerify2FA}
              onPasskeyVerify={handlePasskey2FA}
              onSendOtp={sendLoginOtp}
              onSuccess={() => {}}
              onError={setLoginError}
              onBack={() => { setTempToken(null); setLoginError(null); }}
            />
          </CardContent>
        </Card>
      )}
    </AuthPageLayout>
  );
}
