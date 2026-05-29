import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import {
  enrichDepositAccount,
  getOnlineGatewayLabel,
  getOnlineGatewayMeta,
  isLiveCheckoutGateway,
  type DepositAccount,
  type DepositAccountsResponse,
} from "./deposit-account-utils";
import { processOnlinePayment } from "./online-payment";
import { CreditCard, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import { PaymentMethodSelect, PaymentMethodTabsTrigger } from "@/components/wallet/PaymentMethodField";
import { GATEWAY_BRANDS } from "@/lib/payment-method-catalog";
import { PaymentMethodBrandTile } from "@/components/wallet/PaymentMethodBrandIcon";

export function OnlineGatewayCheckoutPanel({
  onSuccess,
  compact,
  initialGatewayId,
}: {
  onSuccess?: () => void;
  compact?: boolean;
  initialGatewayId?: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const { data: depositAccounts } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<DepositAccountsResponse>("/payments/deposit-accounts"),
  });

  const { data: onlineStatus } = useQuery({
    queryKey: ["/api/payments/online/status"],
    queryFn: () => authFetchJson<Record<string, boolean>>("/payments/online/status"),
  });

  const gateways = (depositAccounts?.online || [])
    .map(enrichDepositAccount)
    .filter(g => isLiveCheckoutGateway(g.type));

  useEffect(() => {
    if (initialGatewayId && gateways.some(g => String(g.id) === initialGatewayId)) {
      setSelectedId(initialGatewayId);
      return;
    }
    if (gateways.length && !selectedId) setSelectedId(String(gateways[0].id));
  }, [gateways, selectedId, initialGatewayId]);

  const active = gateways.find(g => String(g.id) === selectedId);
  const meta = active ? getOnlineGatewayMeta(active.type) : undefined;
  const configured = active ? onlineStatus?.[active.type] : false;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    setLoading(true);
    try {
      const result = await processOnlinePayment(active.type, Number(amount), {
        onSuccess: () => {
          toast({ title: "Payment successful", description: "Funds credited to your wallet." });
          setAmount("");
          onSuccess?.();
        },
        onlineConfigured: onlineStatus,
      });
      if (!result.ok) {
        toast({ title: result.title || "Payment unavailable", description: result.message, variant: "destructive" });
      }
    } catch (err: any) {
      if (err.message !== "Payment cancelled") {
        toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  if (!gateways.length) {
    return (
      <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10 border-dashed">
        <CardContent className={`text-center text-sm text-muted-foreground ${compact ? "py-6" : "py-10"}`}>
          <CreditCard className="h-8 w-8 mx-auto mb-2 text-amber-400/50" />
          <p className="font-medium text-foreground/80">Payment gateways not enabled yet</p>
          <p className="mt-1 max-w-sm mx-auto">
            Admin can enable Razorpay, PhonePe, Paytm, PayU, Cashfree, Stripe, Instamojo, Pine Labs, Easebuzz in Super Admin → Payments.
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 mt-4 max-w-lg mx-auto">
            {GATEWAY_BRANDS.map(g => (
              <PaymentMethodBrandTile key={g.id} item={g} compact className="w-[4.5rem] sm:w-auto" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 min-w-0">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {GATEWAY_BRANDS.slice(0, 8).map(g => (
          <PaymentMethodBrandTile key={g.id} item={g} compact />
        ))}
      </div>
      {gateways.length > 1 && (
        <>
          <PaymentMethodSelect
            tone="gateway"
            label="Select payment gateway"
            value={selectedId}
            onValueChange={setSelectedId}
            placeholder="-- Select Gateway --"
            options={gateways.map(g => ({
              value: String(g.id),
              label: `${g.name || getOnlineGatewayLabel(g.type)}${onlineStatus?.[g.type] ? " ✓" : ""}`,
            }))}
          />
          <Tabs value={selectedId} onValueChange={setSelectedId}>
            <TabsList className="bg-violet-500/5 border border-violet-500/25 flex-wrap h-auto gap-1 p-1">
              {gateways.map(g => (
                <PaymentMethodTabsTrigger
                  key={g.id}
                  value={String(g.id)}
                  tone="gateway"
                  className="text-xs gap-1 min-w-0"
                >
                  <span className="truncate">{getOnlineGatewayLabel(g.type)}</span>
                  {onlineStatus?.[g.type] && <Zap className="h-3 w-3 text-green-700 dark:text-green-400" />}
                </PaymentMethodTabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </>
      )}

      {active && (
        <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                {active.name || getOnlineGatewayLabel(active.type)}
              </CardTitle>
              {active.badge && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px]">{active.badge}</Badge>}
              {configured && <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-[10px]">Live</Badge>}
            </div>
            <CardDescription>{active.description || meta?.description || "Instant card / UPI checkout"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePay} className="space-y-3">
              <div className="space-y-1">
                <FinanceFieldLabel tone="amount">Amount (INR)</FinanceFieldLabel>
                <Input
                  type="number"
                  required
                  min={active.minAmount || 100}
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className={financeInputClass()}
                />
                <p className="text-[11px] text-muted-foreground">Min ₹{active.minAmount || 100}</p>
              </div>
              <Button type="submit" size="wrap" disabled={loading} className={cn("w-full", DEPOSIT_BUTTON_CLASS, mobileBtnWrap)}>
                {loading ? "Processing..." : `Pay with ${getOnlineGatewayLabel(active.type)}`}
              </Button>
              {!configured && (
                <p className="text-[11px] text-amber-400/80 text-center">
                  Gateway enabled but API keys not set on server — contact admin.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
