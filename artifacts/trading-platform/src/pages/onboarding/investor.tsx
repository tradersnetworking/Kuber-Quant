import { useEffect, useMemo, useState } from "react";
import type { ZodTypeAny } from "zod";
import { useForm, Controller } from "react-hook-form";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
import { OtpVerification } from "@/components/onboarding/OtpVerification";
import { FieldTooltip } from "@/components/onboarding/FieldTooltip";
import { PasswordStrength } from "@/components/onboarding/PasswordStrength";
import { useAuth } from "@/hooks/use-auth";
import { useOnboardingDraft, loadLocalDraft, saveLocalDraft } from "@/hooks/use-onboarding-draft";
import { PhoneCountryCodeSelect } from "@/components/forms/PhoneCountryCodeSelect";
import { MtAccountCredentialsForm } from "@/components/forms/MtAccountCredentialsForm";
import {
  INVESTOR_STEPS, INVESTOR_REQUIRED_STEP_COUNT, INVESTOR_OPTIONAL_STEP_START,
  COUNTRIES, STATES_BY_COUNTRY, GENDERS,
  INCOME_RANGES, EXPERIENCE_LEVELS, RISK_LEVELS, FUND_SOURCES, INVESTMENT_TYPES, TRADING_SERVICES, WALLET_FIELDS,
  requiresMtAccountLink,
} from "@/lib/onboarding/constants";
import {
  defaultInvestorValues, INVESTOR_STEP_SCHEMAS, InvestorFormValues, walletValidators,
  buildInvestorStep1Schema, buildInvestorStep3Schema,
} from "@/lib/onboarding/schemas";
import { fetchRegistrationCaptcha, submitInvestorOnboarding, checkDuplicate, getOnboardingConfig, type OnboardingConfig } from "@/lib/onboarding/api";
import { isIndianUser } from "@/lib/onboarding/kyc-region";
import { captureReferralFromSearch, readReferralCode, clearReferralCode } from "@/lib/referral-attribution";

const STEP_SUBTITLES = [
  "Create Your Account",
  "Personal Information",
  "Identity & KYC Verification",
  "Banking Details",
  "Crypto Wallet Details",
  "Investment Profile",
  "Trading Services Interest",
  "Link MT4/MT5 Account",
  "Security Settings",
  "Agreements & Consent",
];

const STEP_FIELDS: (keyof InvestorFormValues)[][] = [
  ["fullName", "username", "email", "phoneCode", "phoneNum", "password", "confirmPassword", "referralCode", "agreeTerms", "agreeRisk", "emailOtpVerified", "mobileOtpVerified", "captchaAnswer", "captchaExpected"],
  ["dateOfBirth", "gender", "nationality", "country", "state", "city", "address", "postalCode"],
  ["panCard", "aadhaarNumber", "passportNumber", "driversLicenseNumber", "taxId", "panDocument", "aadhaarFront", "aadhaarBack", "passportDocument", "driversLicenseDocument", "selfie", "addressProof", "signature"],
  ["accountHolderName", "bankName", "accountNumber", "confirmAccountNumber", "ifscCode", "branchName", "upiId", "cancelledCheque"],
  ["cryptoWallets"],
  ["occupation", "annualIncomeRange", "investmentExperience", "riskAppetite", "preferredInvestmentType", "sourceOfFunds"],
  ["tradingInterests"],
  ["mtPlatform", "mtAccountNumber", "mtBroker", "mtServer", "mtPassword", "linkMtLater"],
  ["enable2FA", "withdrawalPin", "securityQuestion", "securityAnswer"],
  ["agreeTermsFinal", "agreePrivacy", "agreeRiskFinal", "agreeAml", "agreeProfitSharing", "agreeESign", "electronicSignature"],
];

export default function InvestorOnboardingPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [captcha, setCaptcha] = useState({ question: "", captchaToken: "" });
  const [onboardingConfig, setOnboardingConfig] = useState<OnboardingConfig | null>(null);

  const form = useForm<InvestorFormValues>({
    defaultValues: {
      ...defaultInvestorValues,
      ...(loadLocalDraft("investor") || {}),
    },
    mode: "onBlur",
  });

  const { watch, control, setValue, getValues, trigger, formState: { errors } } = form;
  const values = watch();
  const { lastSaved, saving } = useOnboardingDraft("investor", step, values as Record<string, unknown>);

  useEffect(() => {
    fetchRegistrationCaptcha()
      .then(c => {
        setCaptcha(c);
        setValue("captchaToken", c.captchaToken);
      })
      .catch(() => setCaptcha({ question: "?", captchaToken: "" }));
    getOnboardingConfig()
      .then(setOnboardingConfig)
      .catch(() => setOnboardingConfig(null));
  }, [setValue]);

  useEffect(() => {
    saveLocalDraft("investor", values as Record<string, unknown>);
  }, [values]);

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || readReferralCode();
    if (ref) setValue("referralCode", ref.toUpperCase());
  }, [setValue]);

  useEffect(() => {
    if (step === 8) {
      if (requiresMtAccountLink(values.tradingInterests)) {
        setValue("linkMtLater", false);
      } else if (!values.mtAccountNumber) {
        setValue("linkMtLater", true);
      }
    }
  }, [step, values.tradingInterests, values.mtAccountNumber, setValue]);

  const phone = values.phoneNum ? `${values.phoneCode} ${values.phoneNum}` : "";
  const indianKyc = isIndianUser(values.country, values.nationality);

  async function validateCurrentStep(): Promise<boolean> {
    const config = onboardingConfig ?? {
      requireEmailOtp: true,
      requireMobileOtp: false,
      requireCaptcha: true,
    } as Pick<OnboardingConfig, "requireEmailOtp" | "requireMobileOtp" | "requireCaptcha">;

    let schema: ZodTypeAny = INVESTOR_STEP_SCHEMAS[step - 1];
    if (step === 1) schema = buildInvestorStep1Schema(config);
    if (step === 3) schema = buildInvestorStep3Schema(values.country, values.nationality);
    const fields = STEP_FIELDS[step - 1];
    const subset = Object.fromEntries(fields.map(f => [f, getValues(f)]));
    const result = schema.safeParse(subset);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const path = issue.path[0] as keyof InvestorFormValues;
        form.setError(path, { message: issue.message });
      }
      return false;
    }
    if (step === 1) {
      try {
        const dup = await checkDuplicate(values.email, values.username);
        if (dup.emailTaken) { form.setError("email", { message: "Email already registered" }); return false; }
        if (dup.usernameTaken) { form.setError("username", { message: "Username taken" }); return false; }
      } catch { /* continue */ }
    }
    if (step === 5) {
      for (const [key, val] of Object.entries(values.cryptoWallets || {})) {
        if (!val) continue;
        const re = walletValidators[key];
        if (re && !re.test(val)) {
          toast.error(`Invalid ${key} wallet address`);
          return false;
        }
      }
    }
    if (step === 8) {
      const needsMt = requiresMtAccountLink(values.tradingInterests);
      if (needsMt && !values.linkMtLater) {
        if (!values.mtAccountNumber.trim()) { form.setError("mtAccountNumber", { message: "Account number required" }); return false; }
        if (!values.mtBroker.trim()) { form.setError("mtBroker", { message: "Broker required" }); return false; }
        if (!values.mtServer.trim()) { form.setError("mtServer", { message: "Server required" }); return false; }
        if (!values.mtPassword || values.mtPassword.length < 4) { form.setError("mtPassword", { message: "Trading password required (min 4 chars)" }); return false; }
      }
    }
    return trigger(fields as any);
  }

  async function nextStep() {
    if (!(await validateCurrentStep())) return;
    setStep(s => Math.min(s + 1, INVESTOR_STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setStep(s => Math.max(s - 1, 1));
  }

  async function onSubmit() {
    if (!(await validateCurrentStep())) return;
    setSubmitting(true);
    try {
      const v = getValues();
      const payload = {
        fullName: v.fullName, username: v.username, email: v.email, password: v.password, phone,
        referralCode: v.referralCode || undefined,
        dateOfBirth: v.dateOfBirth, gender: v.gender, nationality: v.nationality,
        country: v.country, state: v.state, city: v.city, address: v.address, postalCode: v.postalCode,
        panCard: v.panCard, aadhaarNumber: v.aadhaarNumber, passportNumber: v.passportNumber,
        driversLicenseNumber: v.driversLicenseNumber, taxId: v.taxId,
        accountHolderName: v.accountHolderName, bankName: v.bankName, accountNumber: v.accountNumber,
        ifscCode: v.ifscCode, branchName: v.branchName, upiId: v.upiId,
        cryptoWallets: v.cryptoWallets,
        occupation: v.occupation, annualIncomeRange: v.annualIncomeRange,
        investmentExperience: v.investmentExperience, riskAppetite: v.riskAppetite,
        preferredInvestmentType: v.preferredInvestmentType, sourceOfFunds: v.sourceOfFunds,
        tradingInterests: v.tradingInterests,
        mtPlatform: v.mtPlatform,
        mtAccountNumber: v.linkMtLater ? undefined : v.mtAccountNumber,
        mtBroker: v.linkMtLater ? undefined : v.mtBroker,
        mtServer: v.linkMtLater ? undefined : v.mtServer,
        mtPassword: v.linkMtLater ? undefined : v.mtPassword,
        linkMtLater: v.linkMtLater,
        securitySettings: { enable2FA: v.enable2FA, withdrawalPin: v.withdrawalPin, securityQuestion: v.securityQuestion },
        agreements: {
          terms: v.agreeTermsFinal, privacy: v.agreePrivacy, risk: v.agreeRiskFinal,
          aml: v.agreeAml, profitSharing: v.agreeProfitSharing, eSign: v.agreeESign,
          signature: v.electronicSignature, signedAt: new Date().toISOString(),
        },
        emailVerificationToken: v.emailVerificationToken,
        mobileVerificationToken: v.mobileVerificationToken,
        captchaAnswer: v.captchaAnswer, captchaToken: captcha.captchaToken || v.captchaToken,
      };

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      const fileMap: [keyof InvestorFormValues, string][] = [
        ["panDocument", "panDocument"], ["aadhaarFront", "aadhaarFront"], ["aadhaarBack", "aadhaarBack"],
        ["passportDocument", "passportDocument"], ["driversLicenseDocument", "driversLicenseDocument"],
        ["selfie", "selfie"], ["addressProof", "addressProof"],
        ["signature", "signature"], ["cancelledCheque", "cancelledCheque"],
      ];
      for (const [field, name] of fileMap) {
        const file = v[field] as File | undefined;
        if (file instanceof File) fd.append(name, file);
      }

      const res = await submitInvestorOnboarding(fd);
      login(res.token, res.user as any, res.refreshToken);
      clearReferralCode();
      localStorage.removeItem("kq-onboarding-local-investor");
      localStorage.removeItem("kq-onboarding-draft-token-investor");
      toast.success(`Welcome! Your Investor ID: ${res.investorId}`);
      setLocation("/dashboard");
    } catch (e: any) {
      toast.error(e.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  const states = useMemo(() => STATES_BY_COUNTRY[values.country] || [], [values.country]);
  const mtRequired = useMemo(() => requiresMtAccountLink(values.tradingInterests), [values.tradingInterests]);

  function skipOptionalSteps() {
    setStep(INVESTOR_STEPS.length);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const progressiveEnabled = onboardingConfig?.progressiveOnboarding !== false;
  const agreementsStep = INVESTOR_STEPS.length;

  const footer = (
    <div className={`flex flex-col-reverse sm:flex-row gap-3 mt-8 min-w-0 ${step > 1 ? "sm:justify-between" : "sm:justify-end"}`}>
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        {step > 1 && (
          <Button type="button" variant="outline" onClick={prevStep} className="gap-2 w-full sm:w-auto">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
        {progressiveEnabled && step === INVESTOR_REQUIRED_STEP_COUNT && step < agreementsStep && (
          <Button type="button" variant="ghost" onClick={skipOptionalSteps} className="w-full sm:w-auto text-muted-foreground">
            Skip optional steps
          </Button>
        )}
        {progressiveEnabled && step >= INVESTOR_OPTIONAL_STEP_START && step < agreementsStep && (
          <Button type="button" variant="ghost" onClick={() => { setStep(s => Math.min(s + 1, agreementsStep)); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="w-full sm:w-auto text-muted-foreground">
            Skip for now
          </Button>
        )}
      </div>
      {step < INVESTOR_STEPS.length ? (
        <Button type="button" onClick={nextStep} className="gap-2 font-semibold w-full sm:w-auto">
          Next <ArrowRight className="h-4 w-4" />
        </Button>
      ) : (
        <Button type="button" onClick={onSubmit} disabled={submitting} className="gap-2 font-semibold w-full sm:w-auto text-wrap-safe">
          {submitting ? "Submitting…" : <><CheckCircle2 className="h-4 w-4 shrink-0" /> Complete Registration</>}
        </Button>
      )}
    </div>
  );

  return (
    <WizardShell
      title="Investor Onboarding"
      subtitle={STEP_SUBTITLES[step - 1]!}
      steps={INVESTOR_STEPS.map(s => ({
        num: s.num,
        label: progressiveEnabled && s.num > INVESTOR_REQUIRED_STEP_COUNT ? `${s.label} (optional)` : s.label,
      }))}
      currentStep={step}
      totalSteps={INVESTOR_STEPS.length}
      footer={footer}
      lastSaved={lastSaved}
      saving={saving}
      alternateHref={{ href: "/register/manager", label: "Apply as Manager →" }}
    >
      {Object.keys(errors).length > 0 && step === 1 && (
        <Alert variant="destructive" className="mb-4"><AlertDescription>Please fix the errors below before continuing.</AlertDescription></Alert>
      )}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Full Name" error={errors.fullName?.message}>
              <Input {...form.register("fullName")} placeholder="John Doe" />
            </Field>
            <Field label="Username" error={errors.username?.message} tooltip="Unique public username">
              <Input {...form.register("username")} placeholder="johndoe" />
            </Field>
          </div>
          <Field label="Email Address" error={errors.email?.message}>
            <Input type="email" {...form.register("email")} placeholder="you@example.com" />
          </Field>
          <Field label="Mobile Number" tooltip="Used for OTP and account recovery">
            <div className="flex gap-2">
              <PhoneCountryCodeSelect
                value={values.phoneCode}
                onChange={v => setValue("phoneCode", v)}
              />
              <Input {...form.register("phoneNum")} type="tel" placeholder="9876543210" className="flex-1" />
            </div>
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Password" error={errors.password?.message}>
              <div className="relative">
                <Input type={showPw ? "text" : "password"} {...form.register("password")} />
                <button type="button" className="absolute right-3 top-2.5" onClick={() => setShowPw(v => !v)}>
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrength password={values.password} />
            </Field>
            <Field label="Confirm Password" error={errors.confirmPassword?.message}>
              <Input type="password" {...form.register("confirmPassword")} />
            </Field>
          </div>
          <Field label="Referral Code (optional)">
            <Input {...form.register("referralCode")} className="uppercase font-mono" placeholder="KQABC123" />
          </Field>

          {(onboardingConfig?.requireEmailOtp ?? true) && (
            <OtpVerification channel="email" email={values.email} fullName={values.fullName}
              verified={values.emailOtpVerified} onVerified={(v, token) => { setValue("emailOtpVerified", v); if (token) setValue("emailVerificationToken", token); }} />
          )}
          {values.phoneNum && (onboardingConfig?.requireMobileOtp ?? false) && (
            <OtpVerification channel="mobile" phone={phone} fullName={values.fullName}
              verified={values.mobileOtpVerified} onVerified={(v, token) => { setValue("mobileOtpVerified", v); if (token) setValue("mobileVerificationToken", token); }} label="Mobile OTP" />
          )}
          {values.phoneNum && !(onboardingConfig?.requireMobileOtp ?? false) && (
            <OtpVerification channel="mobile" phone={phone} fullName={values.fullName}
              verified={values.mobileOtpVerified} onVerified={(v, token) => { setValue("mobileOtpVerified", v); if (token) setValue("mobileVerificationToken", token); }} label="Mobile OTP (optional)" />
          )}

          {(onboardingConfig?.requireCaptcha ?? true) && (
            <Field label={`CAPTCHA: ${captcha.question} = ?`} error={errors.captchaAnswer?.message}>
              <Input {...form.register("captchaAnswer")} placeholder="Answer" inputMode="numeric" />
            </Field>
          )}

          <div className="space-y-3">
            <CheckboxField id="terms" checked={values.agreeTerms} onChange={v => setValue("agreeTerms", v)} error={errors.agreeTerms?.message}
              label="I agree to the Terms & Conditions and Privacy Policy" />
            <CheckboxField id="risk" checked={values.agreeRisk} onChange={v => setValue("agreeRisk", v)} error={errors.agreeRisk?.message}
              label="I acknowledge and accept the Risk Disclosure statement" />
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <Input type="date" {...form.register("dateOfBirth")} />
            </Field>
            <Field label="Gender" error={errors.gender?.message}>
              <Select value={values.gender} onValueChange={v => setValue("gender", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Nationality" error={errors.nationality?.message}>
              <Input {...form.register("nationality")} />
            </Field>
            <Field label="Country" error={errors.country?.message}>
              <Select value={values.country} onValueChange={v => { setValue("country", v); setValue("state", ""); }}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="State">
              {states.length ? (
                <Select value={values.state} onValueChange={v => setValue("state", v)}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              ) : <Input {...form.register("state")} placeholder="State / Province" />}
            </Field>
            <Field label="City" error={errors.city?.message}><Input {...form.register("city")} /></Field>
          </div>
          <Field label="Full Residential Address" error={errors.address?.message} tooltip="As per your ID document">
            <Input {...form.register("address")} placeholder="Street, area, landmark" />
          </Field>
          <Field label="Postal / ZIP Code" error={errors.postalCode?.message}>
            <Input {...form.register("postalCode")} />
          </Field>
        </div>
      )}

      {/* STEP 3 — KYC */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {indianKyc
              ? "Indian residents: upload PAN card and Aadhaar (front & back). OCR verification runs on submission."
              : "International users: upload passport and driving license. OCR verification runs on submission."}
          </p>
          {indianKyc ? (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="PAN Card Number" error={errors.panCard?.message}><Input {...form.register("panCard")} className="uppercase" placeholder="ABCDE1234F" /></Field>
                <Field label="Aadhaar Number" error={errors.aadhaarNumber?.message}><Input {...form.register("aadhaarNumber")} placeholder="XXXX XXXX XXXX" /></Field>
                <Field label="Tax ID (optional)"><Input {...form.register("taxId")} /></Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Controller name="panDocument" control={control} render={({ field }) => (
                  <FileUploadField label="PAN Card" required value={field.value} onChange={field.onChange} error={errors.panDocument?.message as string} />
                )} />
                <Controller name="aadhaarFront" control={control} render={({ field }) => (
                  <FileUploadField label="Aadhaar Front" required value={field.value} onChange={field.onChange} error={errors.aadhaarFront?.message as string} />
                )} />
                <Controller name="aadhaarBack" control={control} render={({ field }) => (
                  <FileUploadField label="Aadhaar Back" required value={field.value} onChange={field.onChange} error={errors.aadhaarBack?.message as string} />
                )} />
              </div>
            </>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-4">
                <Field label="Passport Number" error={errors.passportNumber?.message}><Input {...form.register("passportNumber")} /></Field>
                <Field label="Driving License Number" error={errors.driversLicenseNumber?.message}><Input {...form.register("driversLicenseNumber")} /></Field>
                <Field label="Tax ID (optional)"><Input {...form.register("taxId")} /></Field>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <Controller name="passportDocument" control={control} render={({ field }) => (
                  <FileUploadField label="Passport" required value={field.value} onChange={field.onChange} error={errors.passportDocument?.message as string} />
                )} />
                <Controller name="driversLicenseDocument" control={control} render={({ field }) => (
                  <FileUploadField label="Driving License" required value={field.value} onChange={field.onChange} error={errors.driversLicenseDocument?.message as string} />
                )} />
              </div>
            </>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            <Controller name="selfie" control={control} render={({ field }) => (
              <FileUploadField label="Selfie Verification" required value={field.value} onChange={field.onChange} hint="Hold ID beside face" error={errors.selfie?.message as string} />
            )} />
            <Controller name="addressProof" control={control} render={({ field }) => (
              <FileUploadField label="Address Proof" required value={field.value} onChange={field.onChange} error={errors.addressProof?.message as string} />
            )} />
            <Controller name="signature" control={control} render={({ field }) => (
              <FileUploadField label="Signature" required value={field.value} onChange={field.onChange} error={errors.signature?.message as string} />
            )} />
          </div>
        </div>
      )}

      {/* STEP 4 — Banking */}
      {step === 4 && (
        <div className="space-y-4">
          <Field label="Account Holder Name" error={errors.accountHolderName?.message}><Input {...form.register("accountHolderName")} /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Bank Name" error={errors.bankName?.message}><Input {...form.register("bankName")} /></Field>
            <Field label="Branch Name"><Input {...form.register("branchName")} /></Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Account Number" error={errors.accountNumber?.message} tooltip="Encrypted at rest">
              <Input {...form.register("accountNumber")} inputMode="numeric" />
            </Field>
            <Field label="Confirm Account Number" error={errors.confirmAccountNumber?.message}>
              <Input {...form.register("confirmAccountNumber")} inputMode="numeric" />
            </Field>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="IFSC / SWIFT Code" error={errors.ifscCode?.message}><Input {...form.register("ifscCode")} className="uppercase" /></Field>
            <Field label="UPI ID" error={errors.upiId?.message}><Input {...form.register("upiId")} placeholder="name@bank" /></Field>
          </div>
          <Controller name="cancelledCheque" control={control} render={({ field }) => (
            <FileUploadField label="Cancelled Cheque / Passbook" required value={field.value} onChange={field.onChange} error={errors.cancelledCheque?.message as string} />
          )} />
        </div>
      )}

      {/* STEP 5 — Crypto */}
      {step === 5 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Optional — add wallet addresses for crypto deposits and withdrawals. Network validation applied.</p>
          {WALLET_FIELDS.map(w => (
            <Field key={w.key} label={w.label} tooltip="Paste or scan QR — format validated">
              <Input
                placeholder={w.placeholder}
                value={values.cryptoWallets?.[w.key] || ""}
                onChange={e => setValue("cryptoWallets", { ...values.cryptoWallets, [w.key]: e.target.value.trim() })}
              />
            </Field>
          ))}
        </div>
      )}

      {/* STEP 6 — Investment */}
      {step === 6 && (
        <div className="space-y-4">
          <Field label="Occupation" error={errors.occupation?.message}><Input {...form.register("occupation")} /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Annual Income Range" error={errors.annualIncomeRange?.message}>
              <Select value={values.annualIncomeRange} onValueChange={v => setValue("annualIncomeRange", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INCOME_RANGES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Investment Experience" error={errors.investmentExperience?.message}>
              <Select value={values.investmentExperience} onValueChange={v => setValue("investmentExperience", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{EXPERIENCE_LEVELS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Risk Appetite" error={errors.riskAppetite?.message}>
            <Select value={values.riskAppetite} onValueChange={v => setValue("riskAppetite", v as InvestorFormValues["riskAppetite"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{RISK_LEVELS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Preferred Investment Type" error={errors.preferredInvestmentType?.message}>
              <Select value={values.preferredInvestmentType} onValueChange={v => setValue("preferredInvestmentType", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{INVESTMENT_TYPES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Source of Funds" error={errors.sourceOfFunds?.message}>
              <Select value={values.sourceOfFunds} onValueChange={v => setValue("sourceOfFunds", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{FUND_SOURCES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
          </div>
        </div>
      )}

      {/* STEP 7 — Services */}
      {step === 7 && (
        <div className="space-y-3">
          {errors.tradingInterests && <p className="text-sm text-destructive">{errors.tradingInterests.message}</p>}
          <p className="text-sm text-muted-foreground">
            Account Handling, Algo Trading, and Copy Trading require linking an MT4/MT5 account in the next step.
          </p>
          {requiresMtAccountLink(values.tradingInterests) && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertDescription className="text-sm">
                An initial wallet deposit of <strong>₹10,000</strong> or <strong>$100 / 100 USDT</strong> (converted at live FX rates) is required before these services activate. You can deposit after registration from Wallet.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid sm:grid-cols-2 gap-3">
            {TRADING_SERVICES.map(svc => {
              const selected = values.tradingInterests.includes(svc.id);
              return (
                <button key={svc.id} type="button"
                  onClick={() => setValue("tradingInterests", selected ? values.tradingInterests.filter(x => x !== svc.id) : [...values.tradingInterests, svc.id])}
                  className={`p-4 rounded-xl border text-left transition-all ${selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"}`}>
                  <p className="font-semibold text-sm">{svc.label}</p>
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary mt-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 8 — MT4/MT5 */}
      {step === 8 && (
        <div className="space-y-4">
          {mtRequired && (
            <Alert className="border-amber-500/30 bg-amber-500/10">
              <AlertDescription className="text-sm">
                Deposit at least ₹10,000 or $100 / 100 USDT to your portal wallet after signup to link MT4/MT5 and activate your selected services.
              </AlertDescription>
            </Alert>
          )}
          <MtAccountCredentialsForm
          values={{
            mtPlatform: values.mtPlatform,
            mtAccountNumber: values.mtAccountNumber,
            mtBroker: values.mtBroker,
            mtServer: values.mtServer,
            mtPassword: values.mtPassword,
            linkMtLater: values.linkMtLater,
          }}
          onChange={(key, val) => setValue(key as keyof InvestorFormValues, val as never)}
          required={mtRequired}
          showDeferOption
          errors={{
            mtAccountNumber: errors.mtAccountNumber?.message,
            mtBroker: errors.mtBroker?.message,
            mtServer: errors.mtServer?.message,
            mtPassword: errors.mtPassword?.message,
          }}
        />
        </div>
      )}

      {/* STEP 9 — Security */}
      {step === 9 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border border-border">
            <div>
              <p className="font-medium">Enable 2FA</p>
              <p className="text-xs text-muted-foreground">Set up Google Authenticator after login from Security settings</p>
            </div>
            <Switch checked={values.enable2FA} onCheckedChange={v => setValue("enable2FA", v)} />
          </div>
          <Field label="Withdrawal PIN" tooltip="4–6 digit PIN for withdrawals">
            <Input {...form.register("withdrawalPin")} type="password" inputMode="numeric" maxLength={6} placeholder="••••" />
          </Field>
          <Field label="Security Question"><Input {...form.register("securityQuestion")} placeholder="Mother's maiden name?" /></Field>
          <Field label="Security Answer"><Input {...form.register("securityAnswer")} type="password" /></Field>
        </div>
      )}

      {/* STEP 10 — Agreements */}
      {step === 10 && (
        <div className="space-y-4">
          <div className="space-y-3">
            {[
              ["agreeTermsFinal", "Terms & Conditions"],
              ["agreePrivacy", "Privacy Policy"],
              ["agreeRiskFinal", "Risk Disclosure"],
              ["agreeAml", "AML / KYC Compliance"],
              ["agreeProfitSharing", "Profit Sharing Agreement"],
              ["agreeESign", "Electronic Signature Consent"],
            ].map(([key, label]) => (
              <CheckboxField key={key} id={key}
                checked={(values as any)[key]} onChange={v => setValue(key as keyof InvestorFormValues, v as any)}
                error={(errors as any)[key]?.message} label={`I accept the ${label}`} />
            ))}
          </div>
          <Field label="Electronic Signature" error={errors.electronicSignature?.message} tooltip="Type your full legal name">
            <Input {...form.register("electronicSignature")} placeholder={values.fullName || "Your full name"} />
          </Field>
          <p className="text-xs text-muted-foreground">Submission records timestamp, IP address, and device information for compliance.</p>
        </div>
      )}
    </WizardShell>
  );
}

function Field({ label, children, error, tooltip }: { label: string; children: React.ReactNode; error?: string; tooltip?: string }) {
  return (
    <div className="space-y-1.5 min-w-0">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center break-words">
        {label}{tooltip && <FieldTooltip text={tooltip} />}
      </Label>
      <div className="min-w-0">{children}</div>
      {error && <p className="text-xs text-destructive break-words">{error}</p>}
    </div>
  );
}

function CheckboxField({ id, checked, onChange, label, error }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; error?: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20 min-w-0">
        <Checkbox id={id} checked={checked} onCheckedChange={v => onChange(!!v)} className="shrink-0 mt-0.5" />
        <Label htmlFor={id} className="text-xs leading-relaxed cursor-pointer break-words min-w-0 flex-1">{label}</Label>
      </div>
      {error && <p className="text-xs text-destructive mt-1 break-words">{error}</p>}
    </div>
  );
}
