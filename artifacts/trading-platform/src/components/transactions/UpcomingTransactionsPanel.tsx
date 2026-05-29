import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import {
  ArrowDownLeft, ArrowUpRight, CheckCircle, Clock, RefreshCw, Search, XCircle, CreditCard,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CryptoBlockchainVerifyPanel, isCryptoTransaction } from "@/components/super-admin/CryptoBlockchainVerifyPanel";
import { TransactionProofReviewBlock, TransactionProofLink } from "@/components/finance/TransactionProofReviewBlock";
import { AdminPayoutAccountReviewDialog } from "@/components/finance/AdminPayoutAccountReviewDialog";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { staffFetch } from "@/lib/staff-api";
import { invalidateFinanceQueries } from "@/lib/invalidate-finance-queries";
import { cn } from "@/lib/utils";
import { tabChipClasses } from "@/lib/tab-tones";
import { STAFF_CARD, STAFF_PAGE_STACK, STAFF_STAT_GRID } from "@/lib/staff-dashboard-ui";

export type UpcomingTransaction = {
  id: number;
  userId: number;
  userEmail?: string | null;
  userName?: string | null;
  type: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  notes?: string | null;
  proofUrl?: string | null;
  utrReference?: string | null;
  txHash?: string | null;
  gatewayProvider?: string | null;
  paymentAccountId?: number | null;
  createdAt: string;
};

type UpcomingSummary = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  pendingDepositAmount: number;
  pendingWithdrawalAmount: number;
  total: number;
};

type UpcomingPayload = {
  items: UpcomingTransaction[];
  summary: UpcomingSummary;
};

export type UpcomingTransactionsVariant = "investor" | "manager" | "support" | "admin";

const TYPE_TONE: Record<string, string> = {
  deposit: "from-emerald-500/15 via-emerald-500/5 to-transparent border-emerald-500/25",
  withdrawal: "from-orange-500/15 via-orange-500/5 to-transparent border-orange-500/25",
};

function fmtAmount(amount: number, currency: string) {
  const prefix = !["BTC", "ETH"].includes(currency) && currency !== "USDT" ? "$" : "";
  return `${prefix}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
}

function apiPath(variant: UpcomingTransactionsVariant): string {
  switch (variant) {
    case "investor": return "/wallet/upcoming";
    case "manager": return "/manager/transactions/upcoming";
    case "support": return "/support-team/transactions/upcoming";
    default: return "/admin/transactions/upcoming";
  }
}

async function fetchUpcoming(variant: UpcomingTransactionsVariant): Promise<UpcomingPayload> {
  const path = apiPath(variant);
  if (variant === "investor") {
    return authFetchJson<UpcomingPayload>(path);
  }
  return staffFetch<UpcomingPayload>(path);
}

function StatTile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone: "emerald" | "orange" | "amber" | "violet";
}) {
  const tones = {
    emerald: "border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400",
    orange: "border-orange-500/30 bg-gradient-to-br from-orange-500/15 to-orange-500/5 text-orange-700 dark:text-orange-400",
    amber: "border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400",
    violet: "border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-400",
  };
  return (
    <div className={cn("rounded-xl border p-3 sm:p-4 min-w-0", tones[tone])}>
      <p className="text-[10px] sm:text-xs uppercase tracking-wide opacity-80 truncate">{label}</p>
      <p className="text-xl sm:text-2xl font-bold mt-1 truncate">{value}</p>
      {sub && <p className="text-[10px] sm:text-xs opacity-75 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

export function UpcomingTransactionsPanel({
  variant,
  compact = false,
  showHeader = true,
}: {
  variant: UpcomingTransactionsVariant;
  compact?: boolean;
  showHeader?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const canApprove = variant === "admin";
  const readOnly = variant === "support" || variant === "manager";

  const [payload, setPayload] = useState<UpcomingPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: "approve" | "reject"; tx?: UpcomingTransaction } | null>(null);
  const [payoutAccountTxId, setPayoutAccountTxId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [chainVerified, setChainVerified] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUpcoming(variant);
      setPayload(data);
    } catch {
      setPayload({ items: [], summary: { pendingDeposits: 0, pendingWithdrawals: 0, pendingDepositAmount: 0, pendingWithdrawalAmount: 0, total: 0 } });
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const items = payload?.items ?? [];
    return items.filter(t => {
      if (typeFilter !== "all" && t.type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (t.userName || "").toLowerCase().includes(q) ||
        (t.userEmail || "").toLowerCase().includes(q) ||
        (t.paymentMethod || "").toLowerCase().includes(q) ||
        String(t.id).includes(q)
      );
    });
  }, [payload?.items, search, typeFilter]);

  const summary = payload?.summary ?? {
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    pendingDepositAmount: 0,
    pendingWithdrawalAmount: 0,
    total: 0,
  };

  const submitReview = async () => {
    if (!reviewDialog || !canApprove) return;
    setActionId(reviewDialog.id);
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
        title: reviewDialog.action === "approve" ? "Completed — payment processed" : "Request rejected",
        description: reviewDialog.action === "approve"
          ? "Removed from upcoming queue. Ledger and wallet updated."
          : "Removed from upcoming queue. User notified.",
      });
      setReviewDialog(null);
      setAdminNotes("");
      setChainVerified(false);
      invalidateFinanceQueries(qc, reviewDialog.tx?.userId);
      await load();
    } catch (e: unknown) {
      toast({
        title: "Action failed",
        description: e instanceof Error ? e.message : "Could not update transaction",
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  const ledgerHref = variant === "manager"
    ? "/manager/clients"
    : variant === "support"
      ? "/support-team/transactions"
      : "/super-admin/transactions";

  const userDetailHref = (userId: number) => {
    if (variant === "manager") return `/manager/clients/${userId}`;
    if (variant === "support") return `/support-team/users`;
    return `/super-admin/users?user=${userId}`;
  };

  const subtitle = {
    investor: "Your pending deposits and withdrawals awaiting platform review.",
    manager: "Pending deposit and withdrawal requests from your assigned clients.",
    support: "Platform-wide pending requests (read-only). Escalate to admin for approval.",
    admin: "Review, approve, or reject pending deposits and withdrawals. Approved items move to completed ledger history.",
  }[variant];

  const content = (
    <div className={cn(compact ? "space-y-4" : STAFF_PAGE_STACK)}>
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={cn(
              "font-bold flex items-center gap-2",
              compact ? "text-lg sm:text-xl" : "text-xl sm:text-2xl md:text-3xl",
            )}>
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 shrink-0" />
              <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">
                Upcoming Transactions
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {!compact && variant !== "investor" && (
              <Link href={ledgerHref}>
                <Button variant="outline" size="sm">{variant === "manager" ? "Client accounts" : "Full ledger"}</Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      )}

      <div className={cn(compact ? "grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3" : STAFF_STAT_GRID)}>
        <StatTile label="Pending total" value={summary.total} tone="violet" />
        <StatTile
          label="Deposits"
          value={summary.pendingDeposits}
          sub={summary.pendingDepositAmount > 0 ? fmtAmount(summary.pendingDepositAmount, "USD") : undefined}
          tone="emerald"
        />
        <StatTile
          label="Withdrawals"
          value={summary.pendingWithdrawals}
          sub={summary.pendingWithdrawalAmount > 0 ? fmtAmount(summary.pendingWithdrawalAmount, "USD") : undefined}
          tone="orange"
        />
        <StatTile
          label="Queue status"
          value={summary.total === 0 ? "Clear" : "Action needed"}
          sub={canApprove && summary.total > 0 ? "Approve to complete" : undefined}
          tone="amber"
        />
      </div>

      <Card className={cn(STAFF_CARD, "border-amber-500/20 bg-gradient-to-br from-amber-500/[0.04] to-transparent")}>
        <CardHeader className="pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending queue
              </CardTitle>
              <CardDescription>
                {canApprove
                  ? "Approve to mark completed and remove from this list."
                  : readOnly
                    ? "Scroll through pending requests for your visibility."
                    : "Track status until admin completes your request."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              {(["all", "deposit", "withdrawal"] as const).map(key => (
                <Button
                  key={key}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "rounded-lg border capitalize",
                    tabChipClasses(key === "deposit" ? "green" : key === "withdrawal" ? "red" : "blue", typeFilter === key),
                  )}
                  onClick={() => setTypeFilter(key)}
                >
                  {key === "all" ? "All" : key}
                </Button>
              ))}
              <div className="relative flex-1 min-w-[140px] lg:w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-muted/60 dark:bg-white/5"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-16 w-full rounded-xl" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <Clock className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium text-foreground">No upcoming transactions</p>
              <p className="text-sm text-muted-foreground mt-1">
                {summary.total === 0
                  ? "All caught up — nothing pending right now."
                  : "No items match your filters."}
              </p>
            </div>
          ) : (
            <div className="max-h-[min(70vh,640px)] overflow-y-auto pr-1 -mr-1 space-y-2">
              {filtered.map(t => (
                <div
                  key={t.id}
                  className={cn(
                    "rounded-xl border bg-gradient-to-r p-3 sm:p-4",
                    TYPE_TONE[t.type] || "from-muted/40 to-transparent border-border",
                  )}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                          Pending
                        </Badge>
                        <span className={cn(
                          "inline-flex items-center gap-1 text-sm font-semibold capitalize",
                          t.type === "deposit" ? "text-emerald-700 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400",
                        )}>
                          {t.type === "deposit"
                            ? <ArrowDownLeft className="h-4 w-4 shrink-0" />
                            : <ArrowUpRight className="h-4 w-4 shrink-0" />}
                          {t.type}
                        </span>
                        <span className="text-xs text-muted-foreground">#{t.id}</span>
                      </div>

                      {variant !== "investor" && (
                        <div className="mt-1.5 min-w-0">
                          <p className="font-medium text-sm truncate">{t.userName || `User #${t.userId}`}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.userEmail}</p>
                        </div>
                      )}

                      <p className="text-lg sm:text-xl font-bold mt-2">{fmtAmount(t.amount, t.currency)}</p>

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {t.paymentMethod && <span className="capitalize">Method: {t.paymentMethod}</span>}
                        {t.utrReference && <span>Ref: {t.utrReference}</span>}
                        {t.gatewayProvider && <span>Gateway: {t.gatewayProvider}</span>}
                        {t.gatewayProvider === "maturity_payout" && (
                          <Badge className="text-[10px] bg-violet-500/20 text-violet-700 dark:text-violet-300">Maturity payout</Badge>
                        )}
                        <span>{format(new Date(t.createdAt), "MMM d, yyyy · HH:mm")}</span>
                      </div>
                      {t.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.notes}</p>}
                      {t.type === "deposit" && (
                        <div className="mt-2">
                          <TransactionProofLink tx={t} />
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 sm:items-end">
                      {canApprove && t.type === "withdrawal" && t.paymentAccountId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-amber-500/40 text-amber-700 dark:text-amber-400"
                          onClick={() => setPayoutAccountTxId(t.id)}
                        >
                          <CreditCard className="h-3.5 w-3.5 mr-1" />
                          View payout account
                        </Button>
                      )}
                      {variant !== "investor" && (
                        <Link href={userDetailHref(t.userId)}>
                          <Button size="sm" variant="ghost" className="h-8 text-xs">View account</Button>
                        </Link>
                      )}
                      {canApprove && (
                        <>
                          <Button
                            size="sm"
                            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={actionId === t.id}
                            onClick={() => {
                              setReviewDialog({ id: t.id, action: "approve", tx: t });
                              setAdminNotes("");
                              setChainVerified(false);
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-red-500 border-red-500/30"
                            disabled={actionId === t.id}
                            onClick={() => {
                              setReviewDialog({ id: t.id, action: "reject", tx: t });
                              setAdminNotes("");
                              setChainVerified(false);
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!compact && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Showing {filtered.length} pending · scroll for more
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      {compact ? content : <div className={STAFF_PAGE_STACK}>{content}</div>}

      {canApprove && reviewDialog && (
        <Dialog open onOpenChange={() => setReviewDialog(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {reviewDialog.action === "approve" ? "Approve transaction" : "Reject transaction"}
              </DialogTitle>
              <DialogDescription>
                #{reviewDialog.id} · {reviewDialog.tx?.type} · {reviewDialog.tx && fmtAmount(reviewDialog.tx.amount, reviewDialog.tx.currency)}
              </DialogDescription>
            </DialogHeader>

            {reviewDialog.tx?.type === "deposit" && (
              <TransactionProofReviewBlock tx={reviewDialog.tx} />
            )}

            {reviewDialog.tx?.type === "withdrawal" && reviewDialog.tx.paymentAccountId && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm">Investor selected a personal payout account for this withdrawal.</p>
                <Button size="sm" variant="outline" onClick={() => setPayoutAccountTxId(reviewDialog.id)}>
                  <CreditCard className="h-3.5 w-3.5 mr-1" /> View account details
                </Button>
              </div>
            )}

            {reviewDialog.action === "approve" && reviewDialog.tx && isCryptoTransaction(reviewDialog.tx) && (
              <CryptoBlockchainVerifyPanel
                transactionId={reviewDialog.id}
                txHash={reviewDialog.tx.txHash}
                onVerifiedChange={setChainVerified}
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Admin notes (optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={e => setAdminNotes(e.target.value)}
                placeholder="Internal note or reason shown to user on rejection"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog(null)}>Cancel</Button>
              <Button
                onClick={submitReview}
                disabled={
                  actionId === reviewDialog.id ||
                  (reviewDialog.action === "approve" && reviewDialog.tx && isCryptoTransaction(reviewDialog.tx) && !chainVerified)
                }
                className={reviewDialog.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                variant={reviewDialog.action === "reject" ? "destructive" : "default"}
              >
                {reviewDialog.action === "approve" ? "Approve & complete" : "Reject request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <AdminPayoutAccountReviewDialog
        transactionId={payoutAccountTxId}
        open={payoutAccountTxId != null}
        onOpenChange={open => { if (!open) setPayoutAccountTxId(null); }}
      />
    </>
  );
}

/** Compact strip for embedding in investor transactions tab */
export function InvestorUpcomingTransactionsSection() {
  return (
    <UpcomingTransactionsPanel variant="investor" compact showHeader />
  );
}
