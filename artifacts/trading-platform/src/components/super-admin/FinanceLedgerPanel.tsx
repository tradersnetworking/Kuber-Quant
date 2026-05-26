import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowRightLeft, RefreshCw, Search, Download, CheckCircle, XCircle, BookOpen, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CryptoBlockchainVerifyPanel, isCryptoTransaction } from "@/components/super-admin/CryptoBlockchainVerifyPanel";
import { staffFetch } from "@/lib/staff-api";
import { getStoredToken } from "@/lib/token-store";

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
  approved: "bg-green-500/20 text-green-400",
  pending: "bg-orange-500/20 text-orange-400",
  rejected: "bg-red-500/20 text-red-400",
};

export function FinanceLedgerPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlatformTransaction[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [typeFilter, setTypeFilter] = useState("all");
  const [reviewDialog, setReviewDialog] = useState<{ id: number; action: "approve" | "reject"; tx?: PlatformTransaction } | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [chainVerified, setChainVerified] = useState(false);

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformTransaction[]>("/admin/transactions");
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
      const [ledgerRes, summaryRes] = await Promise.all([
        staffFetch<{ entries: LedgerEntry[] }>("/admin/ledger?limit=200"),
        staffFetch<LedgerSummary>("/admin/ledger/summary"),
      ]);
      setLedger(ledgerRes.entries);
      setSummary(summaryRes);
    } catch {
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const load = async () => {
    await Promise.all([loadTransactions(), loadLedger()]);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(t => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.userName || "").toLowerCase().includes(q) ||
      (t.userEmail || "").toLowerCase().includes(q) ||
      t.type.toLowerCase().includes(q) ||
      (t.paymentMethod || "").toLowerCase().includes(q) ||
      String(t.id).includes(q)
    );
  });

  const pendingQueue = items.filter(t => t.status === "pending");

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
      await load();
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const exportCsv = async () => {
    const token = getStoredToken();
    const res = await fetch("/api/admin/transactions/export", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-400" />
            Finance Ledger — Deposits & Withdrawals
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All deposit and withdrawal requests require admin or super admin approval. Approved items post automatic immutable ledger entries.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading || ledgerLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{summary?.totalPending ?? pendingQueue.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{summary?.pendingDeposits ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending deposits</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-400">{summary?.pendingWithdrawals ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending withdrawals</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">
              ${(summary?.pendingDepositAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Deposit volume pending</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{ledger.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Ledger entries (recent)</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="queue" className="gap-1.5">
            <ClipboardList className="h-3.5 w-3.5" /> Approval Queue
            {pendingQueue.length > 0 && (
              <Badge className="ml-1 h-5 px-1.5 bg-amber-500 text-black">{pendingQueue.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <ArrowRightLeft className="h-3.5 w-3.5" /> All Requests
          </TabsTrigger>
          <TabsTrigger value="ledger" className="gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Ledger Book
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Pending Evaluation</CardTitle>
              <CardDescription>Review proof, UTR, or gateway reference — approve to auto-credit/debit wallet and write ledger entry</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-12 w-full" />)}</div>
              ) : pendingQueue.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No pending deposits or withdrawals.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Method / Proof</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingQueue.map(t => (
                        <TableRow key={t.id} className="border-white/5">
                          <TableCell className="text-muted-foreground">#{t.id}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{t.userName || `User #${t.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                          </TableCell>
                          <TableCell className="capitalize">{t.type}</TableCell>
                          <TableCell className="text-right font-medium">
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                            <p>{t.paymentMethod || t.gatewayProvider || "manual"}</p>
                            {t.utrReference && <p>UTR: {t.utrReference}</p>}
                            {t.txHash && <p className="font-mono break-all">TX: {t.txHash}</p>}
                            {t.proofUrl && (
                              <a href={t.proofUrl} target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">View proof</a>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="outline" className="text-green-400 h-7" disabled={pending === t.id}
                                onClick={() => { setReviewDialog({ id: t.id, action: "approve", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                                <CheckCircle className="h-3 w-3 mr-1" />Approve
                              </Button>
                              <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id}
                                onClick={() => { setReviewDialog({ id: t.id, action: "reject", tx: t }); setAdminNotes(""); setChainVerified(false); }}>
                                <XCircle className="h-3 w-3 mr-1" />Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-base">All Transaction Requests</CardTitle>
                <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-32 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="deposit">Deposits</SelectItem>
                      <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-32 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative flex-1 sm:w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 bg-white/5 border-white/10" />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No transactions found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>ID</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reviewed by</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.slice(0, 150).map(t => (
                        <TableRow key={t.id} className="border-white/5">
                          <TableCell className="text-muted-foreground">#{t.id}</TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{t.userName || `User #${t.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                          </TableCell>
                          <TableCell className="capitalize">{t.type}</TableCell>
                          <TableCell className="text-right font-medium">
                            {t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${statusColor[t.status] || "bg-gray-500/20 text-gray-400"}`}>{t.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {t.reviewedByEmail || "—"}
                            {t.reviewedAt && <p>{new Date(t.reviewedAt).toLocaleDateString()}</p>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base">Immutable Ledger Book</CardTitle>
              <CardDescription>Automatic balance entries created when deposits are approved or withdrawals are held/released</CardDescription>
            </CardHeader>
            <CardContent>
              {ledgerLoading ? (
                <div className="space-y-2">{[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}</div>
              ) : ledger.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No ledger entries yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Date</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Before → After</TableHead>
                        <TableHead>Txn</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.map(e => (
                        <TableRow key={e.id} className="border-white/5">
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(e.createdAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <p className="text-sm">{e.userName || `#${e.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{e.userEmail}</p>
                          </TableCell>
                          <TableCell className="capitalize text-sm">{e.type}</TableCell>
                          <TableCell className={`text-right font-medium ${e.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {e.amount >= 0 ? "+" : ""}{e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {e.currency}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {e.balanceBefore.toLocaleString()} → {e.balanceAfter.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs">
                            {e.referenceId ? `#${e.referenceId}` : "—"}
                            {e.transactionStatus && (
                              <Badge className={`ml-1 text-[10px] ${statusColor[e.transactionStatus] || ""}`}>{e.transactionStatus}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{e.description || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewDialog} onOpenChange={open => { if (!open) { setReviewDialog(null); setChainVerified(false); } }}>
        <DialogContent className="bg-zinc-950 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>{reviewDialog?.action === "approve" ? "Approve transaction" : "Reject transaction"}</DialogTitle>
            <DialogDescription>
              {reviewDialog?.action === "approve"
                ? reviewDialog.tx && isCryptoTransaction(reviewDialog.tx)
                  ? "Verify the blockchain transaction, then approve to credit the wallet."
                  : "This will automatically update the user wallet and create a ledger entry."
                : "Rejected withdrawals will refund held funds to the user wallet."}
            </DialogDescription>
          </DialogHeader>

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
              className="bg-white/5 border-white/10"
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
