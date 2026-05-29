import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { staffFetch } from "@/lib/staff-api";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { format } from "date-fns";

type Props = { userId: number };

export function SupportUserFinancePanel({ userId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["/api/support-team/users/finance", userId],
    queryFn: () => staffFetch<any>(`/support-team/users/${userId}/finance`),
    enabled: userId > 0,
    ...financeQueryOptions,
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (!data) return null;

  const empty = (label: string) => (
    <p className="text-sm text-muted-foreground py-4">No {label} for this user.</p>
  );

  return (
    <Card className="border-border dark:border-white/10 bg-muted/60 dark:bg-white/5">
      <CardHeader>
        <CardTitle className="text-base">Finance & Trading — {data.user.fullName}</CardTitle>
        <p className="text-xs text-muted-foreground">Individual account data only (read-only). Use this when resolving deposit, withdrawal, investment, or subscription tickets.</p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="transactions">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="transactions">Deposits / Withdrawals</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
            <TabsTrigger value="exchange">Exchange</TabsTrigger>
            <TabsTrigger value="mt">MT Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {data.transactions?.length ? data.transactions.map((t: any) => (
              <div key={t.id} className="flex justify-between items-center py-2 border-b border-border/80 dark:border-white/5 text-xs">
                <span className="capitalize font-medium">{t.type}</span>
                <span>{t.currency} {Number(t.amount).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{t.status}</Badge>
                <span className="text-muted-foreground">{format(new Date(t.createdAt), "MMM d, yyyy")}</span>
              </div>
            )) : empty("transactions")}
          </TabsContent>

          <TabsContent value="investments" className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {data.investments?.length ? data.investments.map((i: any) => (
              <div key={i.id} className="flex justify-between items-center py-2 border-b border-border/80 dark:border-white/5 text-xs">
                <span className="font-medium">{i.planName || i.type}</span>
                <span>{i.currency} {Number(i.amount).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{i.status}</Badge>
              </div>
            )) : empty("investments")}
            {data.roiPayouts?.length > 0 && (
              <div className="pt-3">
                <p className="text-[10px] uppercase text-muted-foreground mb-2">ROI Payouts</p>
                {data.roiPayouts.map((p: any) => (
                  <div key={p.id} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                    <span>{p.planName || "Payout"}</span>
                    <span>${Number(p.amount).toLocaleString()}</span>
                    <Badge variant="outline" className="text-[10px]">{p.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="subscriptions" className="mt-4 space-y-4 max-h-72 overflow-y-auto">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Algo Subscriptions</p>
              {data.algoSubscriptions?.length ? data.algoSubscriptions.map((s: any) => (
                <div key={s.id} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                  <span>{s.strategyName}</span>
                  <Badge variant="outline" className="text-[10px]">{s.active ? "Active" : "Inactive"}</Badge>
                </div>
              )) : <p className="text-xs text-muted-foreground">None</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">EA Subscriptions</p>
              {data.eaSubscriptions?.length ? data.eaSubscriptions.map((s: any) => (
                <div key={s.id} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                  <span>{s.strategyName} · {s.mtAccountNumber || "—"}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{s.status}</Badge>
                </div>
              )) : <p className="text-xs text-muted-foreground">None</p>}
            </div>
          </TabsContent>

          <TabsContent value="exchange" className="mt-4 space-y-2 max-h-72 overflow-y-auto">
            {data.exchangeOrders?.length ? data.exchangeOrders.map((o: any) => (
              <div key={o.id} className="flex justify-between items-center py-2 border-b border-border/80 dark:border-white/5 text-xs">
                <span className="capitalize">{o.side} {o.cryptoSymbol}</span>
                <span>{o.fiatCurrency} {Number(o.fiatAmount).toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px] capitalize">{o.status?.replace(/_/g, " ")}</Badge>
              </div>
            )) : empty("exchange orders")}
          </TabsContent>

          <TabsContent value="mt" className="mt-4 space-y-4 max-h-72 overflow-y-auto">
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">Linked MT Accounts</p>
              {data.mtAccounts?.length ? data.mtAccounts.map((a: any) => (
                <div key={a.id} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                  <span>{a.platform} · {a.accountNumber}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{a.status || "—"}</Badge>
                </div>
              )) : <p className="text-xs text-muted-foreground">None</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground mb-2">MT Link Requests</p>
              {data.mtRequests?.length ? data.mtRequests.map((r: any) => (
                <div key={r.id} className="flex justify-between py-1.5 text-xs border-b border-border/50">
                  <span>{r.platform} · {r.accountNumber}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
                </div>
              )) : <p className="text-xs text-muted-foreground">None</p>}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
