import { useMemo, useState } from "react";
import { useListAlgoStrategies, useListInvestments } from "@workspace/api-client-react";
import type { AlgoStrategy } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { MtAccountCredentialsForm, EMPTY_MT_ACCOUNT, type MtAccountFormValues } from "@/components/forms/MtAccountCredentialsForm";
import { TradingServiceDepositBanner } from "@/components/wallet/TradingServiceDepositBanner";
import { getAlgoPlanPrice, resolveAlgoPlanPrices } from "@/lib/algo-plan-pricing";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { Bot, Cpu, TrendingUp, Users, Zap } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_FORM_GRID, APP_FORM_GRID_3, APP_TOOLBAR_ROW } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  "Very Low": "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  Low: "bg-green-500/20 text-green-700 dark:text-green-400",
  low: "bg-green-500/20 text-green-700 dark:text-green-400",
  Medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  High: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  high: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  "Very High": "bg-red-500/20 text-red-400",
};

const PLAN_LABELS: Record<string, { label: string; days: string }> = {
  monthly: { label: "Monthly", days: "30 days" },
  quarterly: { label: "Quarterly", days: "90 days" },
  biannual: { label: "Half-Yearly", days: "180 days" },
  annual: { label: "Annual", days: "365 days" },
};

function planPrice(strategy: AlgoStrategy, plan: string) {
  return getAlgoPlanPrice(strategy, plan);
}

function formatRiskLabel(risk: string) {
  if (!risk) return "Medium";
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

export default function AlgoTradingPage() {
  const { data: strategies, isLoading, refetch } = useListAlgoStrategies();
  const { data: investments } = useListInvestments();
  const { user } = useAuth();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = user?.fullName || "Investor";
  const algoProfits = (investments ?? []).filter(i => i.type === "algo" && Number(i.profit) > 0);
  const { toast } = useToast();

  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<AlgoStrategy | null>(null);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [mtCreds, setMtCreds] = useState<MtAccountFormValues>(EMPTY_MT_ACCOUNT);
  const [mtErrors, setMtErrors] = useState<Partial<Record<keyof MtAccountFormValues, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const activeStrategies = useMemo(
    () => (strategies ?? []).filter(s => s.status === "active"),
    [strategies],
  );

  const risks = useMemo(
    () => Array.from(new Set(activeStrategies.map(s => s.riskLevel))).sort(),
    [activeStrategies],
  );

  const filtered = useMemo(() => {
    return activeStrategies.filter(s => {
      if (filterRisk !== "all" && s.riskLevel !== filterRisk) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.description.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [activeStrategies, filterRisk, searchQuery]);

  const resetSubscribeForm = () => {
    setSelectedStrategy(null);
    setSelectedPlan("monthly");
    setAmount("");
    setMtCreds(EMPTY_MT_ACCOUNT);
    setMtErrors({});
  };

  const validateMtCreds = (): boolean => {
    const errs: Partial<Record<keyof MtAccountFormValues, string>> = {};
    if (!mtCreds.mtAccountNumber.trim()) errs.mtAccountNumber = "Account number is required";
    if (!mtCreds.mtBroker.trim()) errs.mtBroker = "Broker is required";
    if (!mtCreds.mtServer.trim()) errs.mtServer = "Server is required";
    if (!mtCreds.mtPassword || mtCreds.mtPassword.length < 4) errs.mtPassword = "Trading password is required";
    setMtErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openSubscribe = (strategy: AlgoStrategy) => {
    setSelectedStrategy(strategy);
    setSelectedPlan("monthly");
    setAmount(String(Math.max(strategy.minInvestment ?? 100, 100)));
    setMtCreds(prev => ({ ...prev, mtPlatform: "mt5" }));
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStrategy || !validateMtCreds()) return;

    const minAmount = selectedStrategy.minInvestment ?? 100;
    if (Number(amount) < minAmount) {
      toast({ title: "Amount too low", description: `Minimum investment is $${minAmount}`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await authFetchJson(`/algo-strategies/${selectedStrategy.id}/subscribe`, {
        method: "POST",
        body: JSON.stringify({
          plan: selectedPlan,
          amount: Number(amount),
          currency: selectedStrategy.currency || "USD",
          accountNumber: mtCreds.mtAccountNumber.trim(),
          brokerName: mtCreds.mtBroker.trim(),
          serverName: mtCreds.mtServer.trim(),
          platform: mtCreds.mtPlatform,
          tradingPassword: mtCreds.mtPassword,
        }),
      });
      toast({
        title: "Algo strategy activated",
        description: `${selectedStrategy.name} (${PLAN_LABELS[selectedPlan]?.label ?? selectedPlan}) is being linked to your MT account.`,
      });
      resetSubscribeForm();
      refetch();
    } catch (err: any) {
      toast({
        title: "Subscription failed",
        description: err?.message || "Please check your details and try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppPage
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          Algo Trading
        </h1>
      }
      subtitle="Subscribe to platform-managed algorithmic strategies and link your MT4/MT5 account for automated execution."
    >
      <TradingServiceDepositBanner compact />

      {algoProfits.length > 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400">Algo trading profits booked</p>
            <p className="text-xs text-muted-foreground truncate">
              {algoProfits.map(p => `${p.planName}: +${p.profit} ${p.currency}`).join(" · ")}
            </p>
          </div>
          <ProfitShareButton
            userName={userName}
            referralCode={referralCode}
            payload={{
              service: "algo_trading",
              profitAmount: algoProfits.reduce((s, p) => s + Number(p.profit), 0),
              currency: "USD",
              detailLabel: algoProfits[0]?.planName || "Algo Trading",
            }}
            label="Share Profit"
          />
        </div>
      )}

      <div className={cn(APP_FORM_GRID_3, "gap-4")}>
        {[
          { icon: Bot, title: "Choose Strategy", desc: "Browse verified algo strategies with published ROI and risk levels.", color: "text-blue-600 dark:text-blue-400" },
          { icon: Zap, title: "Link MT Account", desc: "Provide encrypted trading credentials to connect your broker account.", color: "text-amber-600 dark:text-amber-400" },
          { icon: TrendingUp, title: "Track Performance", desc: "Monitor subscribers and strategy status from your dashboard.", color: "text-green-700 dark:text-green-400" },
        ].map(({ icon: Icon, title, desc, color }) => (
          <Card key={title} className={APP_CARD}>
            <CardContent className="p-4 flex gap-3 items-start">
              <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className={APP_TOOLBAR_ROW}>
        <Input
          placeholder="Search strategies..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 flex-1 min-w-0"
        />
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-full sm:w-40 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 shrink-0">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            {risks.map(r => (
              <SelectItem key={r} value={r}>{formatRiskLabel(r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className={cn(APP_FORM_GRID_3, "gap-4 sm:gap-6")}>
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : filtered.length ? (
        <div className={cn(APP_FORM_GRID_3, "gap-4 sm:gap-6")}>
          {filtered.map(strategy => (
            <Card key={strategy.id} className={cn(APP_CARD, "flex flex-col h-full hover:border-amber-500/50 transition-colors")}>
              <CardHeader className="min-w-0">
                <div className="flex justify-between items-start gap-2 mb-2 min-w-0">
                  <Badge className={`text-[10px] capitalize ${RISK_COLORS[strategy.riskLevel] || RISK_COLORS.medium}`}>
                    {formatRiskLabel(strategy.riskLevel)} Risk
                  </Badge>
                  <Badge variant="outline" className="border-green-500/30 text-green-700 dark:text-green-400 text-[10px] capitalize">
                    {strategy.status}
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl font-bold truncate">{strategy.name}</CardTitle>
                <CardDescription className="line-clamp-3">{strategy.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className={APP_FORM_GRID}>
                  <div className="p-2.5 rounded bg-black/50 border border-border/80 dark:border-white/5">
                    <p className="text-xs text-muted-foreground uppercase">Target ROI</p>
                    <p className="text-sm sm:text-lg font-bold text-green-500">+{strategy.roi}%</p>
                  </div>
                  <div className="p-2.5 rounded bg-black/50 border border-border/80 dark:border-white/5">
                    <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="h-3 w-3" /> Subscribers
                    </p>
                    <p className="text-sm sm:text-lg font-bold text-amber-500">{strategy.subscribers}</p>
                  </div>
                  <div className="sm:col-span-2 space-y-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Min Capital</p>
                      <p className="text-sm font-medium text-amber-500">
                        ${strategy.minInvestment ?? 100} {strategy.currency || "USD"}
                      </p>
                    </div>
                    <div className={cn(APP_FORM_GRID, "text-[10px]")}>
                      {(["monthly", "quarterly", "biannual", "annual"] as const).map(plan => {
                        const prices = resolveAlgoPlanPrices(strategy);
                        return (
                        <div key={plan} className="rounded border border-border/80 dark:border-white/10 px-2 py-1.5 bg-black/30 min-w-0">
                          <p className="text-muted-foreground uppercase truncate">{PLAN_LABELS[plan].label}</p>
                          <p className="font-semibold text-foreground">${prices[plan]}</p>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold hover:opacity-90"
                  onClick={() => openSubscribe(strategy)}
                  disabled={submitting}
                >
                  <Cpu className="h-4 w-4 mr-2" />
                  Subscribe & Link MT
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No active algo strategies match your filters.</div>
      )}

      <Dialog open={!!selectedStrategy} onOpenChange={(open) => { if (!open) resetSubscribeForm(); }}>
        <DialogContent className="dialog-scroll-content bg-background border-border dark:border-white/10 max-w-md overflow-x-hidden p-0 gap-0">
          <DialogHeader className="shrink-0 px-4 pt-4 sm:px-6 sm:pt-6">
            <DialogTitle className="text-amber-600 dark:text-amber-500 text-lg sm:text-xl font-bold break-words pr-8">
              Subscribe to {selectedStrategy?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubscribe} className="dialog-form-inner space-y-5 pt-1">
            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Subscription Plan</Label>
                    <div className={cn(APP_FORM_GRID, "text-[10px]")}>
                      {(["monthly", "quarterly", "biannual", "annual"] as const).map(plan => {
                  const active = selectedPlan === plan;
                  const price = selectedStrategy ? planPrice(selectedStrategy, plan) : 0;
                  return (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`rounded-lg border px-2.5 py-2 text-left transition-colors min-w-0 ${
                        active
                          ? "border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                          : "border-border dark:border-white/10 bg-muted/40 hover:bg-muted/70"
                      }`}
                    >
                      <p className="text-[11px] font-semibold leading-tight">{PLAN_LABELS[plan].label}</p>
                      <p className="text-[10px] text-muted-foreground">{PLAN_LABELS[plan].days}</p>
                      <p className="text-sm font-bold mt-0.5">${price}</p>
                    </button>
                  );
                })}
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

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Trading Capital (USD)</Label>
              <Input
                type="number"
                required
                min={selectedStrategy?.minInvestment ?? 100}
                placeholder={`Min $${selectedStrategy?.minInvestment ?? 100}`}
                className="bg-black/50 border-border dark:border-white/10 focus:ring-amber-500 focus:border-amber-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              size="wrap"
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold min-h-11"
              disabled={submitting}
            >
              {submitting ? "Subscribing..." : "Confirm Subscription"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
