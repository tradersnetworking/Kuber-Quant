import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Info, TrendingUp, Clock, DollarSign, RefreshCw, Shield, RotateCcw, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { InsufficientInvestmentBalanceDialog } from "@/components/investments/InsufficientInvestmentBalanceDialog";
import { InvestmentFundingSummary } from "@/components/investments/InvestmentFundingSummary";
import { useInvestmentFunding, parseInsufficientInvestmentError } from "@/lib/investment-funding";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_FORM_GRID, APP_FORM_GRID_3 } from "@/lib/ui-system";
import { cn } from "@/lib/utils";

const PLAN_TYPE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Half-Yearly",
  annual: "Annual",
};

const PROFIT_FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  at_maturity: "At Maturity",
};

const CAPITAL_RETURN_LABELS: Record<string, { label: string; color: string }> = {
  yes: { label: "Full Capital Return", color: "text-green-700 dark:text-green-400" },
  no: { label: "No Capital Return", color: "text-red-400" },
  partial: { label: "Partial Return", color: "text-amber-600 dark:text-amber-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  starter: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  growth: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  premium: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  elite: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
};

const PLAN_TYPE_TABS = [
  { value: "all", label: "All Plans" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "half_yearly", label: "Half-Yearly" },
  { value: "annual", label: "Annual" },
];

export default function PlansPage() {
  const useListPlans = (ApiHooks as any).useListPlans;
  const useCreateInvestment = (ApiHooks as any).useCreateInvestment;

  const { data: plans, isLoading } = useListPlans ? useListPlans() : { data: [], isLoading: true };
  const createMutation = useCreateInvestment ? useCreateInvestment() : { mutate: () => {}, isPending: false };
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [paymentSource, setPaymentSource] = useState("fiat");
  const [activeTab, setActiveTab] = useState("all");
  const [insufficientPayload, setInsufficientPayload] = useState<any>(null);

  const investCurrency = paymentSource === "crypto" ? "USDT" : "USD";
  const { data: funding, isLoading: fundingLoading } = useInvestmentFunding(investCurrency, !!selectedPlan);

  const filteredPlans = plans?.filter((p: any) =>
    activeTab === "all" || p.planType === activeTab
  );

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    const amount = Number(investAmount);
    if (amount < selectedPlan.minAmount) {
      toast({ title: "Below Minimum", description: `Minimum investment is $${selectedPlan.minAmount.toLocaleString()}`, variant: "destructive" });
      return;
    }
    if (amount > selectedPlan.maxAmount) {
      toast({ title: "Exceeds Maximum", description: `Maximum investment is $${selectedPlan.maxAmount.toLocaleString()}`, variant: "destructive" });
      return;
    }

    if (funding && amount > funding.availableBalance + 1e-8) {
      setInsufficientPayload({
        code: "INSUFFICIENT_BALANCE",
        ...funding,
        requestedAmount: amount,
        shortfall: Math.max(0, amount - funding.availableBalance),
        message: funding.activeInvestmentCount > 0
          ? `Insufficient available balance. You have ${funding.availableBalance.toFixed(2)} ${investCurrency} free to invest and ${funding.activeInvested.toFixed(2)} ${investCurrency} already locked in active plans.`
          : `Insufficient available balance. You have ${funding.availableBalance.toFixed(2)} ${investCurrency} available.`,
      });
      return;
    }

    createMutation.mutate({
      data: { amount, planName: selectedPlan.name, planId: selectedPlan.id, type: "plan", currency: investCurrency }
    }, {
      onSuccess: () => {
        toast({ title: "Investment Successful!", description: `You have successfully invested $${amount.toLocaleString()} in ${selectedPlan.name}` });
        invalidateFinanceQueries(qc);
        setSelectedPlan(null);
        setInvestAmount("");
      },
      onError: (err: any) => {
        const insufficient = parseInsufficientInvestmentError(err);
        if (insufficient) {
          setInsufficientPayload(insufficient);
          return;
        }
        toast({ title: "Investment Failed", description: err?.message || "Something went wrong", variant: "destructive" });
      }
    });
  };

  const planGridClass = cn(APP_FORM_GRID_3, "xl:grid-cols-4 gap-4 sm:gap-6");

  return (
    <AppPage
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          Investment Plans
        </h1>
      }
      subtitle="Select a premium hedge-fund strategy tailored to your investment horizon."
    >
        {/* Plan Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex-wrap gap-1 p-1">
            {PLAN_TYPE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Plans Grid */}
        {isLoading ? (
          <div className={planGridClass}>
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
          </div>
        ) : filteredPlans?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No plans available for this category.</p>
          </div>
        ) : (
          <div className={planGridClass}>
            {filteredPlans?.map((plan: any, idx: number) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={cn(APP_CARD, "hover:border-amber-500/40 transition-all flex flex-col group h-full")}>
                  <CardHeader className="pb-2 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant="outline" className="shrink-0 border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
                        {PLAN_TYPE_LABELS[plan.planType] || plan.planType}
                      </Badge>
                      <Badge className={`shrink-0 capitalize text-xs ${CATEGORY_COLORS[plan.category] || "bg-muted text-muted-foreground"}`}>
                        {plan.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg leading-snug break-words group-hover:text-amber-600 dark:text-amber-400 transition-colors">{plan.name}</CardTitle>
                    {plan.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                    )}
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-amber-500">{plan.roiPercent}%</span>
                      <span className="text-muted-foreground text-xs">ROI</span>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-4">
                    {/* Key Stats */}
                    <div className={cn(APP_FORM_GRID, "text-sm")}>
                      <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/60 dark:bg-white/5">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" /> Duration
                        </span>
                        <span className="font-semibold text-sm">{plan.durationDays}d</span>
                      </div>
                      <div className="flex flex-col gap-1 p-2 rounded-lg bg-muted/60 dark:bg-white/5">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3" /> Profit
                        </span>
                        <span className="font-semibold text-sm">{PROFIT_FREQ_LABELS[plan.profitFrequency] || plan.profitFrequency}</span>
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-1.5 text-sm border border-border dark:border-white/10 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Min Investment:</span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400">${plan.minAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Max Investment:</span>
                        <span className="font-semibold">${plan.maxAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Capital & Auto-renewal */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <Shield className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className={CAPITAL_RETURN_LABELS[plan.capitalReturn]?.color || "text-muted-foreground"}>
                          {CAPITAL_RETURN_LABELS[plan.capitalReturn]?.label || "Capital Return Info N/A"}
                        </span>
                      </div>
                      {plan.autoRenewal && (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                          <span className="text-amber-600 dark:text-amber-400">Auto-renewal enabled</span>
                        </div>
                      )}
                      {plan.earlyWithdrawalPenalty > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="text-orange-600 dark:text-orange-400">{plan.earlyWithdrawalPenalty}% early exit fee</span>
                        </div>
                      )}
                      {plan.maxInvestors && (
                        <div className="flex items-center gap-2">
                          <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">{plan.totalInvestors}/{plan.maxInvestors} slots filled</span>
                        </div>
                      )}
                    </div>

                    {/* Features */}
                    {plan.features && plan.features.length > 0 && (
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 3).map((feat: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-amber-500 shrink-0" /> {feat}
                          </li>
                        ))}
                      </ul>
                    )}
                  </CardContent>

                  <CardFooter>
                    <Button
                      className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold"
                      onClick={() => { setSelectedPlan(plan); setInvestAmount(""); }}
                    >
                      Invest Now
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Invest Dialog */}
        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
          <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Invest in <span className="text-amber-600 dark:text-amber-400">{selectedPlan?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedPlan?.planType && PLAN_TYPE_LABELS[selectedPlan.planType]} plan •{" "}
                {selectedPlan?.durationDays}d duration •{" "}
                {selectedPlan?.roiPercent}% ROI
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInvest} className="space-y-4 pt-2">
              <InvestmentFundingSummary
                funding={funding}
                isLoading={fundingLoading}
                walletLabel={paymentSource === "crypto" ? "Crypto wallet" : "Fiat wallet"}
              />

              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Investment Amount ({investCurrency})</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 focus:border-amber-500/50"
                    placeholder={`Min $${selectedPlan?.minAmount?.toLocaleString()}`}
                    value={investAmount}
                    onChange={e => setInvestAmount(e.target.value)}
                    required
                    min={selectedPlan?.minAmount}
                    max={selectedPlan?.maxAmount}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Min: <span className="text-amber-600 dark:text-amber-400">${selectedPlan?.minAmount?.toLocaleString()}</span> |
                  Max: <span className="text-muted-foreground">${selectedPlan?.maxAmount?.toLocaleString()}</span>
                </p>
              </div>

              {/* Payment Source */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">Payment Source</Label>
                <Select value={paymentSource} onValueChange={setPaymentSource}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border dark:border-white/10">
                    <SelectItem value="fiat">
                      Fiat wallet ({investCurrency === "USD" && funding ? `$${funding.availableBalance.toFixed(2)}` : "USD"})
                    </SelectItem>
                    <SelectItem value="crypto">
                      Crypto wallet ({paymentSource === "crypto" && funding ? `${funding.availableBalance.toFixed(2)} USDT` : "USDT"})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plan details summary */}
              <div className="space-y-2 p-3 bg-muted/60 dark:bg-white/5 rounded-lg border border-border dark:border-white/10 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profit Frequency</span>
                  <span>{PROFIT_FREQ_LABELS[selectedPlan?.profitFrequency] || selectedPlan?.profitFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capital Return</span>
                  <span className={CAPITAL_RETURN_LABELS[selectedPlan?.capitalReturn]?.color}>
                    {CAPITAL_RETURN_LABELS[selectedPlan?.capitalReturn]?.label}
                  </span>
                </div>
                {selectedPlan?.earlyWithdrawalPenalty > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Early Exit Fee</span>
                    <span className="text-orange-600 dark:text-orange-400">{selectedPlan?.earlyWithdrawalPenalty}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">
                  Funds will be locked for {selectedPlan?.durationDays} days. Profits paid {PROFIT_FREQ_LABELS[selectedPlan?.profitFrequency]?.toLowerCase()}.
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-bold h-12"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Processing..." : "Confirm & Invest"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <InsufficientInvestmentBalanceDialog
          open={!!insufficientPayload}
          onOpenChange={(open) => !open && setInsufficientPayload(null)}
          payload={insufficientPayload}
        />
    </AppPage>
  );
}
