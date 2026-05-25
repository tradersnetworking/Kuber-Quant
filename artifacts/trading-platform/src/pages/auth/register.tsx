import { useState } from "react";
import { useRegister } from "@workspace/api-client-react";
import logo from "@/assets/logo.png";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  User, Mail, Lock, Phone, Globe, MapPin, Briefcase, Shield,
  CheckCircle2, Eye, EyeOff, ArrowRight, ArrowLeft, TrendingUp,
  Cpu, Users, BarChart3, ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL_STEPS = 4;

const COUNTRY_CODES = [
  { code: "+91", flag: "🇮🇳" }, { code: "+1",  flag: "🇺🇸" }, { code: "+44", flag: "🇬🇧" },
  { code: "+61", flag: "🇦🇺" }, { code: "+971",flag: "🇦🇪" }, { code: "+65", flag: "🇸🇬" },
  { code: "+49", flag: "🇩🇪" }, { code: "+33", flag: "🇫🇷" }, { code: "+81", flag: "🇯🇵" },
  { code: "+86", flag: "🇨🇳" }, { code: "+7",  flag: "🇷🇺" }, { code: "+55", flag: "🇧🇷" },
  { code: "+27", flag: "🇿🇦" }, { code: "+60", flag: "🇲🇾" }, { code: "+966",flag: "🇸🇦" },
];

const STEPS = [
  { num: 1, label: "Account",    icon: User },
  { num: 2, label: "Profile",    icon: Globe },
  { num: 3, label: "Interests",  icon: TrendingUp },
  { num: 4, label: "Confirm",    icon: Shield },
];

const COUNTRIES = ["India","United States","United Kingdom","UAE","Singapore","Canada","Australia","Germany","France","Japan","Other"];
const RISK_OPTIONS = ["Conservative — Low risk, stable returns","Moderate — Balanced risk and reward","Aggressive — High risk, high potential returns"];
const INCOME_OPTIONS = ["Under $10,000","$10,000 – $50,000","$50,000 – $100,000","$100,000 – $500,000","$500,000+"];
const EXPERIENCE_OPTIONS = ["Beginner (< 1 year)","Novice (1–3 years)","Intermediate (3–5 years)","Experienced (5–10 years)","Expert (10+ years)"];
const SERVICES = [
  { id: "plans",     label: "Investment Plans",  icon: TrendingUp, desc: "Fixed ROI growth plans" },
  { id: "algo",      label: "Algo Trading",      icon: Cpu,        desc: "Automated strategies" },
  { id: "copy",      label: "Copy Trading",      icon: Users,      desc: "Mirror expert traders" },
  { id: "ea",        label: "EA Marketplace",    icon: BarChart3,  desc: "Expert Advisor bots" },
];

function PwStrengthBar({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  if (!password) return null;
  const colors = ["bg-red-500","bg-orange-500","bg-yellow-500","bg-green-500"];
  const labels = ["Weak","Fair","Good","Strong"];
  return (
    <div className="space-y-1 mt-1.5">
      <div className="flex gap-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i < score ? colors[score-1] : "bg-white/10"}`} />
        ))}
      </div>
      <p className={`text-[11px] font-medium ${["text-red-400","text-orange-400","text-yellow-400","text-green-400"][score-1] || ""}`}>
        {labels[score-1] || "Enter a password"}
      </p>
    </div>
  );
}

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const registerMutation = useRegister();

  // Step 1 — Account
  const [fullName, setFullName]       = useState("");
  const [email, setEmail]             = useState("");
  const [phoneCode, setPhoneCode]     = useState("+91");
  const [phoneNum, setPhoneNum]       = useState("");
  const phone = phoneNum ? `${phoneCode} ${phoneNum}` : "";
  const [password, setPassword]       = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms]   = useState(false);
  const [agreeRisk, setAgreeRisk]     = useState(false);

  // Step 2 — Profile
  const [country, setCountry]         = useState("");
  const [city, setCity]               = useState("");
  const [address, setAddress]         = useState("");
  const [occupation, setOccupation]   = useState("");
  const [income, setIncome]           = useState("");
  const [experience, setExperience]   = useState("");
  const [riskAppetite, setRiskAppetite] = useState("");

  // Step 3 — Services
  const [services, setServices]       = useState<string[]>([]);

  const [error, setError]             = useState<string | null>(null);

  function toggleService(id: string) {
    setServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  }

  function validateStep1(): string | null {
    if (!fullName.trim()) return "Full name is required.";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) return "Valid email is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPw) return "Passwords do not match.";
    if (!agreeTerms || !agreeRisk) return "Please accept the Terms & Conditions and Risk Disclosure.";
    return null;
  }

  function validateStep2(): string | null {
    if (!country) return "Please select your country.";
    return null;
  }

  function nextStep() {
    setError(null);
    if (step === 1) { const e = validateStep1(); if (e) { setError(e); return; } }
    if (step === 2) { const e = validateStep2(); if (e) { setError(e); return; } }
    setStep(s => Math.min(s + 1, TOTAL_STEPS));
  }

  function prevStep() { setError(null); setStep(s => Math.max(s - 1, 1)); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    registerMutation.mutate(
      { data: { email, password, fullName, ...({ referralCode: referralCode || undefined } as any) } },
      {
        onSuccess: () => setLocation("/login?registered=1"),
        onError: (err: any) => setError(err?.message || "Failed to create account. Please try again."),
      }
    );
  }

  const progress = ((step - 1) / (TOTAL_STEPS - 1)) * 100;

  return (
    <div className="min-h-screen bg-[#050A14] flex flex-col md:flex-row">
      {/* ── Left Brand Panel ── */}
      <div className="hidden md:flex md:w-[38%] bg-gradient-to-b from-[#050A14] via-[#060D18] to-[#050A14] flex-col items-center justify-center p-10 border-r border-white/5 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-amber-600/8 rounded-full blur-3xl" />
        <div className="relative z-10 w-full max-w-xs">
          <img src={logo} alt="Kuber Quant" className="h-20 w-20 object-contain mb-5 mx-auto" />
          <h1 className="text-3xl font-black text-white mb-1 text-center">
            Kuber <span className="text-amber-400">Quant</span>
          </h1>
          <p className="text-zinc-500 text-xs text-center mb-8 tracking-widest uppercase">Precision. Profit. Performance.</p>

          {/* Steps sidebar */}
          <div className="space-y-2">
            {STEPS.map(s => {
              const done = step > s.num;
              const active = step === s.num;
              return (
                <div key={s.num} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${active ? "bg-amber-500/10 border-amber-500/30" : done ? "bg-green-500/5 border-green-500/15" : "border-white/5 bg-white/[0.02]"}`}>
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-all ${active ? "bg-amber-500 text-black" : done ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-zinc-600"}`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : s.num}
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${active ? "text-amber-400" : done ? "text-green-400" : "text-zinc-600"}`}>
                      Step {s.num}
                    </p>
                    <p className={`text-sm font-bold ${active ? "text-white" : done ? "text-zinc-300" : "text-zinc-700"}`}>{s.label}</p>
                  </div>
                  {active && <ChevronRight className="h-4 w-4 text-amber-400 ml-auto" />}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-zinc-700 text-center mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-amber-500 hover:underline">Sign In</Link>
          </p>
        </div>
      </div>

      {/* ── Right Form Panel ── */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* Progress bar */}
        <div className="h-1 bg-white/5 sticky top-0 z-10">
          <motion.div className="h-full bg-gradient-to-r from-amber-400 to-yellow-600"
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>

        <div className="flex-1 flex items-start justify-center p-6 md:p-10">
          <div className="w-full max-w-lg py-6">
            {/* Mobile header */}
            <div className="flex items-center justify-between mb-6 md:hidden">
              <img src={logo} alt="Kuber Quant" className="h-9 w-9 object-contain" />
              <div className="flex gap-1.5">
                {STEPS.map(s => (
                  <div key={s.num} className={`h-1.5 rounded-full transition-all ${s.num <= step ? "bg-amber-500 w-8" : "bg-white/10 w-4"}`} />
                ))}
              </div>
            </div>

            {/* Step badge */}
            <div className="mb-6">
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs mb-3">
                Step {step} of {TOTAL_STEPS}
              </Badge>
              <h2 className="text-2xl font-black text-white">
                {step === 1 && "Create Your Account"}
                {step === 2 && "Your Profile"}
                {step === 3 && "Choose Services"}
                {step === 4 && "Review & Confirm"}
              </h2>
              <p className="text-zinc-500 text-sm mt-1">
                {step === 1 && "Fill in your basic account details to get started."}
                {step === 2 && "Tell us a bit more about yourself. (Optional — you can update this later.)"}
                {step === 3 && "Select the services you're interested in."}
                {step === 4 && "Review your information before submitting."}
              </p>
            </div>

            {error && (
              <Alert className="bg-red-500/10 border-red-500/30 text-red-400 mb-5">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}>

                {/* ── STEP 1: Account ── */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} required
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs uppercase tracking-wider">Mobile Number</Label>
                      <div className="flex gap-2">
                        <select value={phoneCode} onChange={e => setPhoneCode(e.target.value)}
                          className="h-11 rounded-md border border-white/10 bg-white/5 text-white text-sm px-2 focus:outline-none focus:ring-1 focus:ring-amber-500/50 w-24 shrink-0">
                          {COUNTRY_CODES.map(c => <option key={c.code + c.flag} value={c.code} className="bg-[#050A14]">{c.flag} {c.code}</option>)}
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input type="tel" placeholder="9876543210" value={phoneNum} onChange={e => setPhoneNum(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input type={showPw ? "text" : "password"} placeholder="Min. 8 characters" value={password}
                            onChange={e => setPassword(e.target.value)} required minLength={8}
                            className="pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                          <button type="button" onClick={() => setShowPw(v => !v)}
                            className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400 transition-colors">
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <PwStrengthBar password={password} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Confirm Password *</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input type={showConfirm ? "text" : "password"} placeholder="Re-enter password" value={confirmPw}
                            onChange={e => setConfirmPw(e.target.value)} required
                            className={`pl-9 pr-10 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 h-11 focus:border-amber-500/50 ${confirmPw && confirmPw !== password ? "border-red-500/50" : confirmPw && confirmPw === password ? "border-green-500/50" : ""}`} />
                          <button type="button" onClick={() => setShowConfirm(v => !v)}
                            className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400 transition-colors">
                            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPw && confirmPw === password && <p className="text-[11px] text-green-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Match</p>}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs uppercase tracking-wider">Referral Code <span className="text-zinc-600 normal-case">(optional)</span></Label>
                      <Input placeholder="Enter referral code" value={referralCode} onChange={e => setReferralCode(e.target.value.toUpperCase())}
                        className="bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11 uppercase tracking-widest font-mono" />
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                        <Checkbox id="terms" checked={agreeTerms} onCheckedChange={v => setAgreeTerms(!!v)}
                          className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 mt-0.5" />
                        <Label htmlFor="terms" className="text-zinc-400 text-xs leading-relaxed cursor-pointer">
                          I agree to the{" "}
                          <span className="text-amber-400 hover:underline cursor-pointer">Terms & Conditions</span>{" "}
                          and{" "}
                          <span className="text-amber-400 hover:underline cursor-pointer">Privacy Policy</span>
                        </Label>
                      </div>
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5">
                        <Checkbox id="risk" checked={agreeRisk} onCheckedChange={v => setAgreeRisk(!!v)}
                          className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 mt-0.5" />
                        <Label htmlFor="risk" className="text-zinc-400 text-xs leading-relaxed cursor-pointer">
                          I acknowledge and accept the{" "}
                          <span className="text-amber-400 hover:underline cursor-pointer">Risk Disclosure</span>{" "}
                          statement. Trading carries significant risk of loss.
                        </Label>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Profile ── */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="p-3 rounded-lg bg-blue-500/8 border border-blue-500/15 text-xs text-blue-300">
                      This information helps us personalise your experience. All fields except Country are optional and can be updated later in your profile.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Country *</Label>
                        <Select value={country} onValueChange={setCountry}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11 focus:border-amber-500/50">
                            <Globe className="h-4 w-4 text-zinc-600 mr-2" />
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050A14] border-white/10">
                            {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">City</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input placeholder="Your city" value={city} onChange={e => setCity(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-zinc-300 text-xs uppercase tracking-wider">Residential Address</Label>
                      <Input placeholder="Full address" value={address} onChange={e => setAddress(e.target.value)}
                        className="bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Occupation</Label>
                        <div className="relative">
                          <Briefcase className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" />
                          <Input placeholder="e.g. Business Owner" value={occupation} onChange={e => setOccupation(e.target.value)}
                            className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-zinc-700 focus:border-amber-500/50 h-11" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Annual Income</Label>
                        <Select value={income} onValueChange={setIncome}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                            <SelectValue placeholder="Select range" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050A14] border-white/10">
                            {INCOME_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Trading Experience</Label>
                        <Select value={experience} onValueChange={setExperience}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050A14] border-white/10">
                            {EXPERIENCE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-zinc-300 text-xs uppercase tracking-wider">Risk Appetite</Label>
                        <Select value={riskAppetite} onValueChange={setRiskAppetite}>
                          <SelectTrigger className="bg-white/5 border-white/10 text-white h-11">
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#050A14] border-white/10">
                            {RISK_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: Services ── */}
                {step === 3 && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-500">Select all that apply. You can subscribe to or unsubscribe from services at any time from your dashboard.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SERVICES.map(svc => {
                        const selected = services.includes(svc.id);
                        const Icon = svc.icon;
                        return (
                          <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                            className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${selected ? "bg-amber-500/10 border-amber-500/40" : "bg-white/[0.03] border-white/8 hover:border-white/15"}`}>
                            <div className={`p-2.5 rounded-lg shrink-0 ${selected ? "bg-amber-500/20" : "bg-white/5"}`}>
                              <Icon className={`h-5 w-5 ${selected ? "text-amber-400" : "text-zinc-500"}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${selected ? "text-amber-400" : "text-zinc-200"}`}>{svc.label}</p>
                              <p className="text-xs text-zinc-600">{svc.desc}</p>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? "bg-amber-500 border-amber-500" : "border-zinc-700"}`}>
                              {selected && <CheckCircle2 className="h-3 w-3 text-black" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-zinc-600 text-center pt-2">
                      {services.length === 0 ? "No services selected — you can choose after registration." : `${services.length} service${services.length > 1 ? "s" : ""} selected`}
                    </p>
                  </div>
                )}

                {/* ── STEP 4: Review ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <Card className="bg-white/[0.03] border-white/8">
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Account Details</p>
                        {[
                          { label: "Full Name",   value: fullName },
                          { label: "Email",       value: email },
                          { label: "Phone",       value: phone || "—" },
                          { label: "Referral",    value: referralCode || "None" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <span className="text-zinc-500">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="bg-white/[0.03] border-white/8">
                      <CardContent className="pt-5 pb-4 space-y-3">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Profile</p>
                        {[
                          { label: "Country",      value: country || "—" },
                          { label: "City",         value: city || "—" },
                          { label: "Risk Appetite",value: riskAppetite ? riskAppetite.split(" —")[0] : "—" },
                          { label: "Experience",   value: experience || "—" },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                            <span className="text-zinc-500">{label}</span>
                            <span className="text-white font-medium">{value}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="bg-white/[0.03] border-white/8">
                      <CardContent className="pt-5 pb-4">
                        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Selected Services</p>
                        {services.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {services.map(id => {
                              const svc = SERVICES.find(s => s.id === id);
                              return svc ? <Badge key={id} className="bg-amber-500/10 text-amber-400 border-amber-500/20">{svc.label}</Badge> : null;
                            })}
                          </div>
                        ) : <p className="text-sm text-zinc-600">No services selected</p>}
                      </CardContent>
                    </Card>

                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs text-amber-300/80 space-y-1">
                      <p className="font-semibold text-amber-400">What happens next?</p>
                      <p>• Your account will be created and a welcome email sent</p>
                      <p>• Complete KYC verification to unlock deposits and investments</p>
                      <p>• Your referral hierarchy will be set up automatically</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className={`flex gap-3 mt-8 ${step > 1 ? "justify-between" : "justify-end"}`}>
              {step > 1 && (
                <Button type="button" variant="outline" onClick={prevStep}
                  className="border-white/10 hover:bg-white/5 text-zinc-300 gap-2 px-6">
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button type="button" onClick={nextStep}
                  className="bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold gap-2 px-8">
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={registerMutation.isPending}
                  className="bg-gradient-to-r from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700 text-black font-bold gap-2 px-8">
                  {registerMutation.isPending ? "Creating account..." : <><CheckCircle2 className="h-4 w-4" /> Create Account</>}
                </Button>
              )}
            </div>

            <p className="text-xs text-zinc-600 text-center mt-5 md:hidden">
              Already have an account?{" "}
              <Link href="/login" className="text-amber-500 hover:underline">Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
