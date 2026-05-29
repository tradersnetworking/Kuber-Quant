import { useState } from "react";
import { Link, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { useGetWallet, useWalletTransfer } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { WalletTabsList, WalletTabsTrigger } from "@/components/wallet/WalletSectionTabs";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Send, Landmark, ArrowDownUp, LayoutGrid, Shield } from "lucide-react";
import { WalletDepositForm } from "@/components/wallet/DepositDialog";
import { PersonalPaymentAccounts } from "@/components/wallet/PersonalPaymentAccounts";
import { WithdrawToPersonalAccountForm } from "@/components/wallet/WithdrawToPersonalAccount";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { DownloadAppButton } from "@/components/pwa/DownloadAppButton";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { WalletHistoryPanel } from "@/components/wallet/WalletHistoryPanel";
import { FiatBalanceDisplay } from "@/components/finance/FiatBalanceDisplay";
import { authFetchJson } from "@/lib/token-store";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";
import { exchangeCryptoSymbol, formatExchangeRateCell } from "@/lib/exchange-display";
import { mergeExchangeRatesWithCatalog, ourSellingRateInr, EXCHANGE_RATE_CATALOG, rateRowKey, type ExchangeRateRow } from "@/lib/exchange-catalog";
import { DepositWithdrawalMethodsBanner } from "@/components/finance/DepositWithdrawalMethodsBanner";
import { AppPage } from "@/components/layout/AppPage";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { APP_CARD, APP_CHART_GRID, APP_FORM_STACK, APP_STAT_GRID } from "@/lib/ui-system";

const VALID_TABS = new Set(["overview", "deposit", "withdraw", "transfer", "exchange", "history"]);

function mapApiExchangeRates(raw: Array<{ cryptoSymbol: string; sellRateInr: number }>): ExchangeRateRow[] {
  if (!raw.length) return mergeExchangeRatesWithCatalog([]);
  return raw.map((row) => {
    const [symbol, ...netParts] = row.cryptoSymbol.split("_");
    const network = netParts.join("_");
    const catalogMatch =
      EXCHANGE_RATE_CATALOG.find(r => r.symbol === symbol && (!network || r.network === network)) ??
      EXCHANGE_RATE_CATALOG.find(r => r.symbol === symbol) ??
      EXCHANGE_RATE_CATALOG[0];
    return {
      ...catalogMatch,
      symbol: symbol || catalogMatch.symbol,
      network: network || catalogMatch.network,
      sellPriceInr: row.sellRateInr,
      platformSellRateInr: row.sellRateInr,
      platformSellRateFiat: row.sellRateInr,
    };
  });
}

type WithdrawalLimits = {
  tier: string;
  limits: { dailyCount: number; dailyUsd: number; weeklyUsd: number };
  dailyCount: number;
  dailyUsd: number;
  weeklyUsd: number;
};

export default function MoneyHubPage() {
  const { t } = useTranslation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const tabParam = params.get("tab") || "overview";
  const defaultTab = VALID_TABS.has(tabParam) ? tabParam : "overview";

  const { data: wallet, refetch, isLoading: isLoadingWallet } = useGetWallet({ query: financeQueryOptions as any });
  const { data: limits } = useQuery({
    queryKey: ["/api/wallet/withdrawal-limits"],
    queryFn: () => authFetchJson<WithdrawalLimits>("/wallet/withdrawal-limits"),
    ...financeQueryOptions,
  });
  const { data: exchangeRates = [] } = useQuery({
    queryKey: ["/api/exchange/rates", "INR"],
    queryFn: () => authFetchJson<Array<{ cryptoSymbol: string; sellRateInr: number }>>("/exchange/rates?fiat=INR"),
    ...financeQueryOptions,
  });
  const previewRates = mapApiExchangeRates(exchangeRates).slice(0, 4);
  const transferMutation = useWalletTransfer();
  const { toast } = useToast();

  const [transferData, setTransferData] = useState({
    fromWallet: "fiat" as "fiat" | "crypto",
    toWallet: "crypto" as "fiat" | "crypto",
    amount: "",
  });

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({
      data: {
        fromWallet: transferData.fromWallet as any,
        toWallet: transferData.toWallet as any,
        amount: Number(transferData.amount),
      },
    }, {
      onSuccess: () => {
        toast({ title: t("wallet.transferSuccess"), description: t("wallet.transferSuccessDesc") });
        setTransferData({ ...transferData, amount: "" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: t("wallet.transferFailed"), description: err.message, variant: "destructive" });
      },
    });
  };

  const balances = [
    { label: t("wallet.fiatBalance"), value: wallet?.fiatBalance || 0, currency: "USD", icon: Landmark, color: "text-amber-500", isFiat: true },
    { label: t("wallet.cryptoBalance"), value: wallet?.cryptoBalance || 0, currency: "USDT", icon: Wallet, color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <AppPage
      title={
        <div className="min-w-0 w-full max-w-full">
          <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            {t("money.title", { defaultValue: "Money Hub" })}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 w-full max-w-full whitespace-normal">
            {t("money.subtitle", { defaultValue: "Deposit, withdraw, transfer, and exchange — all in one place." })}
          </p>
        </div>
      }
      actions={
        <div className="flex flex-row flex-wrap items-center gap-1.5 sm:gap-2 min-w-0">
          <WalletQuickActions onSuccess={() => refetch()} layout="inline" compact />
          <DownloadAppButton compact />
        </div>
      }
    >
      <Tabs defaultValue={defaultTab} className="space-y-4 min-w-0">
        <WalletTabsList className="flex-wrap h-auto">
          <WalletTabsTrigger value="overview" tone="amber" title="Overview">
            <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Overview
          </WalletTabsTrigger>
          <WalletTabsTrigger value="deposit" tone="emerald" title="Deposit">Deposit</WalletTabsTrigger>
          <WalletTabsTrigger value="withdraw" tone="rose" title="Withdraw">Withdraw</WalletTabsTrigger>
          <WalletTabsTrigger value="transfer" tone="violet" title="Transfer">Transfer</WalletTabsTrigger>
          <WalletTabsTrigger value="exchange" tone="amber" title="Exchange">
            <ArrowDownUp className="h-3.5 w-3.5 mr-1" /> Exchange
          </WalletTabsTrigger>
          <WalletTabsTrigger value="history" tone="cyan" title="History">History</WalletTabsTrigger>
        </WalletTabsList>

        <TabsContent value="overview" className="space-y-4 min-w-0">
          <DepositWithdrawalMethodsBanner />
          <div className={APP_STAT_GRID}>
            {balances.map((item, i) => (
              <KpiStatCard
                key={i}
                label={item.label}
                loading={isLoadingWallet}
                icon={<item.icon className={`h-4 w-4 ${item.color}`} />}
                value={
                  item.isFiat ? (
                    <FiatBalanceDisplay wallet={wallet} size="lg" align="left" />
                  ) : (
                    `$${item.value.toLocaleString()}`
                  )
                }
              />
            ))}
          </div>

          {limits && (
            <Card className={APP_CARD}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex flex-wrap items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-500 shrink-0" />
                  Withdrawal limits
                  <Badge variant="outline" className="capitalize">{limits.tier}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={APP_STAT_GRID}>
                  <KpiStatCard
                    compact
                    label="Today (count)"
                    value={`${limits.dailyCount} / ${limits.limits.dailyCount}`}
                  />
                  <KpiStatCard
                    compact
                    label="Today (USD)"
                    value={`$${limits.dailyUsd.toLocaleString()} / $${limits.limits.dailyUsd.toLocaleString()}`}
                  />
                  <KpiStatCard
                    compact
                    label="This week (USD)"
                    value={`$${limits.weeklyUsd.toLocaleString()} / $${limits.limits.weeklyUsd.toLocaleString()}`}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <Card className={APP_CARD}>
            <CardHeader>
              <CardTitle className="text-base">Live exchange rates</CardTitle>
              <CardDescription>Buy or sell crypto with INR — open Exchange for full flow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={APP_CHART_GRID}>
                {previewRates.map(rate => (
                  <div key={rateRowKey(rate)} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm min-w-0">
                    <span className="flex items-center gap-2 font-medium min-w-0 truncate">
                      <CryptoIcon symbol={exchangeCryptoSymbol(rate)} className="h-5 w-5 shrink-0" />
                      {exchangeCryptoSymbol(rate)}
                    </span>
                    <span className="text-muted-foreground shrink-0 ml-2">{formatExchangeRateCell(rate, ourSellingRateInr(rate))}</span>
                  </div>
                ))}
              </div>
              <Link href="/exchange">
                <Button className="mt-4 w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-semibold">Open Exchange</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposit" className="space-y-4 min-w-0">
          <DepositWithdrawalMethodsBanner />
          <Card className={APP_CARD}>
            <CardHeader>
              <CardTitle>Deposit to Portal Wallet</CardTitle>
              <CardDescription>UPI, bank transfer, payment gateway, or crypto</CardDescription>
            </CardHeader>
            <CardContent>
              <WalletDepositForm onSuccess={() => refetch()} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdraw" className="space-y-4 min-w-0">
          <DepositWithdrawalMethodsBanner />
          <div className={APP_CHART_GRID}>
            <Card className={`${APP_CARD} min-w-0`}>
              <CardHeader>
                <CardTitle>Wallet → Personal Account</CardTitle>
                <CardDescription>UPI, bank transfer, or crypto payout</CardDescription>
              </CardHeader>
              <CardContent>
                <WithdrawToPersonalAccountForm onSuccess={() => refetch()} />
              </CardContent>
            </Card>
            <PersonalPaymentAccounts />
          </div>
        </TabsContent>

        <TabsContent value="transfer" className="min-w-0">
          <Card className={`${APP_CARD} max-w-md`}>
            <CardHeader>
              <CardTitle>Internal Transfer</CardTitle>
              <CardDescription>Move funds between Fiat and Crypto wallets</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTransfer} className={APP_FORM_STACK}>
                <div className="space-y-2">
                  <Label>From</Label>
                  <Select value={transferData.fromWallet} onValueChange={v => setTransferData({ ...transferData, fromWallet: v as any, toWallet: v === "fiat" ? "crypto" : "fiat" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fiat">Fiat Wallet</SelectItem>
                      <SelectItem value="crypto">Crypto Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-center"><Send className="h-4 w-4 rotate-90 text-muted-foreground" /></div>
                <div className="space-y-2">
                  <Label>To</Label>
                  <Input value={transferData.toWallet === "fiat" ? "Fiat Wallet" : "Crypto Wallet"} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" placeholder="0.00" value={transferData.amount} onChange={e => setTransferData({ ...transferData, amount: e.target.value })} required />
                </div>
                <Button type="submit" className="w-full bg-amber-500 text-black font-semibold" disabled={transferMutation.isPending}>
                  {transferMutation.isPending ? "Processing..." : "Transfer Now"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchange" className="space-y-4 min-w-0">
          <Card className={APP_CARD}>
            <CardHeader>
              <CardTitle>Crypto Exchange</CardTitle>
              <CardDescription>Buy and sell crypto with live INR rates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={APP_CHART_GRID}>
                {previewRates.map(rate => (
                  <div key={`ex-${rateRowKey(rate)}`} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm min-w-0">
                    <span className="flex items-center gap-2 font-medium min-w-0 truncate">
                      <CryptoIcon symbol={exchangeCryptoSymbol(rate)} className="h-5 w-5 shrink-0" />
                      {exchangeCryptoSymbol(rate)}
                    </span>
                    <span className="shrink-0 ml-2">{formatExchangeRateCell(rate, ourSellingRateInr(rate))}</span>
                  </div>
                ))}
              </div>
              <Link href="/exchange">
                <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-black font-semibold">Go to full Exchange</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <WalletHistoryPanel />
        </TabsContent>
      </Tabs>
    </AppPage>
  );
}
