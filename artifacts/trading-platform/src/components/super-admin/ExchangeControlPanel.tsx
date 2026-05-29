import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ResponsiveTableShell } from "@/components/ui/responsive-data-view";
import { MobileDataCard, MobileDataRow } from "@/components/ui/mobile-data-card";
import { useToast } from "@/hooks/use-toast";
import { ArrowDownUp, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import {
  mergeExchangeRatesWithCatalog,
  rateRowKey,
  catalogDisplaySymbol,
  catalogChainDisplay,
  truncateWallet,
  type ExchangeRateRow,
} from "@/lib/exchange-catalog";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";

type Order = {
  id: number; userId: number; userEmail?: string | null; userName?: string | null;
  side: string; cryptoSymbol: string; cryptoNetwork: string;
  cryptoAmount: number; fiatAmount: number; fiatCurrency: string; rateUsd: number;
  status: string; proofUrl?: string | null; txHash?: string | null; utrReference?: string | null;
  receiveWalletAddress?: string | null; adminNotes?: string | null;
  depositGateway?: { walletAddress?: string; upiId?: string; name?: string } | null;
  payoutAccount?: { upiId?: string; bankName?: string; accountNumber?: string; upiQrUrl?: string | null } | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  awaiting_deposit: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  deposit_submitted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/10 text-red-400",
};

export function ExchangeControlPanel({
  apiBase = "/super-admin",
  readOnly = false,
}: {
  apiBase?: "/super-admin" | "/support-team";
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [rates, setRates] = useState<ExchangeRateRow[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("deposit_submitted");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [r, o] = await Promise.all([
        readOnly ? Promise.resolve([] as ExchangeRateRow[]) : staffFetch<ExchangeRateRow[]>(`${apiBase}/exchange/rates?fiat=INR`),
        staffFetch<Order[]>(`${apiBase}/exchange/orders?status=${filter}`),
      ]);
      setRates(readOnly ? [] : mergeExchangeRatesWithCatalog(r));
      setOrders(o);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
      setRates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, apiBase, readOnly]);

  const saveRatesPayload = (rows: ExchangeRateRow[]) => rows.map(r => ({
    id: r.id > 0 ? r.id : undefined,
    symbol: r.symbol,
    network: r.network || "",
    label: r.label || `${r.symbol} (${r.network})`,
    buyPriceInr: Number(r.platformSellRateInr) || 0,
    sellPriceInr: Number(r.platformBuyRateInr) || 0,
    platformSellRateInr: Number(r.platformSellRateInr) || 0,
    platformBuyRateInr: Number(r.platformBuyRateInr) || 0,
    isEnabled: (r.buyEnabled !== false || r.sellEnabled !== false) ? true : (r.isEnabled ?? false),
    buyEnabled: r.buyEnabled ?? true,
    sellEnabled: r.sellEnabled ?? true,
    sortOrder: r.sortOrder,
  }));

  const persistRates = async (nextRates: ExchangeRateRow[], toastTitle = "Exchange rates saved") => {
    setSaving(true);
    try {
      const updated = await staffFetch<ExchangeRateRow[]>("/super-admin/exchange/rates", {
        method: "PUT",
        body: JSON.stringify({ rates: saveRatesPayload(nextRates) }),
      });
      setRates(mergeExchangeRatesWithCatalog(updated));
      toast({ title: toastTitle, description: "Rates and visibility updated." });
    } catch (e: any) {
      toast({
        title: "Save failed",
        description: e.message?.includes("404")
          ? "Exchange API not found — rebuild and restart the API server (pnpm build:api && restart)."
          : e.message,
        variant: "destructive",
      });
      load();
    } finally {
      setSaving(false);
    }
  };

  const saveRates = async () => {
    await persistRates(rates);
  };

  const complete = async (id: number) => {
    try {
      await staffFetch(`/super-admin/exchange/orders/${id}/complete`, { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Order completed", description: "Ledger updated and payout recorded." });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const reject = async (id: number) => {
    const reason = window.prompt("Rejection reason (optional)") || undefined;
    try {
      await staffFetch(`/super-admin/exchange/orders/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      toast({ title: "Order rejected" });
      load();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  const updateBuyingRate = (key: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    setRates(prev => prev.map(r => rateRowKey(r) === key ? {
      ...r,
      platformBuyRateInr: num,
      platformBuyRateFiat: num,
    } : r));
  };

  const updateSellingRate = (key: string, value: string) => {
    const num = value === "" ? 0 : Number(value);
    setRates(prev => prev.map(r => rateRowKey(r) === key ? {
      ...r,
      platformSellRateInr: num,
      platformSellRateFiat: num,
    } : r));
  };

  const toggleBuyVisible = (key: string, enabled: boolean) => {
    const next = rates.map(r => rateRowKey(r) === key
      ? { ...r, buyEnabled: enabled, isEnabled: enabled || r.sellEnabled !== false }
      : r);
    setRates(next);
    void persistRates(next, enabled ? "Buy enabled" : "Buy disabled");
  };

  const toggleSellVisible = (key: string, enabled: boolean) => {
    const next = rates.map(r => rateRowKey(r) === key
      ? { ...r, sellEnabled: enabled, isEnabled: enabled || r.buyEnabled !== false }
      : r);
    setRates(next);
    void persistRates(next, enabled ? "Sell enabled" : "Sell disabled");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5 text-amber-600 dark:text-amber-400" /> Crypto Exchange Control
          </h2>
          <p className="text-sm text-muted-foreground">
            {readOnly ? "View crypto buy and sell orders for investors and managers (read-only)." : "Buying and selling rates — 1 unit of cryptocurrency · INR"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      {!readOnly && (
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Admin exchange rates</CardTitle>
          <CardDescription>
            {loading
              ? "Loading…"
              : `${rates.length} cryptocurrencies from Deposit & Withdrawal wallets · set INR rates and toggle Buy/Sell visibility`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><Skeleton className="h-48 w-full" /></div>
          ) : (
            <ResponsiveTableShell
              mobile={rates.map(r => {
                const key = rateRowKey(r);
                return (
                  <MobileDataCard key={key}>
                    <div className="flex items-start gap-2.5 mb-3 min-w-0">
                      <CryptoIcon symbol={r.symbol} network={r.network} coinName={r.coinName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm">{catalogDisplaySymbol(r)}</p>
                        {r.gatewayName && <p className="text-[10px] text-muted-foreground truncate">{r.gatewayName}</p>}
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="border-border dark:border-white/15 font-normal text-[10px]">
                            {catalogChainDisplay(r)}
                          </Badge>
                          {r.gatewayEnabled === false && (
                            <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">Gateway off</Badge>
                          )}
                          {!r.hasWallet && (
                            <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">No wallet</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <MobileDataRow label="Wallet" value={<span className="font-mono text-[11px]">{truncateWallet(r.walletAddress)}</span>} />
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <Label htmlFor={`m-buy-${key}`} className="text-[11px] text-emerald-400/90">Buy visible</Label>
                        <Switch id={`m-buy-${key}`} checked={r.buyEnabled !== false} disabled={saving} onCheckedChange={v => toggleBuyVisible(key, v)} />
                      </div>
                      <div className="flex items-center justify-between gap-2 py-0.5">
                        <Label htmlFor={`m-sell-${key}`} className="text-[11px] text-amber-400/90">Sell visible</Label>
                        <Switch id={`m-sell-${key}`} checked={r.sellEnabled !== false} disabled={saving} onCheckedChange={v => toggleSellVisible(key, v)} />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border/80 space-y-3">
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Buying rate (INR)</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={r.platformBuyRateInr || ""}
                          onChange={e => updateBuyingRate(key, e.target.value)}
                          placeholder="INR / 1 unit"
                          className="h-9 mt-1 w-full bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px] text-muted-foreground">Selling rate (INR)</Label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={r.platformSellRateInr || ""}
                          onChange={e => updateSellingRate(key, e.target.value)}
                          placeholder="INR / 1 unit"
                          className="h-9 mt-1 w-full bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                        />
                      </div>
                    </div>
                  </MobileDataCard>
                );
              })}
              desktop={
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border dark:border-white/10 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Crypto currency</TableHead>
                        <TableHead className="text-muted-foreground">Network / chain</TableHead>
                        <TableHead className="text-muted-foreground">Deposit wallet</TableHead>
                        <TableHead className="text-muted-foreground">Show to users</TableHead>
                        <TableHead className="text-muted-foreground">
                          <div>Buying rate</div>
                          <div className="text-[10px] font-normal text-muted-foreground/80">User Sell tab · our buying rate</div>
                        </TableHead>
                        <TableHead className="text-muted-foreground">
                          <div>Selling rate</div>
                          <div className="text-[10px] font-normal text-muted-foreground/80">User Buy tab · our selling rate</div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map(r => (
                        <TableRow key={rateRowKey(r)} className="border-border dark:border-white/10">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <CryptoIcon symbol={r.symbol} network={r.network} coinName={r.coinName} size="sm" />
                              <div>
                                <span className="font-medium">{catalogDisplaySymbol(r)}</span>
                                {r.gatewayName && (
                                  <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{r.gatewayName}</p>
                                )}
                              </div>
                              {r.gatewayEnabled === false && (
                                <Badge variant="outline" className="border-red-500/30 text-red-400 text-[10px]">Gateway off</Badge>
                              )}
                              {!r.hasWallet && (
                                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 text-[10px]">No wallet</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <Badge variant="outline" className="border-border dark:border-white/15 font-normal">
                              {catalogChainDisplay(r)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-muted-foreground max-w-[140px]" title={r.walletAddress || undefined}>
                            {truncateWallet(r.walletAddress)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-2 min-w-[120px]">
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`buy-${rateRowKey(r)}`} className="text-[11px] text-emerald-400/90">Buy</Label>
                                <Switch
                                  id={`buy-${rateRowKey(r)}`}
                                  checked={r.buyEnabled !== false}
                                  disabled={saving}
                                  onCheckedChange={v => toggleBuyVisible(rateRowKey(r), v)}
                                />
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <Label htmlFor={`sell-${rateRowKey(r)}`} className="text-[11px] text-amber-400/90">Sell</Label>
                                <Switch
                                  id={`sell-${rateRowKey(r)}`}
                                  checked={r.sellEnabled !== false}
                                  disabled={saving}
                                  onCheckedChange={v => toggleSellVisible(rateRowKey(r), v)}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={r.platformBuyRateInr || ""}
                                onChange={e => updateBuyingRate(rateRowKey(r), e.target.value)}
                                placeholder="INR / 1 unit"
                                className="h-9 w-36 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                              />
                              {r.platformBuyRateInr > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  1 {catalogDisplaySymbol(r)} = ₹{r.platformBuyRateInr.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                value={r.platformSellRateInr || ""}
                                onChange={e => updateSellingRate(rateRowKey(r), e.target.value)}
                                placeholder="INR / 1 unit"
                                className="h-9 w-36 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
                              />
                              {r.platformSellRateInr > 0 && (
                                <p className="text-[10px] text-muted-foreground">
                                  1 {catalogDisplaySymbol(r)} = ₹{r.platformSellRateInr.toLocaleString()}
                                </p>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
              }
            />
          )}
          {!loading && (
            <div className="p-4 border-t border-border dark:border-white/10">
              <Button className="bg-amber-500 text-black" onClick={saveRates} disabled={saving}>
                Save exchange rates
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      )}

      <div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10">
            <TabsTrigger value="deposit_submitted">Pending review</TabsTrigger>
            <TabsTrigger value="awaiting_deposit">Awaiting deposit</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {loading ? <Skeleton className="h-48 w-full" /> : orders.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No orders in this filter.</p>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Card key={o.id} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="font-medium">#{o.id} · {o.side.toUpperCase()} · {o.userName || o.userEmail || `User #${o.userId}`}</p>
                    <p className="text-sm">{o.cryptoAmount} {o.cryptoSymbol} ({o.cryptoNetwork}) ↔ {o.fiatAmount} {o.fiatCurrency}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</p>
                  </div>
                  <Badge className={STATUS_COLORS[o.status] || "bg-zinc-500/10"}>{o.status.replace(/_/g, " ")}</Badge>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  {o.utrReference && <p>UTR: {o.utrReference}</p>}
                  {o.txHash && <p className="font-mono break-all">TX: {o.txHash}</p>}
                  {o.receiveWalletAddress && <p>External wallet: {o.receiveWalletAddress}</p>}
                  {o.payoutAccount?.upiId && <p>Payout UPI: {o.payoutAccount.upiId}</p>}
                  {o.payoutAccount?.upiQrUrl && (
                    <SecureUploadLink url={o.payoutAccount.upiQrUrl} className="text-amber-600 dark:text-amber-400 underline">View seller UPI QR</SecureUploadLink>
                  )}
                  {o.proofUrl && (
                    <SecureUploadLink url={o.proofUrl} className="text-amber-600 dark:text-amber-400 underline">View payment proof</SecureUploadLink>
                  )}
                </div>
                {!readOnly && o.status === "deposit_submitted" && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => complete(o.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" />Complete order
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => reject(o.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
