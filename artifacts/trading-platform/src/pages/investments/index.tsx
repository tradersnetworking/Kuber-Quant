import { useEffect, useMemo, useState } from "react";
import {
  useListInvestments,
  useCreateInvestment,
  useListPlans,
  type InvestmentPlan,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  INVESTMENT_TYPE_OPTIONS,
  INVESTMENT_CURRENCY_OPTIONS,
  filterPlansForInvestmentType,
  PLAN_TYPE_LABELS,
  type InvestmentFormType,
  type InvestmentCurrency,
} from "@/lib/investment-form-options";

export default function InvestmentsPage() {
  const { toast } = useToast();
  const { data: investments, isLoading, refetch } = useListInvestments();
  const { data: plans, isLoading: plansLoading } = useListPlans();
  const createMutation = useCreateInvestment();

  const [showCreate, setShowCreate] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<InvestmentFormType>("manual");
  const [currency, setCurrency] = useState<InvestmentCurrency>("USD");
  const [planId, setPlanId] = useState<string>("");

  const availablePlans = useMemo(
    () => filterPlansForInvestmentType(plans, type),
    [plans, type],
  );

  const selectedPlan = useMemo(
    () => availablePlans.find(p => String(p.id) === planId),
    [availablePlans, planId],
  );

  useEffect(() => {
    if (!availablePlans.length) {
      setPlanId("");
      return;
    }
    if (!availablePlans.some(p => String(p.id) === planId)) {
      setPlanId(String(availablePlans[0].id));
    }
  }, [availablePlans, planId]);

  useEffect(() => {
    if (selectedPlan?.currency) {
      const planCurrency = selectedPlan.currency as InvestmentCurrency;
      if (INVESTMENT_CURRENCY_OPTIONS.some(c => c.value === planCurrency)) {
        setCurrency(planCurrency);
      }
    }
  }, [selectedPlan?.id, selectedPlan?.currency]);

  const resetForm = () => {
    setAmount("");
    setType("manual");
    setCurrency("USD");
    setPlanId("");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      toast({ title: "Select a plan", description: "Choose an investment plan from the list.", variant: "destructive" });
      return;
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a valid investment amount.", variant: "destructive" });
      return;
    }

    if (numAmount < selectedPlan.minAmount || numAmount > selectedPlan.maxAmount) {
      toast({
        title: "Amount out of range",
        description: `Enter between ${selectedPlan.minAmount} and ${selectedPlan.maxAmount} ${selectedPlan.currency}.`,
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate(
      {
        data: {
          amount: numAmount,
          type,
          currency,
          planName: selectedPlan.name,
          planId: selectedPlan.id,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Investment confirmed",
            description: `${selectedPlan.name} — ${numAmount} ${currency}`,
          });
          setShowCreate(false);
          resetForm();
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: "Investment failed",
            description: err?.message || "Could not create investment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const planHint = selectedPlan
    ? `Min ${selectedPlan.minAmount} · Max ${selectedPlan.maxAmount} ${selectedPlan.currency} · ${selectedPlan.roiPercent}% ROI · ${selectedPlan.durationDays} days`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Investments
          </h1>
          <p className="text-muted-foreground">Manage your active and completed investments.</p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          {showCreate ? "Cancel" : "New Investment"}
        </Button>
      </div>

      {showCreate && (
        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Create New Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as InvestmentFormType)}
                  >
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue placeholder="Select investment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      {INVESTMENT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(v) => setCurrency(v as InvestmentCurrency)}
                  >
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      {INVESTMENT_CURRENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Plan Name</Label>
                  <Select
                    value={planId}
                    onValueChange={setPlanId}
                    disabled={plansLoading || availablePlans.length === 0}
                  >
                    <SelectTrigger className="bg-black/50 border-white/10">
                      <SelectValue
                        placeholder={
                          plansLoading
                            ? "Loading plans..."
                            : availablePlans.length === 0
                              ? "No plans for this type"
                              : "Select investment plan"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10 max-h-72">
                      {availablePlans.map((plan: InvestmentPlan) => (
                        <SelectItem key={plan.id} value={String(plan.id)}>
                          {plan.name}
                          {" · "}
                          {PLAN_TYPE_LABELS[plan.planType || ""] || plan.planType}
                          {" · "}
                          {plan.roiPercent}% ROI
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {planHint && (
                    <p className="text-xs text-muted-foreground">{planHint}</p>
                  )}
                  {!plansLoading && availablePlans.length === 0 && (
                    <p className="text-xs text-amber-400">
                      No active plans for this type. Try another type or ask admin to publish plans.
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Amount</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={selectedPlan?.minAmount ?? 0}
                    max={selectedPlan?.maxAmount}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={selectedPlan ? `Enter amount (${selectedPlan.currency})` : "Enter amount"}
                    className="bg-black/50 border-white/10"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={createMutation.isPending || !selectedPlan || !amount}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {createMutation.isPending ? "Creating..." : "Confirm Investment"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white/5 backdrop-blur-sm border-white/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : investments?.length ? (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-muted-foreground">Plan</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Amount</TableHead>
                  <TableHead className="text-muted-foreground">Profit</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {investments.map(inv => (
                  <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium">{inv.planName}</TableCell>
                    <TableCell className="uppercase text-xs text-amber-500">{inv.type}</TableCell>
                    <TableCell>{inv.amount} {inv.currency}</TableCell>
                    <TableCell className={inv.profit > 0 ? "text-green-500 font-bold" : inv.profit < 0 ? "text-red-500 font-bold" : ""}>
                      {inv.profit > 0 ? "+" : ""}{inv.profit} {inv.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "active" ? "default" : "secondary"} className={inv.status === "active" ? "bg-green-500" : ""}>
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link href={`/investments/${inv.id}`}>
                        <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                          Details
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No investments found.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
