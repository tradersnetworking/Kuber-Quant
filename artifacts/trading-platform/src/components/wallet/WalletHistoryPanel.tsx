import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { WalletTabsList, WalletTabsTrigger } from "@/components/wallet/WalletSectionTabs";
import { cn } from "@/lib/utils";
import { tabChipClasses } from "@/lib/tab-tones";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { APP_CARD, APP_STAT_GRID } from "@/lib/ui-system";
import { authFetchJson, authFetch, apiPath } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { appendPeriodQuery, defaultFinancePeriod, todayIso, type StatsPeriod } from "@/lib/finance-period";
import { ArrowDownLeft, ArrowUpRight, BookOpen, ClipboardList, RefreshCw, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { getShareUserDisplayName } from "@/lib/user-display-name";

type LedgerEntry = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  walletType: string;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: number | null;
  description?: string | null;
  createdAt: string;
};

type TxnRequest = {
  id: number;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  notes?: string | null;
  paymentAccountId?: number | null;
  payoutAccount?: {
    id: number;
    label: string;
    accountType: string;
    upiId?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
    cryptoSymbol?: string | null;
    cryptoNetwork?: string | null;
    walletAddress?: string | null;
  } | null;
  createdAt: string;
};

type WalletHistory = {
  periodLabel?: string;
  summary: {
    totalDeposited: number;
    totalWithdrawn: number;
    periodDeposited?: number;
    periodWithdrawn?: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    rejectedDeposits: number;
    rejectedWithdrawals: number;
  };
  requests: TxnRequest[];
  ledger: LedgerEntry[];
};

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

function payoutDestinationLabel(tx: TxnRequest): string {
  if (tx.payoutAccount) {
    const a = tx.payoutAccount;
    if (a.accountType === "upi") return `${a.label} · UPI ${a.upiId || ""}`.trim();
    if (a.accountType === "bank") return `${a.label} · ${a.bankName || "Bank"} ****${String(a.accountNumber || "").slice(-4)}`;
    if (a.accountType === "crypto") {
      return `${a.label} · ${a.cryptoSymbol || ""} ${a.cryptoNetwork || ""} ${a.walletAddress?.slice(0, 10) || ""}…`.trim();
    }
    return a.label;
  }
  return tx.paymentMethod || tx.notes || "—";
}

function fmtAmount(n: number, currency: string) {
  const prefix = !["BTC", "ETH"].includes(currency) && currency !== "USDT" ? "$" : "";
  return `${prefix}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
}

function WithdrawalShareButton({
  tx,
  userName,
  referralCode,
  avatarUrl,
  className,
}: {
  tx: TxnRequest;
  userName: string;
  referralCode?: string;
  avatarUrl?: string | null;
  className?: string;
}) {
  if (tx.type !== "withdrawal" || tx.status !== "approved" || tx.amount <= 0) return null;

  return (
    <ProfitShareButton
      userName={userName}
      referralCode={referralCode}
      avatarUrl={avatarUrl}
      className={className}
      label="Share Withdrawal"
      payload={{
        service: "withdrawal",
        profitAmount: tx.amount,
        currency: tx.currency,
        detailLabel: payoutDestinationLabel(tx),
        withdrawalPhase: "completed",
      }}
    />
  );
}

function buildRequestColumns(
  userName: string,
  referralCode?: string,
  avatarUrl?: string | null,
): ResponsiveColumn<TxnRequest>[] {
  return [
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      cell: tx => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobileTitle: true,
      cell: tx => {
        const isDeposit = tx.type === "deposit";
        return (
          <span className={cn(
            "inline-flex items-center gap-1 text-sm capitalize font-medium",
            isDeposit ? "text-green-700 dark:text-green-400" : "text-red-400",
          )}>
            {isDeposit ? <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" /> : <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />}
            {tx.type}
          </span>
        );
      },
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold tabular-nums",
      cell: tx => fmtAmount(tx.amount, tx.currency),
    },
    {
      key: "destination",
      header: "Method / Destination",
      hideOnMobile: true,
      cell: tx => (
        <div className="text-xs text-muted-foreground max-w-[240px]">
          <span className="line-clamp-2">{payoutDestinationLabel(tx)}</span>
          {tx.payoutAccount && (
            <Badge variant="outline" className="mt-1 text-[10px] capitalize border-border dark:border-white/15">
              {tx.payoutAccount.accountType} · #{tx.payoutAccount.id}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: tx => (
        <Badge className={cn("text-[10px] border capitalize", STATUS_BADGE[tx.status] || "")}>{tx.status}</Badge>
      ),
    },
    {
      key: "ref",
      header: "Ref",
      hideOnMobile: true,
      cell: tx => <span className="text-xs text-muted-foreground font-mono">#{tx.id}</span>,
    },
    {
      key: "share",
      header: "Share",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: tx => (
        <WithdrawalShareButton tx={tx} userName={userName} referralCode={referralCode} avatarUrl={avatarUrl} />
      ),
    },
  ];
}

function buildLedgerColumns(): ResponsiveColumn<LedgerEntry>[] {
  return [
    {
      key: "date",
      header: "Date",
      hideOnMobile: true,
      cell: entry => (
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      mobileTitle: true,
      cell: entry => <span className="capitalize text-sm font-medium">{entry.type}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      headerClassName: "text-right",
      cellClassName: "text-right font-semibold tabular-nums",
      cell: entry => (
        <span className={entry.amount >= 0 ? "text-green-700 dark:text-green-400" : "text-red-400"}>
          {entry.amount >= 0 ? "+" : "−"}{fmtAmount(entry.amount, entry.currency)}
        </span>
      ),
    },
    {
      key: "wallet",
      header: "Wallet",
      cell: entry => <span className="capitalize text-xs text-muted-foreground">{entry.walletType}</span>,
    },
    {
      key: "before",
      header: "Balance Before",
      hideOnMobile: true,
      cellClassName: "tabular-nums text-sm",
      cell: entry => entry.balanceBefore.toLocaleString(),
    },
    {
      key: "after",
      header: "Balance After",
      hideOnMobile: true,
      cellClassName: "tabular-nums text-sm font-medium",
      cell: entry => entry.balanceAfter.toLocaleString(),
    },
    {
      key: "description",
      header: "Description",
      hideOnMobile: true,
      cell: entry => (
        <span className="text-xs text-muted-foreground max-w-[180px] truncate block">
          {entry.description || "—"}
        </span>
      ),
    },
    {
      key: "ref",
      header: "Ref",
      cell: entry => (
        <span className="text-xs text-muted-foreground font-mono">
          {entry.referenceType === "transaction" && entry.referenceId ? `#${entry.referenceId}` : "—"}
        </span>
      ),
    },
  ];
}

export function WalletHistoryPanel({ compact }: { compact?: boolean }) {
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [view, setView] = useState<"requests" | "ledger">("requests");
  const [period, setPeriod] = useState<StatsPeriod>(defaultFinancePeriod());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [appliedCustom, setAppliedCustom] = useState({ from: customFrom, to: customTo });
  const [downloading, setDownloading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const referralCode = (user as { referralCode?: string } | null)?.referralCode;
  const avatarUrl = user?.avatarUrl;
  const userName = getShareUserDisplayName(user);

  const periodQuery = appendPeriodQuery(
    "",
    period,
    period === "custom" ? appliedCustom.from : undefined,
    period === "custom" ? appliedCustom.to : undefined,
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/wallet/history", filter, period, appliedCustom],
    queryFn: () => authFetchJson<WalletHistory>(`/wallet/history?type=${filter}&limit=100${periodQuery ? `&${periodQuery.slice(1)}` : ""}`),
    ...financeQueryOptions,
  });

  const summary = data?.summary;

  const downloadStatement = async () => {
    setDownloading(true);
    try {
      const statementPath = appendPeriodQuery(
        "/wallet/statement",
        period,
        period === "custom" ? appliedCustom.from : undefined,
        period === "custom" ? appliedCustom.to : undefined,
      );
      const res = await authFetch(apiPath(statementPath));
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Download failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.download = match?.[1] || `kuber-statement-${todayIso()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Statement downloaded", description: data?.periodLabel ? `Period: ${data.periodLabel}` : undefined });
    } catch (e: unknown) {
      toast({
        title: "Could not download statement",
        description: e instanceof Error ? e.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      {!compact && summary && (
        <div className={APP_STAT_GRID}>
          <KpiStatCard
            label={data?.periodLabel ? `Deposited (${data.periodLabel})` : "Total Deposited"}
            value={`$${(summary.periodDeposited ?? summary.totalDeposited).toLocaleString()}`}
            iconClassName="text-green-700 dark:text-green-400"
            compact
          />
          <KpiStatCard
            label={data?.periodLabel ? `Withdrawn (${data.periodLabel})` : "Total Withdrawn"}
            value={`$${(summary.periodWithdrawn ?? summary.totalWithdrawn).toLocaleString()}`}
            iconClassName="text-red-400"
            compact
          />
          <KpiStatCard
            label="Pending"
            value={summary.pendingDeposits + summary.pendingWithdrawals}
            sub={`${summary.pendingDeposits} dep · ${summary.pendingWithdrawals} wdr`}
            iconClassName="text-amber-600 dark:text-amber-400"
            compact
          />
          <KpiStatCard
            label="Ledger Entries"
            value={data?.ledger.length ?? 0}
            sub="Balance movements"
            compact
          />
        </div>
      )}

      <Card className={cn(APP_CARD, "bg-muted/60 dark:bg-white/5")}>
        <CardHeader className="pb-3 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
            <div className="min-w-0">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">Deposit & Withdrawal History</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1">
                Transaction requests and wallet ledger entries
              </CardDescription>
            </div>
            <div className="flex flex-col xs:flex-row gap-2 shrink-0 w-full sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={downloadStatement}
                disabled={downloading || isFetching}
                className="border-border dark:border-white/10 w-full sm:w-auto"
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Download PDF
              </Button>
              <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="border-border dark:border-white/10 w-full sm:w-auto">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 px-3 sm:px-6 min-w-0">
          <CalendarPeriodFilter
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            periodLabel={data?.periodLabel}
            compact
            onPeriodChange={setPeriod}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustom={() => setAppliedCustom({ from: customFrom, to: customTo })}
          />
          <div className="flex flex-wrap gap-2 min-w-0">
            {([
              { key: "all" as const, label: "All", tone: "blue" as const },
              { key: "deposit" as const, label: "Deposits", tone: "green" as const },
              { key: "withdrawal" as const, label: "Withdrawals", tone: "red" as const },
            ]).map(({ key, label, tone }) => (
              <Button
                key={key}
                size="sm"
                variant="outline"
                className={cn(
                  "rounded-lg border px-3 font-medium transition-colors",
                  tabChipClasses(tone, filter === key),
                )}
                onClick={() => setFilter(key)}
              >
                {label}
              </Button>
            ))}
          </div>

          <Tabs value={view} onValueChange={v => setView(v as any)}>
            <WalletTabsList className="w-full">
              <WalletTabsTrigger value="requests" tone="amber" className="gap-1.5 flex-1 sm:flex-none">
                <ClipboardList className="h-3.5 w-3.5" /> Requests
              </WalletTabsTrigger>
              <WalletTabsTrigger value="ledger" tone="cyan" className="gap-1.5 flex-1 sm:flex-none">
                <BookOpen className="h-3.5 w-3.5" /> Ledger
              </WalletTabsTrigger>
            </WalletTabsList>

            <TabsContent value="requests" className="mt-4 min-w-0">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !data?.requests.length ? (
                <p className="text-center py-10 text-sm text-muted-foreground">No deposit or withdrawal requests yet.</p>
              ) : (
                <ResponsiveDataView
                  caption="Deposit and withdrawal requests"
                  data={data.requests}
                  rowKey={tx => tx.id}
                  columns={buildRequestColumns(userName, referralCode, avatarUrl)}
                  rowClassName="border-border/80 dark:border-white/5"
                  mobileHeader={tx => (
                    <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                      <p className="text-[11px] font-mono text-muted-foreground truncate">#{tx.id}</p>
                      <Badge className={cn("text-[10px] border capitalize shrink-0", STATUS_BADGE[tx.status] || "")}>{tx.status}</Badge>
                    </div>
                  )}
                  mobileFooter={tx => (
                    <>
                      <div className="mt-2 space-y-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Method / Destination</p>
                        <p className="text-xs text-muted-foreground break-words line-clamp-3">{payoutDestinationLabel(tx)}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {format(new Date(tx.createdAt), "dd/MM/yyyy · HH:mm")}
                      </p>
                      <div className="mt-3 pt-3 border-t border-border/60 dark:border-white/5">
                        <WithdrawalShareButton tx={tx} userName={userName} referralCode={referralCode} avatarUrl={avatarUrl} className="w-full" />
                      </div>
                    </>
                  )}
                />
              )}
            </TabsContent>

            <TabsContent value="ledger" className="mt-4 min-w-0">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !data?.ledger.length ? (
                <p className="text-center py-10 text-sm text-muted-foreground px-2">
                  No ledger entries yet. Ledger records balance changes when deposits are approved, withdrawals are held, or rejected withdrawals are refunded.
                </p>
              ) : (
                <ResponsiveDataView
                  caption="Wallet ledger entries"
                  data={data.ledger}
                  rowKey={entry => entry.id}
                  columns={buildLedgerColumns()}
                  rowClassName="border-border/80 dark:border-white/5"
                  mobileHeader={entry => (
                    <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                      <p className="text-xs font-medium capitalize truncate">{entry.type}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {format(new Date(entry.createdAt), "dd/MM/yyyy · HH:mm")}
                      </p>
                    </div>
                  )}
                  mobileFooter={entry => (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] min-w-0">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase text-muted-foreground">Wallet</p>
                          <p className="capitalize truncate">{entry.walletType}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[10px] uppercase text-muted-foreground">Ref</p>
                          <p className="font-mono truncate">
                            {entry.referenceType === "transaction" && entry.referenceId ? `#${entry.referenceId}` : "—"}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase text-muted-foreground">Before</p>
                          <p className="truncate">{entry.balanceBefore.toLocaleString()}</p>
                        </div>
                        <div className="min-w-0 text-right">
                          <p className="text-[10px] uppercase text-muted-foreground">After</p>
                          <p className="font-medium truncate">{entry.balanceAfter.toLocaleString()}</p>
                        </div>
                      </div>
                      {entry.description && (
                        <p className="mt-2 text-[11px] text-muted-foreground break-words line-clamp-2">{entry.description}</p>
                      )}
                    </>
                  )}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
