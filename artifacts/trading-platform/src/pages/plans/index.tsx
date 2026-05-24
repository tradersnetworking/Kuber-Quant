import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, Info, TrendingUp, Clock, DollarSign, Wallet, RefreshCw, Shield, RotateCcw, AlertTriangle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

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
  yes: { label: "Full Capital Return", color: "text-green-400" },
  no: { label: "No Capital Return", color: "text-red-400" },
  partial: { label: "Partial Return", color: "text-amber-400" },
};

const CATEGORY_COLORS: Record<string, string> = {
  starter: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  growth: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  premium: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  elite: "bg-rose-500/20 text-rose-400 border-rose-500/30",
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
  const useGetWallet = (ApiHooks as any).useGetWallet;

  const { data: plans, isLoading } = useListPlans ? useListPlans() : { data: [], isLoading: true };
  const { data: wallet } = useGetWallet ? useGetWallet() : { data: null };
  const createMutation = useCreateInvestment ? useCreateInvestment() : { mutate: () => {}, isPending: false };
  const { toast } = useToast();

  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [investAmount, setInvestAmount] = useState("");
  const [paymentSource, setPaymentSource] = useState("fiat");
  const [activeTab, setActiveTab] = useState("all");

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
    createMutation.mutate({
      data: { amount, planName: selectedPlan.name, type: selectedPlan.category as any, currency: "USD" }
    }, {
      onSuccess: () => {
        toast({ title: "Investment Successful!", description: `You have successfully invested $${amount.toLocaleString()} in ${selectedPlan.name}` });
        setSelectedPlan(null);
        setInvestAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Investment Failed", description: err?.message || "Something went wrong", variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Investment Plans
          </h1>
          <p className="text-muted-foreground mt-1">
            Select a premium hedge-fund strategy tailored to your investment horizon.
          </p>
        </div>

        {/* Plan Type Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
            {PLAN_TYPE_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-amber-500 data-[state=active]:text-black text-zinc-400 font-medium"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Plans Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[500px] w-full rounded-xl" />)}
          </div>
        ) : filteredPlans?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg">No plans available for this category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlans?.map((plan: any, idx: number) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/40 transition-all flex flex-col group relative overflow-hidden h-full">
                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <Badge className={`capitalize text-xs ${CATEGORY_COLORS[plan.category] || "bg-white/10 text-white"}`}>
                      {plan.category}
                    </Badge>
                  </div>

                  {/* Plan Type Badge */}
                  <div className="absolute top-4 left-4">
                    <Badge variant="outline" className="border-amber-500/30 text-amber-400 text-xs">
                      {PLAN_TYPE_LABELS[plan.planType] || plan.planType}
                    </Badge>
                  </div>

                  <CardHeader className="pt-12 pb-2">
                    <CardTitle className="text-lg group-hover:text-amber-400 transition-colors">{plan.name}</CardTitle>
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
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Clock className="h-3 w-3" /> Duration
                        </span>
                        <span className="font-semibold text-sm">{plan.durationDays}d</span>
                      </div>
                      <div className="flex flex-col gap-1 p-2 rounded-lg bg-white/5">
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <TrendingUp className="h-3 w-3" /> Profit
                        </span>
                        <span className="font-semibold text-sm">{PROFIT_FREQ_LABELS[plan.profitFrequency] || plan.profitFrequency}</span>
                      </div>
                    </div>

                    {/* Amount Range */}
                    <div className="space-y-1.5 text-sm border border-white/10 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-xs">Min Investment:</span>
                        <span className="font-semibold text-amber-400">${plan.minAmount.toLocaleString()}</span>
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
                          <RefreshCw className="h-3 w-3 text-amber-400 shrink-0" />
                          <span className="text-amber-400">Auto-renewal enabled</span>
                        </div>
                      )}
                      {plan.earlyWithdrawalPenalty > 0 && (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" />
                          <span className="text-orange-400">{plan.earlyWithdrawalPenalty}% early exit fee</span>
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
                          <li key={i} className="flex items-center gap-2 text-xs text-zinc-300">
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
          <DialogContent className="bg-[#050A14] border-white/10 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Invest in <span className="text-amber-400">{selectedPlan?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-zinc-400">
                {selectedPlan?.planType && PLAN_TYPE_LABELS[selectedPlan.planType]} plan •{" "}
                {selectedPlan?.durationDays}d duration •{" "}
                {selectedPlan?.roiPercent}% ROI
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleInvest} className="space-y-4 pt-2">
              {/* Wallet Balance */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Available Balance</p>
                    <p className="font-bold text-sm">${Number(wallet?.fiatBalance || 0).toLocaleString()}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-500 text-xs">Fiat Wallet</Badge>
              </div>

              {/* Amount Input */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Investment Amount (USD)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    className="pl-9 bg-white/5 border-white/10 focus:border-amber-500/50"
                    placeholder={`Min $${selectedPlan?.minAmount?.toLocaleString()}`}
                    value={investAmount}
                    onChange={e => setInvestAmount(e.target.value)}
                    required
                    min={selectedPlan?.minAmount}
                    max={selectedPlan?.maxAmount}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Min: <span className="text-amber-400">${selectedPlan?.minAmount?.toLocaleString()}</span> |
                  Max: <span className="text-zinc-300">${selectedPlan?.maxAmount?.toLocaleString()}</span>
                </p>
              </div>

              {/* Payment Source */}
              <div className="space-y-2">
                <Label className="text-zinc-300">Payment Source</Label>
                <Select value={paymentSource} onValueChange={setPaymentSource}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#050A14] border-white/10">
                    <SelectItem value="fiat">Fiat Wallet (${Number(wallet?.fiatBalance || 0).toLocaleString()})</SelectItem>
                    <SelectItem value="crypto">Crypto Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Plan details summary */}
              <div className="space-y-2 p-3 bg-white/5 rounded-lg border border-white/10 text-xs">
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
                    <span className="text-orange-400">{selectedPlan?.earlyWithdrawalPenalty}%</span>
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
      </div>
    </AppLayout>
  );
}
