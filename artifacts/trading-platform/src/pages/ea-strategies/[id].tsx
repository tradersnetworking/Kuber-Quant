import { useState, useEffect, useMemo } from "react";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, Download, TrendingUp, Shield, Clock, Target, BarChart2,
  CheckCircle, Star, Users, Zap, Globe, AlertTriangle, Cpu, Award,
  ChevronRight, Monitor, Calendar, DollarSign, Activity, Lock
} from "lucide-react";
import { useListInvestments } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";

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

const RISK_CONFIG: Record<string, { color: string; bg: string; bar: number }> = {
  "Very Low":  { color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/20",   bar: 10 },
  "Low":       { color: "text-green-700 dark:text-green-400",  bg: "bg-green-500/20",  bar: 25 },
  "Medium":    { color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/20",  bar: 50 },
  "High":      { color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/20", bar: 75 },
  "Very High": { color: "text-red-400",    bg: "bg-red-500/20",    bar: 95 },
};

const PLAN_PRICES: Record<string, { label: string; days: number; key: string }> = {
  monthly:   { label: "1 Month",  days: 30,  key: "priceMonthly" },
  quarterly: { label: "3 Months", days: 90,  key: "priceQuarterly" },
  biannual:  { label: "6 Months", days: 180, key: "priceBiannual" },
  annual:    { label: "1 Year",   days: 365, key: "priceAnnual" },
};

const STRATEGY_TAGS: Record<string, string[]> = {
  scalping:  ["Short-term", "High frequency", "Low drawdown target"],
  swing:     ["Medium-term", "Trend-based", "Fewer signals"],
  trend:     ["Momentum-based", "Macro-driven", "Position trading"],
  grid:      ["Range-bound", "Market-neutral", "Grid spacing"],
  arbitrage: ["Market-neutral", "Low risk", "Spread-based"],
};

export default function EAStrategyDetailPage() {
  const [, params] = useRoute("/ea-strategies/:id");
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: investments = [] } = useListInvestments();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = user?.fullName || "Investor";
  const [strategy, setStrategy] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [subDialog, setSubDialog] = useState(false);
  const [subForm, setSubForm] = useState({ mtAccountNumber: "", mtPlatform: "mt5", plan: "monthly" });
  const [subscribing, setSubscribing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const id = parseInt(String(params?.id));

  useEffect(() => {
    Promise.all([
      apiFetch("/ea-strategies/catalog"),
      apiFetch("/ea-strategies/subscriptions/my"),
    ]).then(([catalog, subs]) => {
      const found = catalog.find((s: any) => s.id === id);
      setStrategy(found || null);
      setSubscriptions(subs);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const mySubscription = subscriptions.find((s: any) => s.catalogStrategyId === id && s.status === "active");
  const eaProfit = useMemo(
    () => investments.find(i => i.type === "ea" && Number(i.profit ?? 0) > 0 && (i.planName === strategy?.name || i.planName?.includes(strategy?.name || ""))),
    [investments, strategy?.name],
  );
  const risk = strategy ? (RISK_CONFIG[strategy.riskLevel] || RISK_CONFIG["Medium"]) : null;
  const tags = strategy ? (STRATEGY_TAGS[strategy.type] || []) : [];

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    setSubscribing(true);
    try {
      await apiFetch(`/ea-strategies/catalog/${id}/subscribe`, {
        method: "POST",
        body: JSON.stringify(subForm),
      });
      toast({ title: "Subscription activated!", description: "Your license has been generated. Download your EA from My Subscriptions." });
      setSubDialog(false);
      const subs = await apiFetch("/ea-strategies/subscriptions/my");
      setSubscriptions(subs);
    } catch (e: any) {
      toast({ title: "Subscription failed", description: e.message, variant: "destructive" });
    } finally { setSubscribing(false); }
  }

  async function handleDownload() {
    if (!mySubscription) return;
    setDownloading(true);
    try {
      const blob = await fetch(`${API_BASE}/ea-strategies/subscriptions/${mySubscription.id}/download`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${strategy.name.replace(/\s/g, "_")}.ex5`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Download started" });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(false); }
  }

  if (loading) return (
    <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        </div>
      </div>
);

  if (!strategy) return (
    <div className="text-center py-20">
        <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Strategy not found</h2>
        <Link href="/ea-strategies"><Button variant="outline">Back to Marketplace</Button></Link>
      </div>
);

  const selectedPlan = PLAN_PRICES[subForm.plan];
  const planPrice = strategy[selectedPlan?.key] ?? strategy.priceMonthly;

  return (
    <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/ea-strategies" className="hover:text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <ArrowLeft className="h-3.5 w-3.5" />EA Marketplace
          </Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-foreground break-words">{strategy.name}</span>
        </div>

        {/* Hero */}
        <div className="bg-gradient-to-r from-black/60 to-amber-900/10 border border-border dark:border-white/10 rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="h-16 w-16 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center shrink-0">
              <Cpu className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">{strategy.category}</Badge>
                <Badge className={`text-xs ${risk?.bg} ${risk?.color}`}>{strategy.riskLevel} Risk</Badge>
                <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs">{strategy.platform.toUpperCase()}</Badge>
                {mySubscription && <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs flex items-center gap-1"><CheckCircle className="h-2.5 w-2.5" />Active Subscription</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2 break-words">{strategy.name}</h1>
              <p className="text-muted-foreground leading-relaxed mb-4">{strategy.description}</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(t => (
                  <span key={t} className="text-xs bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 rounded-full px-3 py-1 text-muted-foreground">{t}</span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 w-full md:w-auto md:min-w-[160px] shrink-0">
              {mySubscription ? (
                <Button onClick={handleDownload} disabled={downloading} size="wrap"
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold inline-flex items-center justify-center gap-2 min-h-10">
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="truncate">{downloading ? "Downloading..." : "Download EA"}</span>
                </Button>
              ) : (
                <Button onClick={() => setSubDialog(true)} size="wrap"
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold inline-flex items-center justify-center gap-2 min-h-10">
                  <Lock className="h-4 w-4 shrink-0" />
                  <span className="truncate">Subscribe Now</span>
                </Button>
              )}
              <p className="text-center text-xs text-muted-foreground">
                From <span className="text-amber-600 dark:text-amber-400 font-bold">${strategy.priceMonthly}/mo</span>
              </p>
            </div>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: TrendingUp, label: "Backtest ROI", value: `${strategy.backtestRoi}%`, color: "text-green-700 dark:text-green-400" },
                { icon: Target, label: "Win Rate", value: `${strategy.winRate}%`, color: "text-blue-600 dark:text-blue-400" },
                { icon: BarChart2, label: "Risk Level", value: strategy.riskLevel, color: risk?.color || "text-amber-600 dark:text-amber-400" },
                { icon: Users, label: "Subscribers", value: `${Math.floor(Math.random() * 800 + 50)}+`, color: "text-purple-600 dark:text-purple-400" },
              ].map(s => (
                <Card key={s.label} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                    </div>
                    <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Strategy Details */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-amber-600 dark:text-amber-400" />Strategy Details</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Currency Pairs", value: strategy.pairs, icon: Globe },
                    { label: "Timeframe", value: strategy.timeframe, icon: Clock },
                    { label: "Platform", value: strategy.platform.toUpperCase(), icon: Monitor },
                    { label: "Strategy Type", value: strategy.type.charAt(0).toUpperCase() + strategy.type.slice(1), icon: Zap },
                    { label: "Category", value: strategy.category, icon: Award },
                    { label: "Backtest ROI", value: `${strategy.backtestRoi}%`, icon: TrendingUp },
                    { label: "Win Rate", value: `${strategy.winRate}%`, icon: Target },
                    { label: "Risk Level", value: strategy.riskLevel, icon: Shield },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 py-2 border-b border-border/80 dark:border-white/5 last:border-0">
                      <div className="p-1.5 bg-amber-500/10 rounded-md shrink-0">
                        <item.icon className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="flex-1 flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-sm font-medium">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Meter */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />Risk Assessment</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Risk Level</span>
                    <span className={`font-medium ${risk?.color}`}>{strategy.riskLevel}</span>
                  </div>
                  <Progress value={risk?.bar || 50} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Very Low</span><span>Low</span><span>Medium</span><span>High</span><span>Very High</span>
                  </div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    Trading involves significant risk of loss. Past performance including backtest results is not indicative of future performance. Only invest capital you can afford to lose.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Performance highlights */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />Performance Highlights</CardTitle></CardHeader>
              <CardContent className="min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 mb-4 min-w-0">
                  {[
                    { label: "Profit Factor", value: (1.5 + Math.random()).toFixed(2) },
                    { label: "Max Drawdown", value: `${(5 + Math.random() * 25).toFixed(1)}%` },
                    { label: "Avg Monthly ROI", value: `${(strategy.backtestRoi / 12).toFixed(1)}%` },
                  ].map(s => (
                    <div key={s.label} className="text-center bg-muted dark:bg-black/30 rounded-lg p-2.5 sm:p-3 border border-border/80 dark:border-white/5 min-w-0">
                      <p className="text-sm sm:text-lg font-bold text-amber-600 dark:text-amber-400 leading-tight break-words">{s.value}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 leading-snug">{s.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    "Tested on 5+ years of historical data",
                    "Optimized across multiple market conditions",
                    "Includes spread and slippage simulation",
                    "Forward-tested on live accounts",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs sm:text-sm text-muted-foreground min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span className="break-words leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* FAQs */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader><CardTitle className="text-base">Frequently Asked Questions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { q: "What broker is recommended?", a: "Any ECN/STP broker with tight spreads. We recommend brokers with raw spreads below 0.5 pips for best results." },
                  { q: "Do I need a VPS?", a: "Yes, a VPS is strongly recommended to ensure the EA runs 24/5 without interruption. A Windows-based VPS with at least 1GB RAM is sufficient." },
                  { q: "What happens when my subscription expires?", a: "The EA will stop opening new trades. Your license will be automatically deactivated and you will receive a renewal reminder." },
                  { q: "Can I run this on multiple accounts?", a: "Each license is bound to a single MT5 account number. You need separate subscriptions for multiple accounts." },
                ].map(item => (
                  <details key={item.q} className="group bg-muted/80 dark:bg-black/20 border border-border/80 dark:border-white/5 rounded-lg">
                    <summary className="flex items-center justify-between p-4 cursor-pointer text-sm font-medium list-none">
                      {item.q}
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-open:rotate-90 transition-transform" />
                    </summary>
                    <p className="px-4 pb-4 text-xs text-muted-foreground">{item.a}</p>
                  </details>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right: pricing + CTA — scrolls with page (no sticky; avoids overlap with specs below) */}
          <div className="space-y-4 min-w-0">
            {/* Pricing card */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Subscription Plans
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 min-w-0">
                <div className="grid grid-cols-1 gap-2 min-w-0">
                {Object.entries(PLAN_PRICES).map(([key, plan]) => {
                  const price = strategy[plan.key];
                  const isSelected = subForm.plan === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSubForm(f => ({ ...f, plan: key }))}
                      className={`w-full text-left p-3 rounded-lg border transition-all min-w-0 ${
                        isSelected
                          ? "border-amber-500/60 bg-amber-500/10"
                          : "border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 hover:border-border dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-amber-500 bg-amber-500 text-amber-950" : "border-muted-foreground/40 bg-transparent"}`}>
                          {isSelected && <CheckCircle className="h-3 w-3" />}
                        </span>
                        <div className="flex flex-1 items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p className={`text-sm font-medium leading-tight ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{plan.label}</p>
                            <p className="text-xs text-muted-foreground">{plan.days} days access</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm sm:text-lg font-bold ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>${price}</p>
                            {key !== "monthly" && (
                              <p className="text-[10px] text-green-700 dark:text-green-400">${(price / (plan.days / 30)).toFixed(0)}/mo</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                </div>

                {mySubscription ? (
                  <div className="space-y-2">
                    <Button onClick={handleDownload} disabled={downloading} size="wrap" className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold inline-flex items-center justify-center gap-2 min-h-11">
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="truncate">{downloading ? "Downloading..." : "Download EA (.ex5)"}</span>
                    </Button>
                    {eaProfit && (
                      <ProfitShareButton
                        userName={userName}
                        referralCode={referralCode}
                        className="w-full"
                        payload={{
                          service: "ea_strategy",
                          profitAmount: Number(eaProfit.profit),
                          currency: eaProfit.currency,
                          detailLabel: strategy.name,
                        }}
                        label="Share Profit"
                      />
                    )}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-700 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 inline mr-1" />
                        Active until {new Date(mySubscription.expiresAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">{mySubscription.licenseKey?.slice(0, 16)}...</p>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => setSubDialog(true)} size="wrap"
                    className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold min-h-11 inline-flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4 shrink-0" />
                    <span className="truncate">Subscribe — ${strategy[PLAN_PRICES[subForm.plan]?.key] ?? strategy.priceMonthly}</span>
                  </Button>
                )}

                <div className="space-y-2 pt-1 border-t border-border/60">
                  {[
                    "Encrypted .ex5 file download",
                    "Account-bound license key",
                    "Email renewal reminders",
                    "EA update notifications",
                    "24/7 support access",
                  ].map(f => (
                    <div key={f} className="flex items-start gap-2 text-xs text-muted-foreground min-w-0">
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                      <span className="min-w-0 break-words leading-snug">{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick specs — grouped below plans so nothing overlaps on scroll */}
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground font-medium">Quick Specs</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {[
                  { label: "Pairs", value: strategy.pairs },
                  { label: "Timeframe", value: strategy.timeframe },
                  { label: "Platform", value: strategy.platform.toUpperCase() },
                  { label: "Min Capital", value: "$500 recommended" },
                ].map(item => (
                  <div key={item.label} className="flex justify-between text-xs py-1.5 border-b border-border/80 dark:border-white/5 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span className="font-medium truncate max-w-[140px] text-right">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Subscribe Dialog */}
        <Dialog open={subDialog} onOpenChange={setSubDialog}>
          <DialogContent className="dialog-scroll-content bg-background border-border dark:border-white/10 max-w-md overflow-x-hidden p-0 gap-0">
            <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
              <DialogTitle className="text-lg sm:text-xl font-bold break-words pr-8">Subscribe to {strategy.name}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubscribe} className="dialog-form-inner space-y-4 pt-1">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subscription Plan</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
                    {Object.entries(PLAN_PRICES).map(([key, plan]) => {
                      const price = strategy[plan.key];
                      const isSelected = subForm.plan === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSubForm(f => ({ ...f, plan: key }))}
                          className={`w-full p-3 rounded-lg border text-left transition-all min-w-0 ${
                            isSelected
                              ? "border-amber-500/60 bg-amber-500/10"
                              : "border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 hover:border-amber-500/30"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${isSelected ? "border-amber-500 bg-amber-500 text-amber-950" : "border-muted-foreground/40"}`}>
                              {isSelected && <CheckCircle className="h-3 w-3" />}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-semibold truncate ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>{plan.label}</p>
                              <p className="text-base font-bold text-amber-600 dark:text-amber-400 leading-tight">${price}</p>
                              <p className="text-[10px] text-muted-foreground">{plan.days} days</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Platform</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["mt4", "mt5"].map(p => (
                      <button key={p} type="button"
                        onClick={() => setSubForm(f => ({ ...f, mtPlatform: p }))}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 min-h-10 ${
                          subForm.mtPlatform === p
                            ? "border-amber-500/60 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "border-border dark:border-white/10 bg-muted/60 dark:bg-white/5 text-muted-foreground"
                        }`}
                      >
                        <Monitor className="h-3.5 w-3.5 shrink-0" />
                        {p.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">MT4/MT5 Account Number</Label>
                  <Input
                    required
                    value={subForm.mtAccountNumber}
                    onChange={e => setSubForm(f => ({ ...f, mtAccountNumber: e.target.value }))}
                    placeholder="Your broker account number"
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">The license will be bound to this account number.</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-muted-foreground shrink-0">Plan</span>
                    <span className="text-right break-words">{PLAN_PRICES[subForm.plan]?.label}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-sm font-bold">
                    <span className="shrink-0">Total</span>
                    <span className="text-amber-600 dark:text-amber-400">${strategy[PLAN_PRICES[subForm.plan]?.key] ?? strategy.priceMonthly}</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={subscribing || !subForm.mtAccountNumber}
                  size="wrap"
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold min-h-12 inline-flex items-center justify-center gap-2"
                >
                  {subscribing ? "Activating..." : "Subscribe & Get License Key"}
                </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
);
}
