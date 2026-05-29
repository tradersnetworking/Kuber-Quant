const API_BASE = import.meta.env.VITE_API_URL || "/api";

async function onboardingFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...opts.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data as T;
}

export type OnboardingConfig = {
  investorRegistrationEnabled: boolean;
  managerRegistrationEnabled: boolean;
  maxUploadMb: number;
  allowedCountries: string[];
  requireEmailOtp: boolean;
  requireMobileOtp: boolean;
  requireCaptcha: boolean;
  kycRequired: boolean;
  progressiveOnboarding?: boolean;
  requiredStepCount?: number;
};

export function getOnboardingConfig() {
  return onboardingFetch<OnboardingConfig>("/onboarding/config");
}

export function saveDraft(body: {
  draftToken?: string;
  onboardingType: "investor" | "manager";
  currentStep: number;
  data: Record<string, unknown>;
  email?: string;
}) {
  return onboardingFetch<{ draftToken: string; currentStep: number; savedAt: string }>("/onboarding/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function loadDraft(token: string) {
  return onboardingFetch<{ draftToken: string; currentStep: number; data: Record<string, unknown> }>(`/onboarding/draft/${token}`);
}

export function checkDuplicate(email?: string, username?: string) {
  return onboardingFetch<{ emailTaken?: boolean; usernameTaken?: boolean }>("/onboarding/check-duplicate", {
    method: "POST",
    body: JSON.stringify({ email, username }),
  });
}

export function sendRegistrationOtp(body: { email?: string; phone?: string; channel: "email" | "mobile"; fullName?: string }) {
  return onboardingFetch<{ message: string; devOtp?: string }>("/onboarding/send-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function verifyRegistrationOtp(body: { email?: string; phone?: string; otp: string; channel: "email" | "mobile" }) {
  return onboardingFetch<{ verified: boolean; verificationToken?: string }>("/onboarding/verify-otp", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function fetchRegistrationCaptcha() {
  return onboardingFetch<{ captchaToken: string; question: string }>("/onboarding/captcha");
}

export function submitInvestorOnboarding(formData: FormData) {
  return onboardingFetch<{ investorId: string; token: string; refreshToken: string; user: unknown }>("/onboarding/investor/complete", {
    method: "POST",
    body: formData,
  });
}

export function submitManagerApplication(formData: FormData) {
  return onboardingFetch<{ applicationId: number; status: string; message: string }>("/onboarding/manager/apply", {
    method: "POST",
    body: formData,
  });
}

export function generateCaptcha() {
  // Deprecated — use fetchRegistrationCaptcha() for server-side CAPTCHA
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { question: `${a} + ${b}`, answer: String(a + b), captchaToken: "" };
}

/** Strip File fields before JSON draft save */
export function serializeDraftValues(values: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v instanceof File) {
      out[`${k}Name`] = v.name;
      continue;
    }
    if (k.endsWith("Document") || k.endsWith("Proof") || k === "selfie" || k === "signature" || k === "cancelledCheque") continue;
    if (k === "mtPassword" || k === "password" || k === "confirmPassword") continue;
    out[k] = v;
  }
  return out;
}
