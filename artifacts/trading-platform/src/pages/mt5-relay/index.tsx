import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Activity, Clock, CheckCircle, XCircle, Send,
  TrendingUp, Briefcase, Info, ChevronRight, Shield
} from "lucide-react";
import {
  DEFAULT_MT5_RELAY_FORM_CONFIG,
  mergeMt5RelayFormConfig,
  type Mt5RelayFormConfig,
} from "@/lib/mt5-relay-form-config";
import { MtAccountCredentialsForm, EMPTY_MT_ACCOUNT, type MtAccountFormValues } from "@/components/forms/MtAccountCredentialsForm";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  if (!r.ok) { const j = await r.json().catch(() => ({ error: "Request failed" })); throw new Error(j.error || "Request failed"); }
  return r.json();
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  forwarded: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-amber-500/20 text-amber-400",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  forwarded: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  completed: TrendingUp,
};

const SERVICE_FEATURES = {
  copy_trading: {
    icon: Users,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    title: "Copy Trading",
    desc: "Automatically mirror trades from our expert traders to your MT4/MT5 account in real time.",
    features: [
      "Real-time trade mirroring on MT4 or MT5",
      "Choose from vetted expert signal traders",
      "Fully automated — no manual intervention needed",
      "Set profit-sharing terms that work for you",
      "Stop copying any time with one click",
    ],
  },
  account_handling: {
    icon: Briefcase,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    title: "Account Handling",
    desc: "Our institutional trading team manages your MT4/MT5 account using proven strategies.",
    features: [
      "Managed by our professional trading desk",
      "Institutional-grade risk management",
      "Supports both MT4 and MT5 accounts",
      "Transparent trade logs available 24/7",
      "Performance-based profit sharing — you only pay when you profit",
    ],
  },
};

export default function Mt5RelayPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formConfig, setFormConfig] = useState<Mt5RelayFormConfig>(DEFAULT_MT5_RELAY_FORM_CONFIG);
  const [selectedService, setSelectedService] = useState<"copy_trading" | "account_handling">("copy_trading");
  const [form, setForm] = useState({
    type: "copy_trading",
    profitSharingPercent: DEFAULT_MT5_RELAY_FORM_CONFIG.profitSharing.default,
    details: "",
  });
  const [mtCreds, setMtCreds] = useState<MtAccountFormValues>(EMPTY_MT_ACCOUNT);
  const [mtErrors, setMtErrors] = useState<Partial<Record<keyof MtAccountFormValues, string>>>({});

  useEffect(() => {
    Promise.all([
      apiFetch("/mt5-relay/my").catch(() => []),
      apiFetch("/mt5-relay/form-config").catch(() => DEFAULT_MT5_RELAY_FORM_CONFIG),
    ]).then(([reqs, cfg]) => {
      setRequests(reqs);
      const merged = mergeMt5RelayFormConfig(cfg);
      setFormConfig(merged);
      setForm(f => ({ ...f, profitSharingPercent: merged.profitSharing.default }));
    }).finally(() => setLoading(false));
  }, []);

  function selectService(service: "copy_trading" | "account_handling") {
    setSelectedService(service);
    setForm(f => ({ ...f, type: service }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const errs: Partial<Record<keyof MtAccountFormValues, string>> = {};
    if (formConfig.fields.accountNumber.enabled && formConfig.fields.accountNumber.required && !mtCreds.mtAccountNumber.trim()) {
      errs.mtAccountNumber = "Account number is required";
    }
    if (formConfig.fields.brokerName.enabled && formConfig.fields.brokerName.required && !mtCreds.mtBroker.trim()) {
      errs.mtBroker = "Broker is required";
    }
    if (formConfig.fields.serverName.enabled && formConfig.fields.serverName.required && !mtCreds.mtServer.trim()) {
      errs.mtServer = "Server is required";
    }
    if (formConfig.fields.tradingPassword?.enabled && formConfig.fields.tradingPassword.required) {
      if (!mtCreds.mtPassword || mtCreds.mtPassword.length < 4) errs.mtPassword = "Trading password is required";
    }
    if (Object.keys(errs).length) {
      setMtErrors(errs);
      return;
    }
    setMtErrors({});

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type: form.type,
        platform: mtCreds.mtPlatform,
        profitSharingPercent: form.profitSharingPercent,
        details: form.details,
        accountNumber: mtCreds.mtAccountNumber.trim(),
        brokerName: mtCreds.mtBroker.trim(),
        serverName: mtCreds.mtServer.trim(),
        tradingPassword: mtCreds.mtPassword,
      };

      const result = await apiFetch("/mt5-relay", { method: "POST", body: JSON.stringify(payload) });
      setRequests(r => [{ ...result }, ...r]);
      setForm(f => ({
        ...f,
        profitSharingPercent: formConfig.profitSharing.default,
        details: "",
      }));
      setMtCreds(EMPTY_MT_ACCOUNT);
      toast({ title: "Request submitted", description: "Our team will review and contact you within 24 hours." });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  const currentService = SERVICE_FEATURES[selectedService];
  const ServiceIcon = currentService.icon;

  return (
    <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            MT4/MT5 Account Handling
          </h1>
          <p className="text-muted-foreground mt-1">Request copy trading setup or managed account handling for your MT4/MT5 accounts.</p>
          <p className="text-muted-foreground mt-1">
            Professional account services for MetaTrader 4 and MetaTrader 5. Choose copy trading or full account management with flexible profit sharing.
          </p>
        </div>

        {/* Service Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["copy_trading", "account_handling"] as const).map(svc => {
            const s = SERVICE_FEATURES[svc];
            const Icon = s.icon;
            const isSelected = selectedService === svc;
            return (
              <button
                key={svc}
                onClick={() => selectService(svc)}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-amber-500/60 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-lg ${s.bg} border ${s.border} shrink-0`}>
                    <Icon className={`h-5 w-5 ${s.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${isSelected ? "text-amber-400" : "text-white"}`}>{s.title}</h3>
                      {isSelected && <Badge className="bg-amber-500/20 text-amber-400 text-xs">Selected</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
                    <ul className="mt-2 space-y-1">
                      {s.features.slice(0, 3).map(f => (
                        <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? "text-amber-400 rotate-90" : "text-muted-foreground"}`} />
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Request Form */}
          <Card className="lg:col-span-3 bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-md ${currentService.bg}`}>
                  <ServiceIcon className={`h-4 w-4 ${currentService.color}`} />
                </div>
                <CardTitle className="text-base">{currentService.title} — Request Form</CardTitle>
              </div>
              <CardDescription>Fill in your details and preferred profit-sharing terms.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {(formConfig.fields.platform.enabled ||
                  formConfig.fields.accountNumber.enabled ||
                  formConfig.fields.brokerName.enabled ||
                  formConfig.fields.serverName.enabled ||
                  formConfig.fields.tradingPassword?.enabled) && (
                  <MtAccountCredentialsForm
                    values={mtCreds}
                    onChange={(k, v) => setMtCreds(prev => ({ ...prev, [k]: v }))}
                    showDeferOption={false}
                    required={
                      formConfig.fields.accountNumber.required ||
                      formConfig.fields.brokerName.required ||
                      formConfig.fields.serverName.required ||
                      !!formConfig.fields.tradingPassword?.required
                    }
                    hideHeader
                    errors={mtErrors}
                  />
                )}

                {formConfig.profitSharing.enabled && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                        {formConfig.profitSharing.label}
                        {formConfig.profitSharing.required && <span className="text-red-400 ml-1">*</span>}
                      </Label>
                      <span className="text-2xl font-bold text-amber-400">{form.profitSharingPercent}%</span>
                    </div>
                    <Slider
                      value={[form.profitSharingPercent]}
                      onValueChange={([v]) => setForm(f => ({ ...f, profitSharingPercent: v }))}
                      min={formConfig.profitSharing.min}
                      max={formConfig.profitSharing.max}
                      step={formConfig.profitSharing.step}
                      className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:bg-amber-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formConfig.profitSharing.min}% (Min)</span>
                      <span>{formConfig.profitSharing.max}% (Max)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">You Keep</p>
                        <p className="text-xl font-bold text-green-400">{100 - form.profitSharingPercent}%</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Kuber Quant</p>
                        <p className="text-xl font-bold text-amber-400">{form.profitSharingPercent}%</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>Performance fee applies to net profits only. No monthly fees. You keep losses — we only earn when you do.</span>
                    </div>
                  </div>
                )}

                {formConfig.fields.details.enabled && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                      {formConfig.fields.details.label}
                      {formConfig.fields.details.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    <Textarea
                      placeholder={
                        selectedService === "copy_trading"
                          ? formConfig.copyTradingDetailsPlaceholder
                          : formConfig.accountHandlingDetailsPlaceholder
                      }
                      value={form.details}
                      onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                      className="bg-white/5 border-white/10 min-h-[90px]"
                      required={formConfig.fields.details.required}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold h-12 text-sm"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : `Submit ${currentService.title} Request`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* How it Works */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { step: "1", title: "Submit Request", desc: "Choose your service and fill in your preferences." },
                  { step: "2", title: "Team Review (24h)", desc: "Our trading desk reviews and contacts you to confirm details." },
                  { step: "3", title: "Account Connected", desc: "We connect your MT4/MT5 account and begin operations." },
                  { step: "4", title: "Track Performance", desc: "Monitor your account live via the dashboard." },
                ].map(item => (
                  <div key={item.step} className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold shrink-0 mt-0.5">
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* My Requests */}
            <div>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">My Requests</h2>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-28 w-full mb-3" />)
              ) : requests.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-6 text-center">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs">No requests yet. Submit your first request above.</p>
                </Card>
              ) : requests.map(r => {
                const StatusIcon = STATUS_ICONS[r.status] || Clock;
                const isCopyTrading = r.type === "copy_trading";
                return (
                  <Card key={r.id} className="bg-white/5 border-white/10 mb-3">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCopyTrading
                            ? <Users className="h-4 w-4 text-blue-400" />
                            : <Briefcase className="h-4 w-4 text-purple-400" />}
                          <span className="font-medium text-sm">
                            {isCopyTrading ? "Copy Trading" : "Account Handling"}
                          </span>
                        </div>
                        <Badge className={`text-xs flex items-center gap-1 ${STATUS_COLORS[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                          <StatusIcon className="h-3 w-3" />
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
                          <p className="text-[10px] text-muted-foreground">Your Share</p>
                          <p className="text-base font-bold text-green-400">{100 - r.profitSharingPercent}%</p>
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 border border-white/5 text-center">
                          <p className="text-[10px] text-muted-foreground">Platform</p>
                          <p className="text-base font-bold text-amber-400">{r.profitSharingPercent}%</p>
                        </div>
                      </div>

                      {r.details && <p className="text-xs text-muted-foreground line-clamp-2">{r.details}</p>}
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
);
}
