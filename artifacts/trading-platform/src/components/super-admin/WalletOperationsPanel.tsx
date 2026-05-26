import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Wallet, ArrowDownLeft, ArrowUpRight, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CryptoBlockchainVerifyPanel, isCryptoTransaction } from "@/components/super-admin/CryptoBlockchainVerifyPanel";

export function WalletOperationsPanel() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");

  const [adjustForm, setAdjustForm] = useState({ userId: "", amount: "", walletType: "fiat", reason: "" });
  const [manualForm, setManualForm] = useState({
    userId: "", type: "deposit", amount: "", currency: "USD", notes: "", autoApprove: true,
  });
  const [reviewTx, setReviewTx] = useState<any | null>(null);
  const [chainVerified, setChainVerified] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [u, t] = await Promise.all([
        staffFetch<any[]>("/admin/users"),
        staffFetch<any[]>("/admin/transactions"),
      ]);
      setUsers(u);
      setTransactions(t);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const pending = transactions.filter(t => t.status === "pending");
  const deposits = pending.filter(t => t.type === "deposit");
  const withdrawals = pending.filter(t => t.type === "withdrawal");

  const approve = async (id: number, tx?: any) => {
    if (tx && isCryptoTransaction(tx)) {
      setReviewTx({ ...tx, action: "approve" });
      setChainVerified(false);
      return;
    }
    try {
      await staffFetch(`/admin/transactions/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Transaction approved" });
      load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
    }
  };

  const confirmApprove = async () => {
    if (!reviewTx) return;
    try {
      await staffFetch(`/admin/transactions/${reviewTx.id}/approve`, {
        method: "POST",
        body: JSON.stringify({
          verifyBlockchain: isCryptoTransaction(reviewTx),
        }),
      });
      toast({ title: "Transaction approved" });
      setReviewTx(null);
      setChainVerified(false);
      load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
    }
  };

  const reject = async (id: number) => {
    try {
      await staffFetch(`/admin/transactions/${id}/reject`, { method: "POST", body: JSON.stringify({ adminNotes: "Rejected by super admin" }) });
      toast({ title: "Transaction rejected" });
      load();
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
    }
  };

  const adjustWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await staffFetch("/admin/wallet-adjust", {
        method: "POST",
        body: JSON.stringify({
          userId: Number(adjustForm.userId),
          amount: Number(adjustForm.amount),
          walletType: adjustForm.walletType,
          reason: adjustForm.reason,
        }),
      });
      toast({ title: "Wallet adjusted" });
      setAdjustForm({ userId: "", amount: "", walletType: "fiat", reason: "" });
      load();
    } catch (err: any) {
      toast({ title: "Adjustment failed", description: err.message, variant: "destructive" });
    }
  };

  const createManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await staffFetch("/admin/transactions/manual", {
        method: "POST",
        body: JSON.stringify({
          userId: Number(manualForm.userId),
          type: manualForm.type,
          amount: Number(manualForm.amount),
          currency: manualForm.currency,
          notes: manualForm.notes,
          autoApprove: manualForm.autoApprove,
          paymentMethod: "super_admin_manual",
        }),
      });
      toast({ title: manualForm.autoApprove ? "Transaction created & approved" : "Pending transaction created" });
      setManualForm({ userId: "", type: "deposit", amount: "", currency: "USD", notes: "", autoApprove: true });
      load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const filteredTx = filter === "all" ? transactions : transactions.filter(t => t.status === filter);

  const TxRow = ({ tx }: { tx: any }) => (
    <Card key={tx.id} className="bg-white/5 border-white/10">
      <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={tx.type === "deposit" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {tx.type === "deposit" ? <ArrowDownLeft className="h-3 w-3 mr-1" /> : <ArrowUpRight className="h-3 w-3 mr-1" />}
              {tx.type}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">{tx.status}</Badge>
          </div>
          <p className="text-sm font-medium mt-1">{tx.userEmail || `User #${tx.userId}`}</p>
          <p className="text-xs text-muted-foreground">
            {tx.amount} {tx.currency} · {tx.paymentMethod || "—"} · {new Date(tx.createdAt).toLocaleString()}
          </p>
          {tx.txHash && <p className="text-[10px] font-mono text-muted-foreground break-all mt-1">TX: {tx.txHash}</p>}
        </div>
        {tx.status === "pending" && (
          <div className="flex gap-2">
            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approve(tx.id, tx)}>
              <CheckCircle className="h-3 w-3 mr-1" />Approve
            </Button>
            <Button size="sm" variant="outline" className="text-red-400" onClick={() => reject(tx.id)}>
              <XCircle className="h-3 w-3 mr-1" />Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Wallet className="h-5 w-5 text-emerald-400" />Wallet & Transactions</h2>
          <p className="text-sm text-muted-foreground">Approve deposits/withdrawals, adjust balances, create manual transactions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending Deposits", value: deposits.length, color: "text-green-400" },
          { label: "Pending Withdrawals", value: withdrawals.length, color: "text-red-400" },
          { label: "Total Pending", value: pending.length, color: "text-amber-400" },
          { label: "All Transactions", value: transactions.length, color: "text-blue-400" },
        ].map(s => (
          <Card key={s.label} className="bg-white/5 border-white/10">
            <CardContent className="p-3">
              <p className={`text-xl font-bold ${s.color}`}>{loading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="queue">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="queue">Approval Queue</TabsTrigger>
          <TabsTrigger value="all">All Transactions</TabsTrigger>
          <TabsTrigger value="adjust">Balance Adjust</TabsTrigger>
          <TabsTrigger value="manual">Manual Deposit/Withdraw</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4 space-y-2 data-[state=active]:block">
          {loading ? <Skeleton className="h-20 w-full" /> : pending.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No pending transactions.</p>
          ) : pending.map(tx => <TxRow key={tx.id} tx={tx} />)}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-2 data-[state=active]:block">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 bg-white/5 border-white/10 mb-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          {loading ? <Skeleton className="h-20 w-full" /> : filteredTx.slice(0, 50).map(tx => <TxRow key={tx.id} tx={tx} />)}
        </TabsContent>

        <TabsContent value="adjust" className="mt-4 data-[state=active]:block">
          <Card className="bg-white/5 border-white/10 max-w-lg">
            <CardHeader><CardTitle className="text-base">Direct Wallet Adjustment</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={adjustWallet} className="space-y-3">
                <div className="space-y-1">
                  <Label>User</Label>
                  <Select value={adjustForm.userId} onValueChange={v => setAdjustForm(f => ({ ...f, userId: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName} ({u.email})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Amount (+ credit / − debit)</Label>
                    <Input type="number" step="0.01" required value={adjustForm.amount} onChange={e => setAdjustForm(f => ({ ...f, amount: e.target.value }))} className="bg-white/5 border-white/10" placeholder="500 or -100" />
                  </div>
                  <div className="space-y-1">
                    <Label>Wallet</Label>
                    <Select value={adjustForm.walletType} onValueChange={v => setAdjustForm(f => ({ ...f, walletType: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fiat">Fiat (USD)</SelectItem>
                        <SelectItem value="crypto">Crypto (USDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Reason</Label>
                  <Textarea required value={adjustForm.reason} onChange={e => setAdjustForm(f => ({ ...f, reason: e.target.value }))} className="bg-white/5 border-white/10" placeholder="Bonus, correction, etc." />
                </div>
                <Button type="submit" className="bg-amber-500 text-black w-full">Apply Adjustment</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="mt-4 data-[state=active]:block">
          <Card className="bg-white/5 border-white/10 max-w-lg">
            <CardHeader><CardTitle className="text-base">Create Deposit or Withdrawal</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={createManual} className="space-y-3">
                <div className="space-y-1">
                  <Label>User</Label>
                  <Select value={manualForm.userId} onValueChange={v => setManualForm(f => ({ ...f, userId: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select user" /></SelectTrigger>
                    <SelectContent>
                      {users.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.fullName} — ${u.balanceFiat?.toFixed?.(2) ?? u.balanceFiat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={manualForm.type} onValueChange={v => setManualForm(f => ({ ...f, type: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Deposit</SelectItem>
                        <SelectItem value="withdrawal">Withdrawal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" required min="0.01" value={manualForm.amount} onChange={e => setManualForm(f => ({ ...f, amount: e.target.value }))} className="bg-white/5 border-white/10" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Notes</Label>
                  <Textarea value={manualForm.notes} onChange={e => setManualForm(f => ({ ...f, notes: e.target.value }))} className="bg-white/5 border-white/10" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={manualForm.autoApprove} onCheckedChange={v => setManualForm(f => ({ ...f, autoApprove: v }))} />
                  <Label>Auto-approve (credit/debit wallet immediately)</Label>
                </div>
                <Button type="submit" className="bg-amber-500 text-black w-full">Create Transaction</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewTx} onOpenChange={open => { if (!open) { setReviewTx(null); setChainVerified(false); } }}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve crypto deposit</DialogTitle>
            <DialogDescription>
              Verify the blockchain transaction hash, amount, and deposit wallet before crediting the user.
            </DialogDescription>
          </DialogHeader>
          {reviewTx && (
            <CryptoBlockchainVerifyPanel
              transactionId={reviewTx.id}
              txHash={reviewTx.txHash}
              onVerifiedChange={setChainVerified}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTx(null)}>Cancel</Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={confirmApprove} disabled={!chainVerified}>
              Approve & Credit Wallet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
