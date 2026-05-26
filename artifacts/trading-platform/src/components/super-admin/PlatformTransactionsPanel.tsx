import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowRightLeft, RefreshCw, Search, Download, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
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
  notes?: string;
  paymentMethod?: string;
}

const statusColor: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400",
  pending: "bg-orange-500/20 text-orange-400",
  rejected: "bg-red-500/20 text-red-400",
};

export function PlatformTransactionsPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<PlatformTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
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
      String(t.id).includes(q)
    );
  });

  const depositsApproved = items.filter(t => t.type === "deposit" && t.status === "approved");
  const withdrawalsApproved = items.filter(t => t.type === "withdrawal" && t.status === "approved");
  const pendingDeposits = items.filter(t => t.type === "deposit" && t.status === "pending");
  const pendingWithdrawals = items.filter(t => t.type === "withdrawal" && t.status === "pending");

  const approve = async (id: number) => {
    setPending(id);
    try {
      await staffFetch(`/admin/transactions/${id}/approve`, { method: "POST" });
      toast({ title: "Transaction approved", description: "Payment released to user wallet." });
      await load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  const reject = async (id: number) => {
    setPending(id);
    try {
      await staffFetch(`/admin/transactions/${id}/reject`, { method: "POST" });
      toast({ title: "Transaction rejected" });
      await load();
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
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
            <ArrowRightLeft className="h-5 w-5 text-orange-400" />
            Platform Finance — Transactions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review deposits, withdrawals, and payment releases — same controls as admin finance.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-1" />Export CSV</Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-emerald-400">
              ${depositsApproved.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Deposits released</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-400">
              ${withdrawalsApproved.reduce((s, t) => s + t.amount, 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Withdrawals processed</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{pendingDeposits.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending deposits</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-orange-400">{pendingWithdrawals.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending withdrawals</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">Transaction Queue</CardTitle>
              <CardDescription>Approve or reject pending deposits and withdrawals</CardDescription>
            </div>
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
            <div className="space-y-2">{[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-10 w-full" />)}</div>
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
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                        ${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {t.currency}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColor[t.status] || "bg-gray-500/20 text-gray-400"}`}>{t.status}</Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {t.status === "pending" && (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" className="text-green-400 h-7" disabled={pending === t.id} onClick={() => approve(t.id)}>
                              <CheckCircle className="h-3 w-3 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-400 h-7" disabled={pending === t.id} onClick={() => reject(t.id)}>
                              <XCircle className="h-3 w-3 mr-1" />Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
