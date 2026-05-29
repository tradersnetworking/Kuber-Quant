import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { WalletTabsList, WalletTabsTrigger } from "@/components/wallet/WalletSectionTabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw, Search, Download, CheckCircle, XCircle, BookOpen, ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CryptoBlockchainVerifyPanel, isCryptoTransaction } from "@/components/super-admin/CryptoBlockchainVerifyPanel";
import { staffFetch } from "@/lib/staff-api";
import { authFetch, apiPath } from "@/lib/token-store";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";
import { STAFF_PAGE_STACK, STAFF_HEADER_ROW, STAFF_STAT_GRID, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { TransactionProofReviewBlock, TransactionProofLink } from "@/components/finance/TransactionProofReviewBlock";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { appendPeriodQuery, defaultStaffFinancePeriod, todayIso, type StatsPeriod } from "@/lib/finance-period";

interface PlatformTransaction {
  id: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
  reviewedAt?: string | null;
  reviewedByEmail?: string | null;
  notes?: string;
  paymentMethod?: string;
  proofUrl?: string | null;
  utrReference?: string | null;
  gatewayProvider?: string | null;
  adminNotes?: string | null;
  txHash?: string | null;
}

interface LedgerEntry {
  id: number;
  userId: number;
  userEmail?: string | null;
  userName?: string | null;
  type: string;
  amount: number;
  currency: string;
  walletType: string;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string | null;
  referenceId?: number | null;
  description?: string | null;
  transactionStatus?: string | null;
  createdAt: string;
}

interface LedgerSummary {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  totalPending: number;
}

const statusColor: Record<string, string> = {
  approved: "bg-green-500/20 text-green-700 dark:text-green-400",
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  rejected: "bg-red-500/20 text-red-400",
};

export function FinanceLedgerPanel({
  apiBase = "/admin",
  readOnly = false,
}: {
  apiBase?: "/admin" | "/support-team";
  readOnly?: boolean;
} = {}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState<PlatformTransaction[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [depositStatusFilter, setDepositStatusFilter] = useState("pending");
  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState("pending");
  const [period, setPeriod] = useState<StatsPeriod>(defaultStaffFinancePeriod());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [appliedCustom, setAppliedCustom] = useState({ from: customFrom, to: customTo });
  const [periodLabel, setPeriodLabel] = useState<string>();
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: "approve" | "reject"; tx?: PlatformTransaction } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [chainVerified, setChainVerified] = useState(false);

  const periodQuery = appendPeriodQuery(
    "",
    period,
    period === "custom" ? appliedCustom.from : undefined,
    period === "custom" ? appliedCustom.to : undefined,
  );

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformTransaction[]>(`${apiBase}/transactions${periodQuery}`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadLedger = async () => {
    setLedgerLoading(true);
    try {
      const ledgerRes = await staffFetch<{ entries: LedgerEntry[]; periodLabel?: string }>(
        `${apiBase}/ledger?limit=200${periodQuery ? `&${periodQuery.slice(1)}` : ""}`,
      );
      setLedger(ledgerRes.entries);
      setPeriodLabel(ledgerRes.periodLabel);
      if (apiBase === "/admin") {
        const summaryRes = await staffFetch<LedgerSummary>(`${apiBase}/ledger/summary`);
        setSummary(summaryRes);
      } else {
        setSummary(null);
      }
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const load = async () => {
    await Promise.all([loadTransactions(), loadLedger()]);
  };

  useEffect(() => { load(); }, [apiBase, period, appliedCustom]);

  const filterByType = (type: "deposit" | "withdrawal", statusFilter: string) =>
    items.filter(t => {
      if (t.type !== type) return false;
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (t.userName || "").toLowerCase().includes(q) ||
        (t.userEmail || "").toLowerCase().includes(q) ||
        (t.paymentMethod || "").toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    });

  const pendingDeposits = items.filter(t => t.status === "pending" && t.type === "deposit");
  const pendingWithdrawals = items.filter(t => t.status === "pending" && t.type === "withdrawal");
  const filteredDeposits = filterByType("deposit", depositStatusFilter);
  const filteredWithdrawals = filterByType("withdrawal", withdrawalStatusFilter);

  const pendingQueue = [...pendingDeposits, ...pendingWithdrawals];

  const submitReview = async () => {
    if (!reviewDialog) return;
    setPending(reviewDialog.id);
    try {
      const path = reviewDialog.action === "approve"
        ? `/admin/transactions/${reviewDialog.id}/approve`
        : `/admin/transactions/${reviewDialog.id}/reject`;
      await staffFetch(path, {
        method: "POST",
        body: JSON.stringify({
          adminNotes: adminNotes.trim() || undefined,
          verifyBlockchain: reviewDialog.action === "approve" && reviewDialog.tx && isCryptoTransaction(reviewDialog.tx),
        }),
      });
      toast({
        title: reviewDialog.action === "approve" ? "Approved — ledger entry created" : "Rejected",
        description: reviewDialog.action === "approve"
          ? "Wallet balance updated automatically."
          : "User notified. Withdrawal holds refunded if applicable.",
      });
      setReviewDialog(null);
      setAdminNotes("");
      setChainVerified(false);
      invalidateFinanceQueries(qc, reviewDialog.tx?.userId);
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const exportCsv = async () => {
    const res = await authFetch(apiPath("/admin/transactions/export"));
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderApprovalTable = (
    rows: PlatformTransaction[],
    emptyMessage: string,
    showActions: boolean,
  ) => {
    if (loading) {
      return <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-12 w-full" />)}</div>;
    }
    if (rows.length === 0) {
      return <p className="text-sm text-muted-foreground py-8 text-center">{emptyMessage}</p>;
    }
    return (
      <div className={STAFF_TABLE_WRAP}>
        <ResponsiveDataView
          data={rows}
          rowKey={t => t.id}
          rowClassName="border-border/80 dark:border-white/5"
          mobileHeader={t => (
            <div className="mb-2 flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="font-semibold text-sm">{t.userName || `User #${t.userId}`}</p>
                <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">#{t.id}</p>
              </div>
              <Badge className={`text-xs shrink-0 ${statusColor[t.status] || "bg-muted text-muted-foreground"}`}>{t.status}</Badge>
            </div>
          )}
          mobileFooter={showActions ? t => (
            <>
              {t.type === "deposit" && (
                <div className="mb-2">
                  <TransactionProofLink tx={t} />
                </div>
              )}
              {t.status === "pending" ? (
                <div className="mt-3 pt-3 border-t border-border/80 flex flex-wrap justify-end gap-1">
                <Button size="sm" variant="outline" className="text-green-700 dark:text-green-400 h-7" disabled={pending === t.id}
                  onClick={() => { setReviewDialog({ id: t.id, action: "approve", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                  <CheckCircle className="h-3 w-3 mr-1" />Approve
                </Button>
                <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id}
                  onClick={() => { setReviewDialog({ id: t.id, action: "reject", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                  <XCircle className="h-3 w-3 mr-1" />Reject
                </Button>
                </div>
              ) : null}
            </>
          ) : undefined}
          columns={[
            {
              key: "id",
              header: "ID",
              hideOnMobile: true,
              cell: t => <span className="text-muted-foreground">#{t.id}</span>,
            },
            {
              key: "user",
              header: "User",
              mobileTitle: true,
              hideOnMobile: true,
              cell: t => (
                <>
                  <p className="text-sm font-medium">{t.userName || `User #${t.userId}`}</p>
                  <p className="text-xs text-muted-foreground font-normal">{t.userEmail}</p>
                </>
              ),
            },
            {
              key: "amount",
              header: "Amount",
              headerClassName: "text-right",
              cellClassName: "text-right font-medium",
              cell: t => `${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${t.currency}`,
            },
            {
              key: "method",
              header: "Method / Proof",
              hideOnMobile: true,
              cellClassName: "text-xs text-muted-foreground max-w-[200px]",
              cell: t => (
                <>
                  <p>{t.paymentMethod || t.gatewayProvider || "manual"}</p>
                  {t.utrReference && <p>UTR: {t.utrReference}</p>}
                  {t.txHash && <p className="font-mono break-all">TX: {t.txHash}</p>}
                  {t.proofUrl ? (
                    <SecureUploadLink url={t.proofUrl} className="text-amber-600 dark:text-amber-400 hover:underline text-left">
                      View proof
                    </SecureUploadLink>
                  ) : t.type === "deposit" ? (
                    <TransactionProofLink tx={t} />
                  ) : null}
                </>
              ),
            },
            {
              key: "status",
              header: "Status",
              hideOnMobile: true,
              cell: t => (
                <>
                  <Badge className={`text-xs ${statusColor[t.status] || "bg-muted text-muted-foreground"}`}>{t.status}</Badge>
                  {t.reviewedByEmail && <p className="text-[10px] text-muted-foreground mt-1">{t.reviewedByEmail}</p>}
                </>
              ),
            },
            {
              key: "submitted",
              header: "Submitted",
              cellClassName: "text-xs text-muted-foreground",
              cell: t => new Date(t.createdAt).toLocaleString(),
            },
            ...(showActions ? [{
              key: "actions",
              header: "Actions",
              headerClassName: "text-right",
              hideOnMobile: true,
              cell: (t: PlatformTransaction) => (
                t.status === "pending" ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" className="text-green-700 dark:text-green-400 h-7" disabled={pending === t.id}
                      onClick={() => { setReviewDialog({ id: t.id, action: "approve", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                      <CheckCircle className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id}
                      onClick={() => { setReviewDialog({ id: t.id, action: "reject", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                ) : <span className="text-xs text-muted-foreground">—</span>
              ),
            }] : []),
          ]}
        />
      </div>
    );
  };

  return (
    <div className={cn(STAFF_PAGE_STACK, "min-w-0")}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold flex flex-wrap items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Finance Ledger — Deposits & Withdrawals</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1 break-words">
            All deposit and withdrawal requests require admin or super admin approval. Approved items post automatic immutable ledger entries.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto shrink-0">
          {!readOnly && (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
          )}
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={load} disabled={loading || ledgerLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardContent className="py-3 px-3 sm:px-4">
          <CalendarPeriodFilter
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            periodLabel={periodLabel}
            onPeriodChange={setPeriod}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustom={() => setAppliedCustom({ from: customFrom, to: customTo })}
          />
        </CardContent>
      </Card>

      <div className={STAFF_STAT_GRID}>
        <Card className="bg-amber-500/5 border-amber-500/20 min-w-0 overflow-hidden">
          <CardContent className="p-3 sm:p-4 mobile-box-safe">
            <p className="mobile-stat-value text-amber-600 dark:text-amber-400">{summary?.totalPending ?? pendingQueue.length}</p>
            <p className="mobile-label-safe text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className={cn(STAFF_CARD, "min-w-0 overflow-hidden")}>
          <CardContent className="p-3 sm:p-4 mobile-box-safe">
            <p className="mobile-stat-value text-green-700 dark:text-green-400">{summary?.pendingDeposits ?? pendingDeposits.length}</p>
            <p className="mobile-label-safe text-muted-foreground mt-1">Pending deposits</p>
          </CardContent>
        </Card>
        <Card className={cn(STAFF_CARD, "min-w-0 overflow-hidden")}>
          <CardContent className="p-3 sm:p-4 mobile-box-safe">
            <p className="mobile-stat-value text-red-400">{summary?.pendingWithdrawals ?? pendingWithdrawals.length}</p>
            <p className="mobile-label-safe text-muted-foreground mt-1">Pending withdrawals</p>
          </CardContent>
        </Card>
        <Card className={cn(STAFF_CARD, "min-w-0 overflow-hidden")}>
          <CardContent className="p-3 sm:p-4 mobile-box-safe">
            <p className="mobile-stat-value text-emerald-600 dark:text-emerald-400">
              ${(summary?.pendingDepositAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="mobile-label-safe text-muted-foreground mt-1">Deposit volume pending</p>
          </CardContent>
        </Card>
        <Card className={cn(STAFF_CARD, "min-w-0 overflow-hidden")}>
          <CardContent className="p-3 sm:p-4 mobile-box-safe">
            <p className="mobile-stat-value">{ledger.length}</p>
            <p className="mobile-label-safe text-muted-foreground mt-1">Ledger entries (recent)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="deposits" className="min-w-0">
        <WalletTabsList>
          <WalletTabsTrigger value="deposits" tone="emerald" className="gap-1.5">
            <ArrowDownLeft className="h-3.5 w-3.5" /> Deposit Approval
            {pendingDeposits.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-green-500 text-black">{pendingDeposits.length}</Badge>
            )}
          </WalletTabsTrigger>
          <WalletTabsTrigger value="withdrawals" tone="rose" className="gap-1.5">
            <ArrowUpRight className="h-3.5 w-3.5" /> Withdrawal Approval
            {pendingWithdrawals.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-red-500 text-white">{pendingWithdrawals.length}</Badge>
            )}
          </WalletTabsTrigger>
          <WalletTabsTrigger value="ledger" tone="cyan" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Ledger Book
          </WalletTabsTrigger>
        </WalletTabsList>

        <TabsContent value="deposits" className="mt-4">
          <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Deposit Approval</CardTitle>
                  <CardDescription>Review deposit proofs and UTR references — approve to credit wallet and post ledger entry</CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <Select value={depositStatusFilter} onValueChange={setDepositStatusFilter}>
                    <SelectTrigger className="w-36 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="all">All status</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search deposits..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderApprovalTable(
                filteredDeposits.slice(0, 150),
                depositStatusFilter === "pending" ? "No pending deposits." : "No deposit requests found.",
                !readOnly,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="withdrawals" className="mt-4">
          <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Withdrawal Approval</CardTitle>
                  <CardDescription>Review withdrawal requests — approve to release funds or reject to refund held balance</CardDescription>
                </div>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <Select value={withdrawalStatusFilter} onValueChange={setWithdrawalStatusFilter}>
                    <SelectTrigger className="w-36 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="all">All status</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search withdrawals..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {renderApprovalTable(
                filteredWithdrawals.slice(0, 150),
                withdrawalStatusFilter === "pending" ? "No pending withdrawals." : "No withdrawal requests found.",
                !readOnly,
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Ledger Book</CardTitle>
              <CardDescription>Automatic balance entries created when deposits are approved or withdrawals are held/released</CardDescription>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}</div>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No ledger entries yet.</p>
              ) : (
                <div className={STAFF_TABLE_WRAP}>
                  <ResponsiveDataView
                    data={ledger}
                    rowKey={e => e.id}
                    rowClassName="border-border/80 dark:border-white/5"
                    mobileHeader={e => (
                      <div className="mb-2 min-w-0">
                        <p className="font-semibold text-sm">{e.userName || `#${e.userId}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.userEmail}</p>
                      </div>
                    )}
                    columns={[
                      {
                        key: "date",
                        header: "Date",
                        hideOnMobile: true,
                        cellClassName: "text-xs text-muted-foreground whitespace-nowrap",
                        cell: e => new Date(e.createdAt).toLocaleString(),
                      },
                      {
                        key: "user",
                        header: "User",
                        mobileTitle: true,
                        hideOnMobile: true,
                        cell: e => (
                          <>
                            <p className="text-sm">{e.userName || `#${e.userId}`}</p>
                            <p className="text-xs text-muted-foreground font-normal">{e.userEmail}</p>
                          </>
                        ),
                      },
                      {
                        key: "type",
                        header: "Type",
                        cell: e => <span className="capitalize text-sm">{e.type}</span>,
                      },
                      {
                        key: "amount",
                        header: "Amount",
                        headerClassName: "text-right",
                        cellClassName: `text-right font-medium`,
                        cell: e => (
                          <span className={e.amount >= 0 ? "text-green-700 dark:text-green-400" : "text-red-400"}>
                            {e.amount >= 0 ? "+" : ""}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {e.currency}
                          </span>
                        ),
                      },
                      {
                        key: "balance",
                        header: "Before → After",
                        hideOnMobile: true,
                        cellClassName: "text-xs text-muted-foreground",
                        cell: e => `${e.balanceBefore.toLocaleString()} → ${e.balanceAfter.toLocaleString()}`,
                      },
                      {
                        key: "txn",
                        header: "Txn",
                        cell: e => (
                          <>
                            {e.referenceId ? `#${e.referenceId}` : "—"}
                            {e.transactionStatus && (
                              <Badge className={`ml-1 text-[10px] ${statusColor[e.transactionStatus] || ""}`}>{e.transactionStatus}</Badge>
                            )}
                          </>
                        ),
                      },
                      {
                        key: "description",
                        header: "Description",
                        hideOnMobile: true,
                        cellClassName: "text-xs text-muted-foreground max-w-[180px] truncate",
                        cell: e => e.description || "—",
                      },
                    ]}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewDialog} onOpenChange={open => { if (!open) { setReviewDialog(null); setChainVerified(false); } }}>
        <DialogContent className="bg-zinc-950 border-border dark:border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{reviewDialog?.action === "approve" ? "Approve transaction" : "Reject transaction"}</DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === "approve"
                ? reviewDialog.tx && isCryptoTransaction(reviewDialog.tx)
                  ? "Verify the blockchain transaction, then approve to credit the wallet."
                  : reviewDialog.tx?.type === "deposit"
                    ? "Review payment proof and references before crediting the user wallet."
                    : "This will automatically update the user wallet and create a ledger entry."
                : "Rejected withdrawals will refund held funds to the user wallet."}
            </DialogDescription>
          </DialogHeader>

          {reviewDialog?.tx?.type === "deposit" && (
            <TransactionProofReviewBlock tx={reviewDialog.tx} />
          )}

          {reviewDialog?.action === "approve" && reviewDialog.tx && isCryptoTransaction(reviewDialog.tx) && (
            <CryptoBlockchainVerifyPanel
              transactionId={reviewDialog.id}
              txHash={reviewDialog.tx.txHash}
              onVerifiedChange={setChainVerified}
            />
          )}

          <div className="space-y-2">
            <Label>Admin notes (optional)</Label>
            <Textarea
              value={adminNotes}
              onChange={e => setAdminNotes(e.target.value)}
              placeholder="Verification notes, rejection reason..."
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
            <Button
              className={reviewDialog?.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              onClick={submitReview}
              disabled={
                pending !== null
                || (reviewDialog?.action === "approve"
                  && reviewDialog.tx
                  && isCryptoTransaction(reviewDialog.tx)
                  && !chainVerified)
              }
            >
              Confirm {reviewDialog?.action === "approve" ? "Approval" : "Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
