import { useEffect, useMemo, useState } from "react";
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
import { WizardShell } from "@/components/onboarding/WizardShell";
import { FileUploadField } from "@/components/onboarding/FileUploadField";
import { OtpVerification } from "@/components/onboarding/OtpVerification";
import { FieldTooltip } from "@/components/onboarding/FieldTooltip";
import { PasswordStrength } from "@/components/onboarding/PasswordStrength";
import { useOnboardingDraft, loadLocalDraft, saveLocalDraft } from "@/hooks/use-onboarding-draft";
import { PhoneCountryCodeSelect } from "@/components/forms/PhoneCountryCodeSelect";
import {
  MANAGER_STEPS, COUNTRIES, STATES_BY_COUNTRY, GENDERS, WALLET_FIELDS, MANAGER_PERMISSIONS,
} from "@/lib/onboarding/constants";
import { generateCaptcha, submitManagerApplication, checkDuplicate } from "@/lib/onboarding/api";
import { managerStep1Schema, walletValidators } from "@/lib/onboarding/schemas";

type ManagerForm = {
  fullName: string; username: string; email: string; phoneCode: string; phoneNum: string;
  password: string; confirmPassword: string;
  emailOtpVerified: boolean; captchaAnswer: string; captchaExpected: string;
  dateOfBirth: string; gender: string; nationality: string; country: string; state: string; city: string; address: string;
  yearsExperience: string; tradingExperience: string; specialization: string; previousCompany: string;
  linkedIn: string; certifications: string;
  resume?: File; certificate?: File;
  panNumber: string; idNumber: string; taxId: string;
  idProof?: File; selfie?: File; addressProof?: File;
  accountHolderName: string; bankName: string; accountNumber: string; confirmAccountNumber: string;
  ifscCode: string; upiId: string; cancelledCheque?: File;
  cryptoWallets: Record<string, string>;
  assignedRegion: string; permissionLevel: string; rolePermissions: string[];
  enable2FA: boolean; securityPin: string;
  agreeNda: boolean; agreeConfidentiality: boolean; agreeAml: boolean; agreePlatform: boolean; agreeContractor: boolean;
};

const DEFAULTS: ManagerForm = {
  fullName: "", username: "", email: "", phoneCode: "+91", phoneNum: "",
  password: "", confirmPassword: "", emailOtpVerified: false, captchaAnswer: "", captchaExpected: "",
  dateOfBirth: "", gender: "", nationality: "", country: "", state: "", city: "", address: "",
  yearsExperience: "", tradingExperience: "", specialization: "", previousCompany: "", linkedIn: "", certifications: "",
  panNumber: "", idNumber: "", taxId: "",
  accountHolderName: "", bankName: "", accountNumber: "", confirmAccountNumber: "", ifscCode: "", upiId: "",
  cryptoWallets: {},
  assignedRegion: "", permissionLevel: "standard", rolePermissions: [],
  enable2FA: true, securityPin: "",
  agreeNda: false, agreeConfidentiality: false, agreeAml: false, agreePlatform: false, agreeContractor: false,
};

const SUBTITLES = [
  "Manager Account Creation", "Personal Information", "Professional Details", "Identity Verification",
  "Banking Details", "Crypto Wallets", "Role & Permissions", "Security Settings", "Agreements",
];

export default function ManagerOnboardingPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [captcha] = useState(() => generateCaptcha());
  const [submitted, setSubmitted] = useState(false);

  const form = useForm<ManagerForm>({
    defaultValues: { ...DEFAULTS, captchaExpected: captcha.answer, ...(loadLocalDraft("manager") || {}) },
  });
  const { watch, control, setValue, getValues, setError, formState: { errors } } = form;
  const values = watch();
  const { lastSaved, saving } = useOnboardingDraft("manager", step, values as Record<string, unknown>);

  useEffect(() => { saveLocalDraft("manager", values as Record<string, unknown>); }, [values]);

  const phone = values.phoneNum ? `${values.phoneCode} ${values.phoneNum}` : "";
  const states = useMemo(() => STATES_BY_COUNTRY[values.country] || [], [values.country]);

  async function validateStep(): Promise<boolean> {
    if (step === 1) {
      const r = managerStep1Schema.safeParse(getValues());
      if (!r.success) {
        r.error.issues.forEach(i => setError(i.path[0] as keyof ManagerForm, { message: i.message }));
        return false;
      }
      const dup = await checkDuplicate(values.email, values.username).catch(() => ({ emailTaken: false, usernameTaken: false }));
      if (dup.emailTaken) { setError("email", { message: "Email already registered" }); return false; }
    }
    if (step === 5) {
      for (const [key, val] of Object.entries(values.cryptoWallets || {})) {
        if (val && walletValidators[key] && !walletValidators[key].test(val)) {
          toast.error(`Invalid ${key} address`); return false;
        }
      }
    }
    if (step === 9) {
      if (!values.agreeNda || !values.agreeConfidentiality || !values.agreeAml || !values.agreePlatform || !values.agreeContractor) {
        toast.error("Accept all agreements"); return false;
      }
    }
    return true;
  }

  async function nextStep() {
    if (!(await validateStep())) return;
    setStep(s => Math.min(s + 1, 9));
  }

  async function onSubmit() {
    if (!(await validateStep())) return;
    setSubmitting(true);
    try {
      const v = getValues();
      const payload = { ...v, phone, password: v.password, captchaAnswer: v.captchaAnswer, captchaExpected: v.captchaExpected };
      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      for (const [field, name] of [["resume", "resume"], ["certificate", "certificate"], ["idProof", "idProof"], ["selfie", "selfie"], ["addressProof", "addressProof"], ["cancelledCheque", "cancelledCheque"]] as const) {
        const file = v[field];
        if (file instanceof File) fd.append(name, file);
      }
      const res = await submitManagerApplication(fd);
      localStorage.removeItem("kq-onboarding-local-manager");
      setSubmitted(true);
      toast.success(res.message);
    } catch (e: any) {
      toast.error(e.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl font-bold">Application Submitted</h1>
          <p className="text-muted-foreground">Super Admin will review your documents. You will receive an email once approved.</p>
          <Button onClick={() => setLocation("/login")}>Back to Login</Button>
        </div>
      </div>
    );
  }

  const footer = (
    <div className={`flex gap-3 mt-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
      {step > 1 && <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>}
      {step < 9 ? (
        <Button type="button" onClick={nextStep} className="gap-2">Next <ArrowRight className="h-4 w-4" /></Button>
      ) : (
        <Button type="button" onClick={onSubmit} disabled={submitting} className="gap-2">
          {submitting ? "Submitting…" : "Submit Application"}
        </Button>
      )}
    </div>
  );

  return (
    <WizardShell title="Manager Onboarding" subtitle={SUBTITLES[step - 1]!}
      steps={MANAGER_STEPS.map(s => ({ num: s.num, label: s.label }))}
      currentStep={step} totalSteps={9} footer={footer} lastSaved={lastSaved} saving={saving}
      alternateHref={{ href: "/register", label: "← Investor Registration" }}>
      {step === 1 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Full Name" err={errors.fullName?.message}><Input {...form.register("fullName")} /></F>
            <F label="Username" err={errors.username?.message}><Input {...form.register("username")} /></F>
          </div>
          <F label="Official Email" err={errors.email?.message}><Input type="email" {...form.register("email")} /></F>
          <F label="Mobile"><div className="flex gap-2">
            <PhoneCountryCodeSelect value={values.phoneCode} onChange={v => setValue("phoneCode", v)} />
            <Input {...form.register("phoneNum")} className="flex-1" />
          </div></F>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Password" err={errors.password?.message}>
              <div className="relative"><Input type={showPw ? "text" : "password"} {...form.register("password")} />
                <button type="button" className="absolute right-3 top-2.5" onClick={() => setShowPw(v => !v)}>{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div>
              <PasswordStrength password={values.password} />
            </F>
            <F label="Confirm Password" err={errors.confirmPassword?.message}><Input type="password" {...form.register("confirmPassword")} /></F>
          </div>
          <OtpVerification channel="email" email={values.email} fullName={values.fullName} verified={values.emailOtpVerified} onVerified={v => setValue("emailOtpVerified", v)} />
          <F label={`CAPTCHA: ${captcha.question} = ?`} err={errors.captchaAnswer?.message}><Input {...form.register("captchaAnswer")} /></F>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Date of Birth"><Input type="date" {...form.register("dateOfBirth")} /></F>
            <F label="Gender"><Select value={values.gender} onValueChange={v => setValue("gender", v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{GENDERS.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></F>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Nationality"><Input {...form.register("nationality")} /></F>
            <F label="Country"><Select value={values.country} onValueChange={v => setValue("country", v)}><SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger><SelectContent>{COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></F>
          </div>
          <F label="State">{states.length ? <Select value={values.state} onValueChange={v => setValue("state", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select> : <Input {...form.register("state")} />}</F>
          <F label="City"><Input {...form.register("city")} /></F>
          <F label="Full Address"><Input {...form.register("address")} /></F>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Years of Experience"><Input {...form.register("yearsExperience")} /></F>
            <F label="Financial / Trading Experience"><Input {...form.register("tradingExperience")} /></F>
            <F label="Specialization"><Input {...form.register("specialization")} /></F>
            <F label="Previous Company"><Input {...form.register("previousCompany")} /></F>
            <F label="LinkedIn Profile"><Input {...form.register("linkedIn")} placeholder="https://linkedin.com/in/..." /></F>
            <F label="Certifications"><Input {...form.register("certifications")} /></F>
          </div>
          <Controller name="resume" control={control} render={({ field }) => <FileUploadField label="Resume / CV" value={field.value} onChange={field.onChange} />} />
          <Controller name="certificate" control={control} render={({ field }) => <FileUploadField label="Professional Certificates" value={field.value} onChange={field.onChange} />} />
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <F label="PAN Number"><Input {...form.register("panNumber")} className="uppercase" /></F>
            <F label="Aadhaar / Passport"><Input {...form.register("idNumber")} /></F>
            <F label="Tax ID"><Input {...form.register("taxId")} /></F>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Controller name="idProof" control={control} render={({ field }) => <FileUploadField label="Government ID" required value={field.value} onChange={field.onChange} />} />
            <Controller name="selfie" control={control} render={({ field }) => <FileUploadField label="Selfie Verification" required value={field.value} onChange={field.onChange} />} />
            <Controller name="addressProof" control={control} render={({ field }) => <FileUploadField label="Address Proof" required value={field.value} onChange={field.onChange} />} />
          </div>
        </div>
      )}
      {step === 5 && (
        <div className="space-y-4">
          <F label="Account Holder Name"><Input {...form.register("accountHolderName")} /></F>
          <div className="grid md:grid-cols-2 gap-4">
            <F label="Bank Name"><Input {...form.register("bankName")} /></F>
            <F label="IFSC / SWIFT"><Input {...form.register("ifscCode")} className="uppercase" /></F>
            <F label="Account Number"><Input {...form.register("accountNumber")} /></F>
            <F label="Confirm Account Number"><Input {...form.register("confirmAccountNumber")} /></F>
            <F label="UPI ID"><Input {...form.register("upiId")} /></F>
          </div>
          <Controller name="cancelledCheque" control={control} render={({ field }) => <FileUploadField label="Cancelled Cheque" value={field.value} onChange={field.onChange} />} />
        </div>
      )}
      {step === 6 && (
        <div className="space-y-4">
          {WALLET_FIELDS.slice(0, 6).map(w => (
            <F key={w.key} label={w.label}><Input placeholder={w.placeholder} value={values.cryptoWallets?.[w.key] || ""} onChange={e => setValue("cryptoWallets", { ...values.cryptoWallets, [w.key]: e.target.value })} /></F>
          ))}
        </div>
      )}
      {step === 7 && (
        <div className="space-y-4">
          <F label="Assigned Region"><Input {...form.register("assignedRegion")} placeholder="e.g. South Asia" /></F>
          <F label="Permission Level"><Select value={values.permissionLevel} onValueChange={v => setValue("permissionLevel", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="standard">Standard</SelectItem><SelectItem value="senior">Senior</SelectItem><SelectItem value="lead">Lead</SelectItem></SelectContent></Select></F>
          <p className="text-sm font-medium">Access Scope</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {MANAGER_PERMISSIONS.map(p => {
              const on = values.rolePermissions.includes(p);
              return (
                <button key={p} type="button" onClick={() => setValue("rolePermissions", on ? values.rolePermissions.filter(x => x !== p) : [...values.rolePermissions, p])}
                  className={`p-3 rounded-lg border text-sm text-left ${on ? "border-primary bg-primary/10" : "border-border"}`}>{p}</button>
              );
            })}
          </div>
        </div>
      )}
      {step === 8 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl border">
            <div><p className="font-medium">Mandatory 2FA</p><p className="text-xs text-muted-foreground">Required for all manager accounts</p></div>
            <Switch checked={values.enable2FA} onCheckedChange={v => setValue("enable2FA", v)} />
          </div>
          <F label="Security PIN"><Input {...form.register("securityPin")} type="password" maxLength={6} /></F>
        </div>
      )}
      {step === 9 && (
        <div className="space-y-3">
          {([["agreeNda", "NDA Agreement"], ["agreeConfidentiality", "Confidentiality Agreement"], ["agreeAml", "AML Compliance"], ["agreePlatform", "Platform Policies"], ["agreeContractor", "Employee / Contractor Agreement"]] as const).map(([k, label]) => (
            <div key={k} className="flex items-start gap-3 p-3 rounded-lg border">
              <Checkbox id={k} checked={values[k]} onCheckedChange={v => setValue(k, !!v)} />
              <Label htmlFor={k} className="text-xs cursor-pointer">I accept the {label}</Label>
            </div>
          ))}
        </div>
      )}
    </WizardShell>
  );
}

function F({ label, children, err, tip }: { label: string; children: React.ReactNode; err?: string; tip?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center">{label}{tip && <FieldTooltip text={tip} />}</Label>
      {children}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
