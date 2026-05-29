import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  AlertCircle, Building2, Calendar, CheckCircle2, Loader2, TrendingUp, Wallet, Smartphone, CreditCard, IndianRupee,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { authFetchJson } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { PayoutAccountDetailsCard } from "@/components/wallet/PayoutAccountDetailsCard";
import { PersonalPaymentAccounts } from "@/components/wallet/PersonalPaymentAccounts";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";

type PendingMaturity = {
  investmentId: number;
  planName: string;
  investedAmount: number;
  currency: string;
  profitEarned: number;
  remainingProfit: number;
  capitalReturn: number;
  totalPayout: number;
  totalPayoutUsd: number;
  roiPercent: number;
  investedAt: string;
  maturityDate: string;
  daysUntil: number;
  durationDays: number | null;
  profitFrequency: string | null;
  capitalReturnPolicy: string | null;
  type: string;
};

type Step = "overview" | "personal-method" | "personal-account" | "confirm";

function fmt(n: number, currency: string) {
  const prefix = !["BTC", "ETH", "USDT"].includes(currency) ? "$" : "";
  return `${prefix}${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
}

export function InvestmentMaturityPayoutDialog() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [queueIndex, setQueueIndex] = useState(0);
  const [destination, setDestination] = useState<"wallet" | "personal" | null>(null);
  const [method, setMethod] = useState<"upi" | "digital_rupee" | "bank" | "crypto" | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>("overview");
  const [submitting, setSubmitting] = useState(false);
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false);

  const { data: pending = [], refetch, isLoading } = useQuery({
    queryKey: ["/api/investments/maturity-payout/pending"],
    queryFn: () => authFetchJson<PendingMaturity[]>("/investments/maturity-payout/pending"),
    refetchInterval: 60_000,
  });

  const current = pending[queueIndex] ?? null;
  const open = pending.length > 0 && !!current;

  const { data: accounts = [], refetch: refetchAccounts } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<PaymentAccount[]>("/wallet/payment-accounts"),
    enabled: open && destination === "personal",
  });

  const filteredAccounts = useMemo(
    () => accounts.filter(a => method && a.accountType === method),
    [accounts, method],
  );

  const selectedAccount = filteredAccounts.find(a => a.id === selectedAccountId) ?? null;

  const resetFlow = useCallback(() => {
    setDestination(null);
    setMethod(null);
    setSelectedAccountId(null);
    setConsent(false);
    setStep("overview");
  }, []);

  useEffect(() => {
    if (open) resetFlow();
  }, [current?.investmentId, open, resetFlow]);

  const submit = async () => {
    if (!current || !destination) return;
    if (!consent) {
      toast({ title: "Consent required", description: "Please authorize the payout destination.", variant: "destructive" });
      return;
    }
    if (destination === "personal" && (!method || !selectedAccountId)) {
      toast({ title: "Select payout account", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await authFetchJson(`/investments/${current.investmentId}/maturity-payout-choice`, {
        method: "POST",
        body: JSON.stringify({
          destination,
          paymentMethod: method,
          paymentAccountId: selectedAccountId,
          consent: true,
        }),
      });
      toast({
        title: "Payout preference saved",
        description: destination === "wallet"
          ? "Funds will be added to your platform wallet on maturity."
          : "Funds will be sent to your selected account after admin approval.",
      });
      invalidateFinanceQueries(qc);
      await refetch();
      if (queueIndex < pending.length - 1) {
        setQueueIndex(i => i + 1);
      } else {
        setQueueIndex(0);
      }
      resetFlow();
    } catch (e: any) {
      toast({ title: "Could not save", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !open || !current) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={() => { /* blocking until submitted */ }}>
        <DialogContent
          className="max-w-2xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-amber-500/40"
          onPointerDownOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-emerald-500/10 p-4 sm:p-6 border-b border-amber-500/30">
            <DialogHeader className="text-left space-y-2">
              <Badge className="w-fit bg-amber-500 text-black font-semibold">
                {current.daysUntil === 0 ? "Matures today" : "Maturity tomorrow"}
              </Badge>
              <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight">
                Upcoming profit payment — choose how to receive it
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Your investment plan is nearing maturity. Review the details below and tell us whether to credit your
                platform wallet or send funds to your personal UPI / bank / crypto account.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] p-3 sm:p-4 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-base">{current.planName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{current.type} plan · ROI {current.roiPercent}%</p>
                </div>
                <Badge variant="outline" className="capitalize">{current.profitFrequency?.replace("_", " ") || "at maturity"}</Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="rounded-lg bg-background/60 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground">Invested</p>
                  <p className="font-semibold mt-0.5">{fmt(current.investedAmount, current.currency)}</p>
                </div>
                <div className="rounded-lg bg-background/60 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground">Invested on</p>
                  <p className="font-medium mt-0.5">{format(new Date(current.investedAt), "dd MMM yyyy")}</p>
                </div>
                <div className="rounded-lg bg-background/60 p-2.5">
                  <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Maturity</p>
                  <p className="font-medium mt-0.5">{format(new Date(current.maturityDate), "dd MMM yyyy")}</p>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5">
                  <p className="text-[10px] uppercase text-emerald-700 dark:text-emerald-400">Total payout</p>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400 mt-0.5">{fmt(current.totalPayout, current.currency)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-t border-border/60 pt-3">
                <p><span className="text-muted-foreground">Profit earned so far:</span> {fmt(current.profitEarned, current.currency)}</p>
                <p><span className="text-muted-foreground">Remaining profit:</span> {fmt(current.remainingProfit, current.currency)}</p>
                <p><span className="text-muted-foreground">Capital return:</span> {current.capitalReturn > 0 ? fmt(current.capitalReturn, current.currency) : "—"}</p>
              </div>
            </div>

            {step === "overview" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">How would you like to receive your maturity payout?</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => { setDestination("wallet"); setStep("confirm"); }}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all hover:border-emerald-500/50",
                      destination === "wallet" ? "border-emerald-500 bg-emerald-500/10" : "border-border dark:border-white/10",
                    )}
                  >
                    <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400 mb-2" />
                    <p className="font-semibold">Platform wallet</p>
                    <p className="text-xs text-muted-foreground mt-1">Credit to your fiat balance instantly on maturity — use for trading or future withdrawals.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDestination("personal"); setStep("personal-method"); }}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left transition-all hover:border-amber-500/50",
                      destination === "personal" ? "border-amber-500 bg-amber-500/10" : "border-border dark:border-white/10",
                    )}
                  >
                    <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400 mb-2" />
                    <p className="font-semibold">Personal account</p>
                    <p className="text-xs text-muted-foreground mt-1">Withdraw to your saved UPI, bank account, or crypto wallet after admin verification.</p>
                  </button>
                </div>
              </div>
            )}

            {step === "personal-method" && (
              <div className="space-y-3">
                <p className="text-sm font-medium">Select withdrawal method</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { key: "upi" as const, label: "UPI", icon: Smartphone },
                    { key: "digital_rupee" as const, label: "Digital Rupee", icon: IndianRupee },
                    { key: "bank" as const, label: "Bank transfer", icon: Building2 },
                    { key: "crypto" as const, label: "Crypto wallet", icon: TrendingUp },
                  ]).map(opt => (
                    <Button
                      key={opt.key}
                      type="button"
                      variant={method === opt.key ? "default" : "outline"}
                      className={cn("h-auto py-3 flex-col gap-1", method === opt.key && "bg-amber-500 hover:bg-amber-600 text-black")}
                      onClick={() => { setMethod(opt.key); setSelectedAccountId(null); setStep("personal-account"); }}
                    >
                      <opt.icon className="h-5 w-5" />
                      {opt.label}
                    </Button>
                  ))}
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep("overview")}>Back</Button>
              </div>
            )}

            {step === "personal-account" && method && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">Choose your {method === "digital_rupee" ? "Digital Rupee" : method === "upi" ? "UPI" : method} account</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => setManageAccountsOpen(true)}>
                    Change / add account details
                  </Button>
                </div>
                {filteredAccounts.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                    <p>No {method} account saved yet. Add one using the button above.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredAccounts.map(acc => (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={cn(
                          "w-full text-left rounded-xl border p-3 transition-all",
                          selectedAccountId === acc.id ? "border-amber-500 bg-amber-500/10" : "border-border dark:border-white/10",
                        )}
                      >
                        <PayoutAccountDetailsCard account={acc} compact />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setStep("personal-method")}>Back</Button>
                  <Button
                    size="sm"
                    disabled={!selectedAccountId}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                    onClick={() => setStep("confirm")}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-lg border border-border dark:border-white/10 p-3 text-sm space-y-1">
                  <p><span className="text-muted-foreground">Destination:</span>{" "}
                    <strong>{destination === "wallet" ? "Platform wallet (fiat balance)" : `Personal ${method} account`}</strong>
                  </p>
                  <p><span className="text-muted-foreground">Amount:</span> <strong>{fmt(current.totalPayout, current.currency)}</strong></p>
                  {destination === "personal" && selectedAccount && (
                    <div className="mt-2">
                      <PayoutAccountDetailsCard account={selectedAccount} compact />
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <Checkbox id="maturity-consent" checked={consent} onCheckedChange={v => setConsent(Boolean(v))} />
                  <Label htmlFor="maturity-consent" className="text-xs leading-relaxed cursor-pointer">
                    I authorize the platform to process my investment maturity payout of {fmt(current.totalPayout, current.currency)}
                    {destination === "personal" ? " to the selected personal account shown above" : " to my platform wallet fiat balance"}
                    on the maturity date.
                  </Label>
                </div>
                {destination === "personal" && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("personal-account")}>Change account</Button>
                )}
                {destination === "wallet" && (
                  <Button variant="ghost" size="sm" onClick={() => setStep("overview")}>Change destination</Button>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 sm:p-6 border-t border-border dark:border-white/10 flex-col sm:flex-row gap-2">
            {step === "confirm" ? (
              <Button
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                disabled={submitting || !consent}
                onClick={submit}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Submit payout preference
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground w-full text-center sm:text-left flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Please complete your choice — this reminder stays until you submit.
              </p>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageAccountsOpen} onOpenChange={setManageAccountsOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage payout accounts</DialogTitle>
            <DialogDescription>Add or update UPI, bank, and crypto withdrawal details.</DialogDescription>
          </DialogHeader>
          <PersonalPaymentAccounts />
          <DialogFooter>
            <Button onClick={() => { setManageAccountsOpen(false); void refetchAccounts(); }}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
