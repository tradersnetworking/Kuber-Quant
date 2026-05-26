import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { authFetchJson } from "@/lib/token-store";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { ArrowDownLeft, ArrowUpRight, BookOpen, ClipboardList, RefreshCw } from "lucide-react";
import { format } from "date-fns";

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
  createdAt: string;
};

type WalletHistory = {
  summary: {
    totalDeposited: number;
    totalWithdrawn: number;
    pendingDeposits: number;
    pendingWithdrawals: number;
    rejectedDeposits: number;
    rejectedWithdrawals: number;
  };
  requests: TxnRequest[];
  ledger: LedgerEntry[];
};

const STATUS_BADGE: Record<string, string> = {
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
};

function fmtAmount(n: number, currency: string) {
  const prefix = !["BTC", "ETH"].includes(currency) && currency !== "USDT" ? "$" : "";
  return `${prefix}${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
}

export function WalletHistoryPanel({ compact }: { compact?: boolean }) {
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [view, setView] = useState<"requests" | "ledger">("requests");

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["/api/wallet/history", filter],
    queryFn: () => authFetchJson<WalletHistory>(`/wallet/history?type=${filter}&limit=100`),
    ...financeQueryOptions,
  });

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {!compact && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase text-muted-foreground">Total Deposited</p>
              <p className="text-xl font-bold text-green-400">${summary.totalDeposited.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-red-500/5 border-red-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase text-muted-foreground">Total Withdrawn</p>
              <p className="text-xl font-bold text-red-400">${summary.totalWithdrawn.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase text-muted-foreground">Pending</p>
              <p className="text-xl font-bold text-amber-400">{summary.pendingDeposits + summary.pendingWithdrawals}</p>
              <p className="text-[10px] text-muted-foreground">{summary.pendingDeposits} dep · {summary.pendingWithdrawals} wdr</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <p className="text-[10px] uppercase text-muted-foreground">Ledger Entries</p>
              <p className="text-xl font-bold">{data?.ledger.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Balance movements</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-amber-400" /> Deposit & Withdrawal History
              </CardTitle>
              <CardDescription>
                Transaction requests (pending/approved) and immutable wallet ledger entries
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching} className="border-white/10">
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(["all", "deposit", "withdrawal"] as const).map(f => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "outline"}
                className={filter === f ? "bg-amber-500 text-black" : "border-white/10"}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "deposit" ? "Deposits" : "Withdrawals"}
              </Button>
            ))}
          </div>

          <Tabs value={view} onValueChange={v => setView(v as any)}>
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="requests" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" /> Requests
              </TabsTrigger>
              <TabsTrigger value="ledger" className="gap-1.5">
                <BookOpen className="h-3.5 w-3.5" /> Ledger
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests" className="mt-4">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !data?.requests.length ? (
                <p className="text-center py-10 text-sm text-muted-foreground">No deposit or withdrawal requests yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method / Destination</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ref</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.requests.map(tx => (
                        <TableRow key={tx.id} className="border-white/10">
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(tx.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 text-sm capitalize ${tx.type === "deposit" ? "text-green-400" : "text-red-400"}`}>
                              {tx.type === "deposit" ? <ArrowDownLeft className="h-3.5 w-3.5" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                              {tx.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{fmtAmount(tx.amount, tx.currency)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                            {tx.paymentMethod || tx.notes || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] border capitalize ${STATUS_BADGE[tx.status] || ""}`}>{tx.status}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">#{tx.id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="ledger" className="mt-4">
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !data?.ledger.length ? (
                <p className="text-center py-10 text-sm text-muted-foreground">
                  No ledger entries yet. Ledger records balance changes when deposits are approved, withdrawals are held, or rejected withdrawals are refunded.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Wallet</TableHead>
                        <TableHead>Balance Before</TableHead>
                        <TableHead>Balance After</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Ref</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.ledger.map(entry => (
                        <TableRow key={entry.id} className="border-white/10">
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                          </TableCell>
                          <TableCell className="capitalize text-sm">{entry.type}</TableCell>
                          <TableCell className={`font-semibold ${entry.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {entry.amount >= 0 ? "+" : "−"}{fmtAmount(entry.amount, entry.currency)}
                          </TableCell>
                          <TableCell className="capitalize text-xs text-muted-foreground">{entry.walletType}</TableCell>
                          <TableCell className="text-sm">{entry.balanceBefore.toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-medium">{entry.balanceAfter.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                            {entry.description || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {entry.referenceType === "transaction" && entry.referenceId ? `#${entry.referenceId}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
