import { useListManagerTransactions, Transaction } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";

type TxRow = Transaction & { userName?: string; userEmail?: string; userId?: number };

export default function ManagerTransactions() {
  const { data: transactions, isLoading } = useListManagerTransactions({
    query: financeQueryOptions as any,
  });

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Client Transactions</h1>
          <p className="text-muted-foreground">All deposit and withdrawal activity from your assigned clients.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No transactions from your clients yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (transactions as TxRow[])?.map((tx) => (
                      <TableRow key={tx.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <p className="font-medium text-foreground">{tx.userName || "Unknown Client"}</p>
                          <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {tx.type === "deposit" ? (
                              <ArrowDownLeft className="h-4 w-4 text-green-500" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-red-500" />
                            )}
                            <span className="capitalize text-muted-foreground">{tx.type}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {tx.currency} {tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tx.status === "approved" ? "default" : "outline"}
                            className={
                              tx.status === "approved"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : tx.status === "pending"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }>
                            {tx.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {tx.createdAt ? format(new Date(tx.createdAt), "MMM d, HH:mm") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {tx.userId ? (
                            <Link href={`/manager/clients/${tx.userId}`}>
                              <span className="text-amber-400 hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                                View Client
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs font-mono text-muted-foreground">#{String(tx.id).padStart(6, "0")}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
);
}
