import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Cpu, Zap, Key, Clock, CheckCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { MtAccountCredentialsForm, EMPTY_MT_ACCOUNT, type MtAccountFormValues } from "@/components/forms/MtAccountCredentialsForm";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({ error: "Request failed" }));
    throw new Error(j.error || "Request failed");
  }
  return r.json();
}

const RISK_COLORS: Record<string, string> = {
  "Very Low": "bg-blue-500/20 text-blue-300",
  "Low": "bg-green-500/20 text-green-400",
  "Medium": "bg-amber-500/20 text-amber-400",
  "High": "bg-orange-500/20 text-orange-400",
  "Very High": "bg-red-500/20 text-red-400",
};

const TYPE_COLORS: Record<string, string> = {
  scalping: "bg-purple-500/20 text-purple-400",
  swing: "bg-blue-500/20 text-blue-400",
  trend: "bg-green-500/20 text-green-400",
  grid: "bg-amber-500/20 text-amber-400",
  arbitrage: "bg-cyan-500/20 text-cyan-400",
};

const PLAN_LABELS: Record<string, { label: string; days: string }> = {
  monthly: { label: "1 Month", days: "30 days" },
  quarterly: { label: "3 Months", days: "90 days" },
  biannual: { label: "6 Months", days: "180 days" },
  annual: { label: "1 Year", days: "365 days" },
};

export default function EAStrategiesPage() {
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("catalog");
  const [filterType, setFilterType] = useState("all");
  const [filterRisk, setFilterRisk] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [subDialog, setSubDialog] = useState<{ open: boolean; strategy: any | null }>({ open: false, strategy: null });
  const [subForm, setSubForm] = useState({ plan: "monthly" });
  const [mtCreds, setMtCreds] = useState<MtAccountFormValues>(EMPTY_MT_ACCOUNT);
  const [mtErrors, setMtErrors] = useState<Partial<Record<keyof MtAccountFormValues, string>>>({});
  const [subscribing, setSubscribing] = useState(false);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    apiFetch("/ea-strategies/catalog").then(setCatalog).catch(() => {});
    apiFetch("/ea-strategies/subscriptions/my").then(setSubscriptions).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const categories = Array.from(new Set(catalog.map((s: any) => s.category))).sort() as string[];
  const types = ["scalping", "swing", "trend", "grid", "arbitrage"];
  const risks = ["Very Low", "Low", "Medium", "High", "Very High"];

  const filtered = catalog.filter((s: any) => {
    if (filterType !== "all" && s.type !== filterType) return false;
    if (filterCat !== "all" && s.category !== filterCat) return false;
    if (filterRisk !== "all" && s.riskLevel !== filterRisk) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !s.pairs.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  async function handleSubscribe() {
    const errs: Partial<Record<keyof MtAccountFormValues, string>> = {};
    if (!mtCreds.mtAccountNumber.trim()) errs.mtAccountNumber = "Account number is required";
    if (!mtCreds.mtBroker.trim()) errs.mtBroker = "Broker is required";
    if (!mtCreds.mtServer.trim()) errs.mtServer = "Server is required";
    if (!mtCreds.mtPassword || mtCreds.mtPassword.length < 4) errs.mtPassword = "Trading password is required";
    if (Object.keys(errs).length) { setMtErrors(errs); return; }
    setMtErrors({});
    setSubscribing(true);
    try {
      const result = await apiFetch(`/ea-strategies/catalog/${subDialog.strategy.id}/subscribe`, {
        method: "POST", body: JSON.stringify({
          plan: subForm.plan,
          accountNumber: mtCreds.mtAccountNumber.trim(),
          brokerName: mtCreds.mtBroker.trim(),
          serverName: mtCreds.mtServer.trim(),
          platform: mtCreds.mtPlatform,
          tradingPassword: mtCreds.mtPassword,
        }),
      });
      setSubscriptions(subs => [...subs, result]);
      setSubDialog({ open: false, strategy: null });
      toast({ title: "Subscribed!", description: `License: ${result.licenseKey}` });
      setTab("subscriptions");
    } catch (e: any) {
      toast({ title: "Subscription failed", description: e.message, variant: "destructive" });
    } finally { setSubscribing(false); }
  }

  async function handleDownload(sub: any) {
    setDownloading(sub.id);
    try {
      const r = await fetch(`${API_BASE}/ea-strategies/subscriptions/${sub.id}/download`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!r.ok) { const j = await r.json().catch(() => ({ error: "Download failed" })); throw new Error(j.error); }
      const blob = await r.blob();
      const disposition = r.headers.get("Content-Disposition") || "";
      const nameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = nameMatch?.[1] || `KuberQuant_EA_${sub.mtAccountNumber}.ex5`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      setSubscriptions(subs => subs.map(s => s.id === sub.id ? { ...s, downloadCount: (s.downloadCount || 0) + 1 } : s));
      toast({ title: "Download started", description: filename });
    } catch (e: any) {
      toast({ title: "Download failed", description: e.message, variant: "destructive" });
    } finally { setDownloading(null); }
  }

  const planPrice = (s: any, plan: string) => ({ monthly: s.priceMonthly, quarterly: s.priceQuarterly, biannual: s.priceBiannual, annual: s.priceAnnual }[plan] || s.priceMonthly);

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">EA Strategy Marketplace</h1>
          <p className="text-muted-foreground mt-1">Professional Expert Advisor strategies for MT4/MT5. Subscribe and download your licensed .ex5 file instantly.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="catalog">Catalog ({catalog.length})</TabsTrigger>
            <TabsTrigger value="subscriptions">My Subscriptions ({subscriptions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input placeholder="Search strategies, pairs..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-white/5 border-white/10 flex-1" />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10"><SelectValue placeholder="Risk" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  {risks.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCat} onValueChange={setFilterCat}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">{filtered.length} strategies</p>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((s: any) => {
                  const activeSub = subscriptions.find((sub: any) => sub.strategyId === s.id && sub.status === "active" && !sub.isExpired);
                  return (
                    <Card key={s.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/40 transition-all group flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base font-bold leading-tight group-hover:text-amber-400 transition-colors">{s.name}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.category} · {s.pairs}</p>
                          </div>
                          {activeSub && <Badge className="bg-green-500/20 text-green-400 text-[10px] shrink-0"><CheckCircle className="h-2.5 w-2.5 mr-1" />Active</Badge>}
                        </div>
                        <div className="flex gap-1.5 flex-wrap mt-2">
                          <Badge className={`text-[10px] capitalize ${TYPE_COLORS[s.type] || ""}`}>{s.type}</Badge>
                          <Badge className={`text-[10px] ${RISK_COLORS[s.riskLevel] || ""}`}>{s.riskLevel} Risk</Badge>
                          <Badge className="bg-white/10 text-muted-foreground text-[10px]">{s.timeframe}</Badge>
                          <Badge className="bg-white/10 text-muted-foreground text-[10px] uppercase">{s.platform}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 space-y-3">
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{s.description}</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Backtest ROI</p>
                            <p className="text-lg font-bold text-green-400">+{s.backtestRoi}%</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Win Rate</p>
                            <p className="text-lg font-bold text-amber-400">{s.winRate}%</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">From</span>
                          <span className="text-xl font-bold text-white">${s.priceMonthly}<span className="text-xs text-muted-foreground font-normal">/mo</span></span>
                        </div>
                      </CardContent>
                      <CardFooter className="pt-3 flex gap-2">
                        <Link href={`/ea-strategies/${s.id}`} className="flex-1">
                          <Button variant="outline" className="w-full border-white/10 hover:border-amber-500/40 hover:text-amber-400 text-xs">
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Details
                          </Button>
                        </Link>
                        {activeSub ? (
                          <Button className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold text-xs" onClick={() => setTab("subscriptions")}>
                            <Download className="h-3.5 w-3.5 mr-1.5" />My Sub
                          </Button>
                        ) : (
                          <Button className="flex-1 bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold hover:opacity-90 text-xs" onClick={() => {
                            setSubDialog({ open: true, strategy: s });
                            setSubForm({ plan: "monthly" });
                            setMtCreds({ ...EMPTY_MT_ACCOUNT, mtPlatform: s.platform === "mt4" ? "mt4" : "mt5" });
                            setMtErrors({});
                          }}>
                            <Zap className="h-3.5 w-3.5 mr-1.5" />Subscribe
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-4">
            {subscriptions.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-12 text-center">
                <Cpu className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscriptions</h3>
                <p className="text-muted-foreground text-sm mb-4">Browse the catalog and subscribe to an EA strategy to get started.</p>
                <Button onClick={() => setTab("catalog")} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">Browse Catalog</Button>
              </Card>
            ) : subscriptions.map((sub: any) => {
              const strategy = catalog.find((s: any) => s.id === sub.strategyId);
              const isExpired = new Date() > new Date(sub.expiresAt);
              const daysLeft = Math.max(0, Math.ceil((new Date(sub.expiresAt).getTime() - Date.now()) / 86400000));
              return (
                <Card key={sub.id} className={`bg-white/5 border-white/10 ${isExpired ? "opacity-60" : ""}`}>
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20"><Cpu className="h-5 w-5 text-amber-400" /></div>
                          <div>
                            <h3 className="font-bold">{strategy?.name || `Strategy #${sub.strategyId}`}</h3>
                            <p className="text-xs text-muted-foreground">{strategy?.category} · {strategy?.pairs}</p>
                          </div>
                          <div className="ml-auto flex gap-2 flex-wrap">
                            <Badge className={isExpired ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>{isExpired ? "Expired" : "Active"}</Badge>
                            <Badge className="bg-white/10 text-muted-foreground capitalize">{sub.plan}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Key className="h-2.5 w-2.5" />License</p>
                            <p className="text-xs font-mono text-amber-400 mt-0.5 truncate">{sub.licenseKey}</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase">MT Account</p>
                            <p className="text-sm font-medium mt-0.5">{sub.mtAccountNumber}</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{isExpired ? "Expired" : "Expires"}</p>
                            <p className={`text-sm font-medium mt-0.5 ${isExpired ? "text-red-400" : daysLeft <= 7 ? "text-orange-400" : "text-green-400"}`}>
                              {isExpired ? new Date(sub.expiresAt).toLocaleDateString() : `${daysLeft}d left`}
                            </p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2.5 border border-white/5">
                            <p className="text-[10px] text-muted-foreground uppercase flex items-center gap-1"><Download className="h-2.5 w-2.5" />Downloads</p>
                            <p className="text-sm font-medium mt-0.5">{sub.downloadCount || 0}</p>
                          </div>
                        </div>
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-muted-foreground">
                          <strong className="text-amber-400">Installation:</strong> Download .ex5 → copy to MT5 <code>Experts/</code> folder → attach to chart. The EA validates your license and account number automatically.
                        </div>
                      </div>
                      <div className="flex md:flex-col gap-2">
                        <Button onClick={() => handleDownload(sub)} disabled={downloading === sub.id || isExpired} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold" size="sm">
                          <Download className="h-4 w-4 mr-1.5" />{downloading === sub.id ? "Downloading..." : "Download .ex5"}
                        </Button>
                        {isExpired && (
                          <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400" onClick={() => strategy && setSubDialog({ open: true, strategy })}>Renew</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

        {/* Subscribe Dialog */}
        <Dialog open={subDialog.open} onOpenChange={o => setSubDialog(d => ({ ...d, open: o }))}>
          <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-md">
            <DialogHeader><DialogTitle className="text-xl font-bold">Subscribe to {subDialog.strategy?.name}</DialogTitle></DialogHeader>
            {subDialog.strategy && (
              <div className="space-y-5 pt-2">
                <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pairs</span><span>{subDialog.strategy.pairs}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Backtest ROI</span><span className="text-green-400">+{subDialog.strategy.backtestRoi}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Win Rate</span><span className="text-amber-400">{subDialog.strategy.winRate}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Risk Level</span><span>{subDialog.strategy.riskLevel}</span></div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Subscription Plan</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["monthly", "quarterly", "biannual", "annual"].map(plan => (
                      <button key={plan} onClick={() => setSubForm(f => ({ ...f, plan }))} className={`p-3 rounded-lg border text-left transition-all ${subForm.plan === plan ? "border-amber-500 bg-amber-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                        <p className="text-xs font-semibold">{PLAN_LABELS[plan].label}</p>
                        <p className="text-lg font-bold text-amber-400">${planPrice(subDialog.strategy, plan)}</p>
                        <p className="text-[10px] text-muted-foreground">{PLAN_LABELS[plan].days}</p>
                        {plan === "annual" && <p className="text-[10px] text-green-400 font-medium">Best value</p>}
                      </button>
                    ))}
                  </div>
                </div>
                <MtAccountCredentialsForm
                  values={mtCreds}
                  onChange={(k, v) => setMtCreds(prev => ({ ...prev, [k]: v }))}
                  showDeferOption={false}
                  required
                  hideHeader
                  errors={mtErrors}
                />
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                  <strong>Note:</strong> After subscribing, download your licensed .ex5 file. The EA contains your license key, account binding, and expiry check built in.
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold text-amber-400">${planPrice(subDialog.strategy, subForm.plan)}<span className="text-xs text-muted-foreground font-normal"> / {PLAN_LABELS[subForm.plan]?.days}</span></span>
                </div>
                <Button onClick={handleSubscribe} disabled={subscribing} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold text-base h-11">
                  {subscribing ? "Processing..." : "Subscribe & Get License Key"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
);
}
