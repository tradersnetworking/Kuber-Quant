import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { ArrowRightLeft, RefreshCw, Search, Download, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staff-api";
import { authFetch, apiPath } from "@/lib/token-store";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";
import { TransactionProofReviewBlock, TransactionProofLink } from "@/components/finance/TransactionProofReviewBlock";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CryptoBlockchainVerifyPanel, isCryptoTransaction } from "@/components/super-admin/CryptoBlockchainVerifyPanel";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_STAT_GRID, STAFF_TOOLBAR_ROW } from "@/lib/staff-dashboard-ui";

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
  notes?: string;
  paymentMethod?: string;
  proofUrl?: string | null;
  utrReference?: string | null;
  txHash?: string | null;
  gatewayProvider?: string | null;
}

const statusColor: Record<string, string> = {
  approved: "bg-green-500/20 text-green-700 dark:text-green-400",
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  rejected: "bg-red-500/20 text-red-400",
};

export function PlatformTransactionsPanel({
  apiBase = "/admin",
  readOnly = false,
}: {
  apiBase?: "/admin" | "/support-team";
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: "approve" | "reject"; tx: PlatformTransaction } | null>(null);
  const [chainVerified, setChainVerified] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformTransaction[]>(`${apiBase}/transactions`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [apiBase]);

  const filtered = items.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.userName || "").toLowerCase().includes(q) ||
      (t.userEmail || "").toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  const depositsApproved = items.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawalsApproved = items.filter(t => t.type === "withdrawal" && t.status === "approved");
  const pendingDeposits = items.filter(t => t.type === "deposit" && t.status === "pending");
  const pendingWithdrawals = items.filter(t => t.type === "withdrawal" && t.status === "pending");

  const openReview = (tx: PlatformTransaction, action: "approve" | "reject") => {
    if (action === "approve" && tx.type === "withdrawal" && !isCryptoTransaction(tx)) {
      void submitReview(tx, "approve");
      return;
    }
    setReviewDialog({ id: tx.id, action, tx });
    setChainVerified(false);
  };

  const submitReview = async (tx: PlatformTransaction, action: "approve" | "reject") => {
    setPending(tx.id);
    try {
      const path = action === "approve"
        ? `/admin/transactions/${tx.id}/approve`
        : `/admin/transactions/${tx.id}/reject`;
      await staffFetch(path, {
        method: "POST",
        body: JSON.stringify({
          verifyBlockchain: action === "approve" && isCryptoTransaction(tx),
        }),
      });
      toast({
        title: action === "approve" ? "Transaction approved" : "Transaction rejected",
        description: action === "approve" ? "Payment released to user wallet." : undefined,
      });
      setReviewDialog(null);
      invalidateFinanceQueries(qc, tx.userId);
      await load();
    } catch (e: any) {
      toast({ title: `${action === "approve" ? "Approve" : "Reject"} failed`, description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const approve = async (tx: PlatformTransaction) => openReview(tx, "approve");
  const reject = async (tx: PlatformTransaction) => openReview(tx, "reject");

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

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0" />
            Platform Finance — Transactions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {readOnly
              ? "View deposits, withdrawals, and payment history for investors and managers (read-only)."
              : "Review deposits, withdrawals, and payment releases — same controls as admin finance."}
          </p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 shrink-0">
          {!readOnly && (
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          )}
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className={STAFF_STAT_GRID}>
        <KpiStatCard
          compact
          label="Deposits released"
          value={`$${depositsApproved.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          iconClassName="text-emerald-600 dark:text-emerald-400"
        />
        <KpiStatCard
          compact
          label="Withdrawals processed"
          value={`$${withdrawalsApproved.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          iconClassName="text-red-400"
        />
        <KpiStatCard
          compact
          label="Pending deposits"
          value={pendingDeposits.length}
          iconClassName="text-amber-600 dark:text-amber-400"
        />
        <KpiStatCard
          compact
          label="Pending withdrawals"
          value={pendingWithdrawals.length}
          iconClassName="text-orange-600 dark:text-orange-400"
        />
      </div>

      <Card className={STAFF_CARD}>
        <CardHeader>
          <div className={STAFF_TOOLBAR_ROW}>
            <div>
              <CardTitle className="text-base">Transaction Queue</CardTitle>
              <CardDescription>{readOnly ? "Platform-wide deposit and withdrawal history" : "Approve or reject pending deposits and withdrawals"}</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto flex-wrap">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-32 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No transactions found</p>
          ) : (
            <ResponsiveDataView
              data={filtered.slice(0, 150)}
              rowKey={t => t.id}
              rowClassName="border-border/80 dark:border-white/5"
              mobileHeader={t => (
                <div className="mb-2 min-w-0 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{t.userName || `User #${t.userId}`}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>
                  </div>
                  <Badge className={`text-xs shrink-0 ${statusColor[t.status] || "bg-muted text-muted-foreground"}`}>{t.status}</Badge>
                </div>
              )}
              mobileFooter={!readOnly ? t => (
                <>
                  {t.type === "deposit" && (
                    <div className="mb-2">
                      <TransactionProofLink tx={t} />
                    </div>
                  )}
                  {t.status === "pending" ? (
                    <div className="mt-3 pt-3 border-t border-border/80 flex flex-wrap justify-end gap-1">
                      <Button size="sm" variant="outline" className="text-green-700 dark:text-green-400 h-7" disabled={pending === t.id} onClick={() => approve(t)}>
                        <CheckCircle className="h-3 w-3 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id} onClick={() => reject(t)}>
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
                  key: "type",
                  header: "Type",
                  cell: t => <span className="capitalize">{t.type}</span>,
                },
                {
                  key: "amount",
                  header: "Amount",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-medium",
                  cell: t => `$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${t.currency}`,
                },
                {
                  key: "proof",
                  header: "Proof",
                  hideOnMobile: true,
                  cell: t => t.type === "deposit" ? <TransactionProofLink tx={t} /> : <span className="text-xs text-muted-foreground">—</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  hideOnMobile: true,
                  cell: t => (
                    <Badge className={`text-xs ${statusColor[t.status] || "bg-muted text-muted-foreground"}`}>{t.status}</Badge>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  cellClassName: "text-xs text-muted-foreground",
                  cell: t => new Date(t.createdAt).toLocaleString(),
                },
                ...(!readOnly ? [{
                  key: "actions",
                  header: "Actions",
                  headerClassName: "text-right",
                  hideOnMobile: true,
                  cell: (t: PlatformTransaction) => (
                    t.status === "pending" ? (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" className="text-green-700 dark:text-green-400 h-7" disabled={pending === t.id} onClick={() => approve(t)}>
                          <CheckCircle className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id} onClick={() => reject(t)}>
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    ) : <span className="text-xs text-muted-foreground">—</span>
                  ),
                }] : []),
              ]}
            />
          )}
        </CardContent>
      </Card>

      {!readOnly && reviewDialog && (
        <Dialog open onOpenChange={() => setReviewDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{reviewDialog.action === "approve" ? "Approve transaction" : "Reject transaction"}</DialogTitle>
              <DialogDescription>#{reviewDialog.id} · {reviewDialog.tx.userEmail}</DialogDescription>
            </DialogHeader>
            {reviewDialog.tx.type === "deposit" && (
              <TransactionProofReviewBlock tx={reviewDialog.tx} />
            )}
            {reviewDialog.action === "approve" && isCryptoTransaction(reviewDialog.tx) && (
              <CryptoBlockchainVerifyPanel
                transactionId={reviewDialog.id}
                txHash={reviewDialog.tx.txHash}
                onVerifiedChange={setChainVerified}
              />
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
              <Button
                className={reviewDialog.action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
                variant={reviewDialog.action === "reject" ? "destructive" : "default"}
                disabled={pending === reviewDialog.id || (reviewDialog.action === "approve" && isCryptoTransaction(reviewDialog.tx) && !chainVerified)}
                onClick={() => submitReview(reviewDialog.tx, reviewDialog.action)}
              >
                Confirm {reviewDialog.action === "approve" ? "Approval" : "Rejection"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
