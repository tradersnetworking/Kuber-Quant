import { useState, useEffect, useMemo } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Users, Activity, Clock, CheckCircle, XCircle, Send,
  TrendingUp, Briefcase, Info, Shield
} from "lucide-react";
import {
  DEFAULT_MT5_RELAY_FORM_CONFIG,
  mergeMt5RelayFormConfig,
  type Mt5RelayFormConfig,
} from "@/lib/mt5-relay-form-config";
import { MtAccountCredentialsForm, EMPTY_MT_ACCOUNT, type MtAccountFormValues } from "@/components/forms/MtAccountCredentialsForm";
import { TradingServiceDepositBanner } from "@/components/wallet/TradingServiceDepositBanner";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_CHART_GRID, APP_FORM_GRID } from "@/lib/ui-system";
import { cn } from "@/lib/utils";
import { authFetchJson } from "@/lib/token-store";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  forwarded: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  accepted: "bg-green-500/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
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
    color: "text-blue-600 dark:text-blue-400",
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
    color: "text-purple-600 dark:text-purple-400",
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
  const { user } = useAuth();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = user?.fullName || "Investor";
  const useListMt5Accounts = (ApiHooks as any).useListMt5Accounts;
  const { data: mtAccounts } = useListMt5Accounts ? useListMt5Accounts() : { data: [] };
  const mt5BookedProfit = useMemo(
    () => (mtAccounts ?? []).reduce((sum: number, a: any) => sum + Math.max(0, Number(a.profit) || 0), 0),
    [mtAccounts],
  );
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
      authFetchJson<any[]>("/mt5-relay/my").catch(() => []),
      authFetchJson<Partial<Mt5RelayFormConfig>>("/mt5-relay/form-config").catch(() => DEFAULT_MT5_RELAY_FORM_CONFIG),
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
      toast({
        title: "Please complete the form",
        description: Object.values(errs)[0] || "Fill in all required MT account fields.",
        variant: "destructive",
      });
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

      const result = await authFetchJson<Record<string, unknown>>("/mt5-relay", { method: "POST", body: JSON.stringify(payload) });
      setRequests(r => [{ ...result }, ...r]);
      setForm(f => ({
        ...f,
        profitSharingPercent: formConfig.profitSharing.default,
        details: "",
      }));
      setMtCreds(EMPTY_MT_ACCOUNT);
      toast({ title: "Request submitted", description: "Our team will review and contact you within 24 hours." });
    } catch (e: any) {
      const message = e.message || "Request failed";
      toast({
        title: "Submission failed",
        description: message,
        variant: "destructive",
      });
    } finally { setSubmitting(false); }
  }

  const currentService = SERVICE_FEATURES[selectedService];
  const ServiceIcon = currentService.icon;

  return (
    <AppPage
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          MT4/MT5 Account Handling
        </h1>
      }
      subtitle="Request copy trading setup or managed account handling for your MT4/MT5 accounts."
    >
      <p className="text-sm text-muted-foreground -mt-2 break-words">
        Professional account services for MetaTrader 4 and MetaTrader 5. Choose copy trading or full account management with flexible profit sharing.
      </p>

      <TradingServiceDepositBanner compact />

        {mt5BookedProfit > 0 && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">MT account handling profits booked</p>
              <p className="text-xs text-muted-foreground">Linked MT4/MT5 account performance</p>
            </div>
            <ProfitShareButton
              userName={userName}
              referralCode={referralCode}
              payload={{
                service: "mt5_handling",
                profitAmount: mt5BookedProfit,
                currency: "USD",
                detailLabel: "MT4/MT5 Account Handling",
              }}
              label="Share Profit"
            />
          </div>
        )}

        {/* Service type — tab selector (no expand arrows) */}
        <div className="space-y-3 min-w-0">
          <p className="text-sm font-medium text-foreground">Select service type</p>
          <Tabs
            value={selectedService}
            onValueChange={v => selectService(v as "copy_trading" | "account_handling")}
          >
            <TabsList className="grid w-full grid-cols-2 h-auto gap-2 p-1.5 bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 rounded-xl">
              {(["copy_trading", "account_handling"] as const).map(svc => {
                const s = SERVICE_FEATURES[svc];
                const Icon = s.icon;
                return (
                  <TabsTrigger
                    key={svc}
                    value={svc}
                    className={`flex items-center justify-center gap-2 py-3 px-2 rounded-lg border border-transparent min-w-0 transition-colors data-[state=active]:shadow-sm ${
                      svc === "copy_trading"
                        ? "data-[state=active]:bg-blue-500/15 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:border-blue-500/40"
                        : "data-[state=active]:bg-purple-500/15 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/40"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
                    <span className="font-semibold text-sm truncate">{s.title}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>

          <Card className={`border ${currentService.border} ${currentService.bg}`}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg bg-background/60 dark:bg-black/20 border ${currentService.border} shrink-0`}>
                  <ServiceIcon className={`h-5 w-5 ${currentService.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className={`font-semibold ${currentService.color}`}>{currentService.title}</h3>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-current/30">
                      Selected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{currentService.desc}</p>
                </div>
              </div>
              <ul className={cn(APP_CHART_GRID, "gap-2 pt-1 border-t border-border/60 dark:border-white/10")}>
                {currentService.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground min-w-0">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
                    <span className="break-words">{f}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 min-w-0">
          {/* Request Form */}
          <Card className={cn(APP_CARD, "lg:col-span-3")}>
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
              <form onSubmit={handleSubmit} className="space-y-5 pb-[calc(var(--mobile-bottom-nav-height)+0.5rem)] md:pb-0">
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
                      <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{form.profitSharingPercent}%</span>
                    </div>
                    <Slider
                      value={[form.profitSharingPercent]}
                      onValueChange={([v]) => setForm(f => ({ ...f, profitSharingPercent: v }))}
                      min={formConfig.profitSharing.min}
                      max={formConfig.profitSharing.max}
                      step={1}
                      className="[&_[role=slider]]:border-amber-500 [&_[role=slider]]:bg-amber-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{formConfig.profitSharing.min}% (Min)</span>
                      <span>{formConfig.profitSharing.max}% (Max)</span>
                    </div>
                    <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 min-w-0">
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">You Keep</p>
                        <p className="text-xl font-bold text-green-700 dark:text-green-400">{100 - form.profitSharingPercent}%</p>
                      </div>
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-center">
                        <p className="text-[10px] text-muted-foreground uppercase mb-1">Kuber Quant</p>
                        <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{form.profitSharingPercent}%</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
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
                      className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[90px]"
                      required={formConfig.fields.details.required}
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  size="wrap"
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold min-h-12 inline-flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4 shrink-0" />
                  <span className="min-w-0">{submitting ? "Submitting..." : `Submit ${currentService.title} Request`}</span>
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* How it Works */}
            <Card className={APP_CARD}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  How It Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {[
                  { step: "1", title: "Submit Request", desc: "Choose your service and fill in your preferences." },
                  { step: "2", title: "Team Review (24h)", desc: "Our trading desk reviews and contacts you to confirm details." },
                  { step: "3", title: "Account Connected", desc: "We connect your MT4/MT5 account and begin operations." },
                  { step: "4", title: "Track Performance", desc: "Monitor your account live via the dashboard." },
                ].map(item => (
                  <div key={item.step} className="flex gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 text-xs font-bold shrink-0 mt-0.5">
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
                <Card className={cn(APP_CARD, "p-6 text-center")}>
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-xs">No requests yet. Submit your first request above.</p>
                </Card>
              ) : requests.map(r => {
                const StatusIcon = STATUS_ICONS[r.status] || Clock;
                const isCopyTrading = r.type === "copy_trading";
                return (
                  <Card key={r.id} className={cn(APP_CARD, "mb-3")}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isCopyTrading
                            ? <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            : <Briefcase className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                          <span className="font-medium text-sm">
                            {isCopyTrading ? "Copy Trading" : "Account Handling"}
                          </span>
                        </div>
                        <Badge className={`text-xs flex items-center gap-1 ${STATUS_COLORS[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                          <StatusIcon className="h-3 w-3" />
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 xs:grid-cols-2 gap-2 min-w-0">
                        <div className="bg-muted dark:bg-black/30 rounded-lg p-2 border border-border/80 dark:border-white/5 text-center">
                          <p className="text-[10px] text-muted-foreground">Your Share</p>
                          <p className="text-base font-bold text-green-700 dark:text-green-400">{100 - r.profitSharingPercent}%</p>
                        </div>
                        <div className="bg-muted dark:bg-black/30 rounded-lg p-2 border border-border/80 dark:border-white/5 text-center">
                          <p className="text-[10px] text-muted-foreground">Platform</p>
                          <p className="text-base font-bold text-amber-600 dark:text-amber-400">{r.profitSharingPercent}%</p>
                        </div>
                      </div>

                      {r.details && <p className="text-xs text-muted-foreground line-clamp-2">{r.details}</p>}
                      {r.status === "completed" && mt5BookedProfit > 0 && (
                        <ProfitShareButton
                          userName={userName}
                          referralCode={referralCode}
                          className="w-full"
                          label="Share Profit"
                          payload={{
                            service: "mt5_handling",
                            profitAmount: mt5BookedProfit,
                            currency: "USD",
                            detailLabel: isCopyTrading ? "Copy Trading Request" : "Account Handling Request",
                          }}
                        />
                      )}
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
    </AppPage>
  );
}
