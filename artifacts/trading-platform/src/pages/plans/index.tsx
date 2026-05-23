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
import { Check, Info, TrendingUp, Clock, DollarSign, Wallet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredPlans = plans?.filter((p: any) => categoryFilter === "all" || p.category === categoryFilter);

  const handleInvest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    const amount = Number(investAmount);
    if (amount < selectedPlan.minAmount) {
      toast({ title: "Below Minimum", description: `Minimum investment for this plan is $${selectedPlan.minAmount}`, variant: "destructive" });
      return;
    }

    createMutation.mutate({
      data: {
        amount,
        planName: selectedPlan.name,
        type: selectedPlan.category as any,
        currency: "USD",
      }
    }, {
      onSuccess: () => {
        toast({ title: "Investment Successful", description: `You have successfully invested $${amount} in ${selectedPlan.name}` });
        setSelectedPlan(null);
        setInvestAmount("");
      },
      onError: (err: any) => {
        toast({ title: "Investment Failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Investment Plans</h1>
            <p className="text-muted-foreground">Select a premium hedge-fund strategy to multiply your wealth.</p>
          </div>
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg border border-white/10">
            {["all", "starter", "growth", "premium", "elite"].map((cat) => (
              <Button 
                key={cat} 
                variant="ghost" 
                size="sm" 
                className={categoryFilter === cat ? "bg-amber-500 text-black hover:bg-amber-600" : "text-platinum-white/60"}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[400px] w-full rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredPlans?.map((plan: any) => (
              <Card key={plan.id} className="bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/30 transition-all flex flex-col group relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4">
                   <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 capitalize">{plan.category}</Badge>
                </div>
                <CardHeader>
                  <CardTitle className="text-xl group-hover:text-amber-400 transition-colors">{plan.name}</CardTitle>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-amber-500">{plan.minRoi}%</span>
                    <span className="text-muted-foreground text-xs">to {plan.maxRoi}% ROI</span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Duration</span>
                      <span className="font-medium">{plan.durationDays} Days</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Yield</span>
                      <span className="font-medium">Monthly</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Min Investment:</span>
                      <span className="font-semibold text-platinum-white">${plan.minAmount}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Max Investment:</span>
                      <span className="font-semibold text-platinum-white">${plan.maxAmount}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 pt-4">
                    {['Capital Guaranteed', 'Expert Analysis', '24/7 Support'].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-platinum-white/80">
                        <Check className="h-3 w-3 text-amber-500" /> {feat}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={() => setSelectedPlan(plan)}>
                    Invest Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
          <DialogContent className="bg-[#050A14] border-white/10">
            <DialogHeader>
              <DialogTitle>Confirm Investment: {selectedPlan?.name}</DialogTitle>
              <DialogDescription>Enter the amount you wish to invest.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvest} className="space-y-4 pt-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Available Balance</p>
                    <p className="font-bold">${wallet?.fiatBalance || 0}</p>
                  </div>
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-500">Fiat Wallet</Badge>
              </div>

              <div className="space-y-2">
                <Label>Investment Amount (USD)</Label>
                <div className="relative">
                   <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                    type="number" 
                    className="pl-9" 
                    placeholder="Min 500.00" 
                    value={investAmount} 
                    onChange={e => setInvestAmount(e.target.value)} 
                    required 
                   />
                </div>
                <p className="text-[10px] text-muted-foreground">Min: ${selectedPlan?.minAmount} | Max: ${selectedPlan?.maxAmount}</p>
              </div>

              <div className="space-y-2">
                <Label>Payment Source</Label>
                <Select value={paymentSource} onValueChange={setPaymentSource}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fiat">Fiat Wallet (${wallet?.fiatBalance})</SelectItem>
                    <SelectItem value="crypto">Crypto Wallet (${wallet?.cryptoBalance})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/80">Funds will be locked for {selectedPlan?.durationDays} days. Early withdrawal may incur a 5% fee.</p>
              </div>

              <Button type="submit" className="w-full bg-amber-500 text-black font-bold h-12" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Processing..." : "Confirm & Invest"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
