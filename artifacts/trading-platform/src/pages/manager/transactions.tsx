import { useListManagerTransactions, Transaction } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";

export default function ManagerTransactions() {
  const { data: transactions, isLoading } = useListManagerTransactions();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Pending Transactions</h1>
          <p className="text-muted-foreground">Monitor and review deposit/withdrawal requests from your clients.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Transaction Queue</CardTitle>
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
                    <TableHead className="text-right">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No pending transactions to display.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions?.map((tx: Transaction) => (
                      <TableRow key={tx.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {(tx as any).user?.fullName || "Unknown Client"}
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
                        <TableCell className="text-right text-xs font-mono text-muted-foreground">
                          #{String(tx.id).padStart(6, "0")}
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
    </AppLayout>
  );
}
