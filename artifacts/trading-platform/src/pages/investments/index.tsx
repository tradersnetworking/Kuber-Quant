import { useEffect, useMemo, useState } from "react";
import {
  useListInvestments,
  useCreateInvestment,
  useListPlans,
  type InvestmentPlan,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/hooks/use-auth";
import { getShareUserDisplayName } from "@/lib/user-display-name";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { cn } from "@/lib/utils";
import {
  INVESTMENT_TYPE_OPTIONS,
  INVESTMENT_CURRENCY_OPTIONS,
  filterPlansForInvestmentType,
  PLAN_TYPE_LABELS,
  type InvestmentFormType,
  type InvestmentCurrency,
} from "@/lib/investment-form-options";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { InsufficientInvestmentBalanceDialog } from "@/components/investments/InsufficientInvestmentBalanceDialog";
import { InvestmentFundingSummary } from "@/components/investments/InvestmentFundingSummary";
import { useInvestmentFunding, parseInsufficientInvestmentError } from "@/lib/investment-funding";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";
import { AppPage } from "@/components/layout/AppPage";
import { APP_CARD, APP_FORM_GRID, APP_PAGE_STACK } from "@/lib/ui-system";

function planMeta(plan: InvestmentPlan) {
  const typeLabel = PLAN_TYPE_LABELS[plan.planType || ""] || plan.category || "Plan";
  return `${typeLabel} · ${plan.roiPercent}% ROI · ${plan.durationDays} days`;
}

function investmentTypeLabel(type: string) {
  const map: Record<string, string> = {
    manual: "Wealth Plan",
    copy: "Copy Trading",
    algo: "Algo Trading",
    ea: "EA Strategy",
  };
  return map[type] || type;
}

type InvestmentRow = {
  id: number;
  planName?: string | null;
  type: string;
  amount: number | string;
  currency: string;
  profit: number | string;
  status: string;
};

function PortfolioRows({
  investments,
  userName,
  referralCode,
  avatarUrl,
}: {
  investments: InvestmentRow[];
  userName: string;
  referralCode?: string;
  avatarUrl?: string | null;
}) {
  const columns: ResponsiveColumn<InvestmentRow>[] = [
    {
      key: "plan",
      header: "Plan",
      mobileTitle: true,
      cell: (inv) => (
        <span className="font-medium max-w-[200px] break-words">{inv.planName}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (inv) => (
        <span className="uppercase text-xs text-amber-600 dark:text-amber-400">
          {investmentTypeLabel(inv.type)}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      cell: (inv) => (
        <span className="whitespace-nowrap">{inv.amount} {inv.currency}</span>
      ),
    },
    {
      key: "profit",
      header: "Profit",
      cell: (inv) => {
        const profit = Number(inv.profit);
        return (
          <span
            className={cn(
              profit > 0 ? "text-green-600 dark:text-green-400 font-bold" : profit < 0 ? "text-red-500 font-bold" : "",
            )}
          >
            {profit > 0 ? "+" : ""}{inv.profit} {inv.currency}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (inv) => (
        <Badge
          variant={inv.status === "active" ? "default" : "secondary"}
          className={inv.status === "active" ? "bg-green-600 hover:bg-green-600 capitalize" : "capitalize"}
        >
          {inv.status}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "w-[1%]",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (inv) => {
        const profit = Number(inv.profit);
        return (
          <div className="flex items-center justify-end gap-2 flex-wrap">
            {profit > 0 && (
              <ProfitShareButton
                userName={userName}
                referralCode={referralCode}
                avatarUrl={avatarUrl}
                payload={{
                  service: inv.type === "copy" ? "copy_trading" : inv.type === "algo" ? "algo_trading" : inv.type === "ea" ? "ea_strategy" : "investment",
                  profitAmount: profit,
                  currency: inv.currency,
                  detailLabel: inv.planName || undefined,
                }}
              />
            )}
            <Link href={`/investments/${inv.id}`}>
              <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                Details
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  return (
    <ResponsiveDataView
      columns={columns}
      data={investments}
      rowKey={(inv) => inv.id}
      rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
      mobileFooter={(inv) => {
        const profit = Number(inv.profit);
        return (
          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            {profit > 0 && (
              <ProfitShareButton
                userName={userName}
                referralCode={referralCode}
                avatarUrl={avatarUrl}
                className="w-full sm:flex-1"
                payload={{
                  service: inv.type === "copy" ? "copy_trading" : inv.type === "algo" ? "algo_trading" : inv.type === "ea" ? "ea_strategy" : "investment",
                  profitAmount: profit,
                  currency: inv.currency,
                  detailLabel: inv.planName || undefined,
                }}
              />
            )}
            <Link href={`/investments/${inv.id}`} className={profit > 0 ? "sm:flex-1" : "w-full"}>
              <Button variant="outline" size="sm" className="w-full border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                Details
              </Button>
            </Link>
          </div>
        );
      }}
    />
  );
}

export default function InvestmentsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const referralCode = (user as any)?.referralCode as string | undefined;
  const userName = getShareUserDisplayName(user);
  const avatarUrl = user?.avatarUrl;
  const { data: investments, isLoading, refetch } = useListInvestments();
  const { data: plans, isLoading: plansLoading } = useListPlans();
  const createMutation = useCreateInvestment();

  const [showCreate, setShowCreate] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<InvestmentFormType>("manual");
  const [currency, setCurrency] = useState<InvestmentCurrency>("USD");
  const [planId, setPlanId] = useState<string>("");
  const [insufficientPayload, setInsufficientPayload] = useState<any>(null);

  const { data: funding, isLoading: fundingLoading } = useInvestmentFunding(currency, showCreate);

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

    if (funding && numAmount > funding.availableBalance + 1e-8) {
      setInsufficientPayload({
        code: "INSUFFICIENT_BALANCE",
        ...funding,
        requestedAmount: numAmount,
        shortfall: Math.max(0, numAmount - funding.availableBalance),
        message: funding.activeInvestmentCount > 0
          ? `Insufficient available balance. You have ${funding.availableBalance.toFixed(2)} ${currency} free to invest and ${funding.activeInvested.toFixed(2)} ${currency} already locked in active plans.`
          : `Insufficient available balance. You have ${funding.availableBalance.toFixed(2)} ${currency} available.`,
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
          invalidateFinanceQueries(qc);
          setShowCreate(false);
          resetForm();
          refetch();
        },
        onError: (err: any) => {
          const insufficient = parseInsufficientInvestmentError(err);
          if (insufficient) {
            setInsufficientPayload(insufficient);
            return;
          }
          toast({
            title: "Investment failed",
            description: err?.message || "Could not create investment.",
            variant: "destructive",
          });
        },
      },
    );
  };

  const planMetaLine = selectedPlan ? planMeta(selectedPlan) : null;

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent break-words">
          Investments
        </h1>
      }
      subtitle="Manage your active and completed investments."
      actions={
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0 touch-target"
        >
          {showCreate ? "Cancel" : "New Investment"}
        </Button>
      }
    >
      {showCreate && (
        <Card className={APP_CARD}>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Create New Investment</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-5">
              <InvestmentFundingSummary funding={funding} isLoading={fundingLoading} />

              <div className={APP_FORM_GRID}>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={type}
                    onValueChange={(v) => setType(v as InvestmentFormType)}
                  >
                    <SelectTrigger className="bg-black/50 border-border dark:border-white/10">
                      <SelectValue placeholder="Select investment type" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border dark:border-white/10">
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
                    <SelectTrigger className="bg-black/50 border-border dark:border-white/10">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border dark:border-white/10">
                      {INVESTMENT_CURRENCY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label>Plan Name</Label>
                  <Select
                    value={planId}
                    onValueChange={setPlanId}
                    disabled={plansLoading || availablePlans.length === 0}
                  >
                    <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-auto min-h-10 py-2 whitespace-normal [&>span]:line-clamp-2 [&>span]:whitespace-normal [&>span]:text-left">
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
                    <SelectContent className="bg-background border-border dark:border-white/10 max-h-72 w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)]">
                      {availablePlans.map((plan: InvestmentPlan) => (
                        <SelectItem
                          key={plan.id}
                          value={String(plan.id)}
                          textValue={plan.name}
                          className="py-2.5 items-start whitespace-normal"
                        >
                          <div className="flex flex-col items-start gap-0.5 min-w-0 pr-6 max-w-full">
                            <span className="font-medium text-sm leading-snug break-words">{plan.name}</span>
                            <span className="text-xs text-muted-foreground leading-snug break-words">{planMeta(plan)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPlan && (
                    <p className="text-xs text-muted-foreground break-words">
                      <span className="font-medium text-foreground">{selectedPlan.name}</span>
                      {" — "}
                      {planMetaLine}
                      {` · Min ${selectedPlan.minAmount} · Max ${selectedPlan.maxAmount} ${selectedPlan.currency}`}
                    </p>
                  )}
                  {!plansLoading && availablePlans.length === 0 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      No active plans for this type. Try another type or ask admin to publish plans.
                    </p>
                  )}
                </div>

                <div className="space-y-2 sm:col-span-2">
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
                    className="bg-black/50 border-border dark:border-white/10"
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

      <Card className={cn(APP_CARD, "min-w-0")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg sm:text-xl font-bold">Your Portfolio</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-24 w-full md:h-10" />
              <Skeleton className="h-24 w-full md:h-10" />
              <Skeleton className="h-24 w-full md:h-10" />
            </div>
          ) : investments?.length ? (
            <PortfolioRows
              investments={investments}
              userName={userName}
              referralCode={referralCode}
              avatarUrl={avatarUrl}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">No investments found.</div>
          )}
        </CardContent>
      </Card>

      <InsufficientInvestmentBalanceDialog
        open={!!insufficientPayload}
        onOpenChange={(open) => !open && setInsufficientPayload(null)}
        payload={insufficientPayload}
      />
    </AppPage>
  );
}
