import { useMemo, useState } from "react";
import { useListAlgoStrategies } from "@workspace/api-client-react";
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
import { Bot, Cpu, TrendingUp, Users, Zap } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  "Very Low": "bg-blue-500/20 text-blue-300",
  Low: "bg-green-500/20 text-green-400",
  Medium: "bg-amber-500/20 text-amber-400",
  High: "bg-orange-500/20 text-orange-400",
  "Very High": "bg-red-500/20 text-red-400",
};

export default function AlgoTradingPage() {
  const { data: strategies, isLoading, refetch } = useListAlgoStrategies();
  const { toast } = useToast();

  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState<AlgoStrategy | null>(null);
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
        description: `${selectedStrategy.name} is being linked to your MT account.`,
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          Algo Trading
        </h1>
        <p className="text-muted-foreground">
          Subscribe to platform-managed algorithmic strategies and link your MT4/MT5 account for automated execution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Bot, title: "Choose Strategy", desc: "Browse verified algo strategies with published ROI and risk levels.", color: "text-blue-400" },
          { icon: Zap, title: "Link MT Account", desc: "Provide encrypted trading credentials to connect your broker account.", color: "text-amber-400" },
          { icon: TrendingUp, title: "Track Performance", desc: "Monitor subscribers and strategy status from your dashboard.", color: "text-green-400" },
        ].map(({ icon: Icon, title, desc, color }) => (
          <Card key={title} className="bg-white/5 border-white/10">
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

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search strategies..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-white/5 border-white/10 flex-1"
        />
        <Select value={filterRisk} onValueChange={setFilterRisk}>
          <SelectTrigger className="w-40 bg-white/5 border-white/10">
            <SelectValue placeholder="Risk level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Risks</SelectItem>
            {risks.map(r => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-72 w-full" />)}
        </div>
      ) : filtered.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(strategy => (
            <Card key={strategy.id} className="flex flex-col h-full bg-white/5 backdrop-blur-sm border-white/10 hover:border-amber-500/50 transition-colors">
              <CardHeader>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <Badge className={`text-[10px] ${RISK_COLORS[strategy.riskLevel] || ""}`}>
                    {strategy.riskLevel} Risk
                  </Badge>
                  <Badge variant="outline" className="border-green-500/30 text-green-400 text-[10px] capitalize">
                    {strategy.status}
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold">{strategy.name}</CardTitle>
                <CardDescription className="line-clamp-3">{strategy.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <p className="text-xs text-muted-foreground uppercase">Target ROI</p>
                    <p className="text-lg font-bold text-green-500">+{strategy.roi}%</p>
                  </div>
                  <div className="p-2 rounded bg-black/50 border border-white/5">
                    <p className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                      <Users className="h-3 w-3" /> Subscribers
                    </p>
                    <p className="text-lg font-bold text-amber-500">{strategy.subscribers}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Min Investment</p>
                    <p className="text-sm font-medium text-amber-500">
                      ${strategy.minInvestment ?? 100} {strategy.currency || "USD"}
                    </p>
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
        <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-amber-500 text-xl font-bold">
              Subscribe to {selectedStrategy?.name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubscribe} className="space-y-5 pt-2">
            <MtAccountCredentialsForm
              values={mtCreds}
              onChange={(k, v) => setMtCreds(prev => ({ ...prev, [k]: v }))}
              showDeferOption={false}
              required
              hideHeader
              errors={mtErrors}
            />

            <div className="space-y-2">
              <Label className="text-muted-foreground uppercase text-xs tracking-wider">Investment Amount (USD)</Label>
              <Input
                type="number"
                required
                min={selectedStrategy?.minInvestment ?? 100}
                placeholder={`Min $${selectedStrategy?.minInvestment ?? 100}`}
                className="bg-black/50 border-white/10 focus:ring-amber-500 focus:border-amber-500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold h-11"
              disabled={submitting}
            >
              {submitting ? "Subscribing..." : "Confirm Subscription"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
