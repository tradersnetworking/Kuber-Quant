import { useListAdminTransactions, useApproveTransaction, useRejectTransaction } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminTransactionsPage() {
  const { data: transactions, isLoading, refetch } = useListAdminTransactions();
  const approveMutation = useApproveTransaction();
  const rejectMutation = useRejectTransaction();
  const { toast } = useToast();

  const handleApprove = (id: number) => {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Transaction approved" });
          refetch();
        }
      }
    );
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Transaction rejected" });
          refetch();
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Transactions</h1>
          <p className="text-muted-foreground">Review, approve, or reject user deposits and withdrawals.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : transactions?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">{tx.userEmail}</TableCell>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell className="font-bold">{tx.amount} {tx.currency}</TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.status === "approved" ? "default" :
                          tx.status === "rejected" ? "destructive" : "outline"
                        }>
                          {tx.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {tx.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-green-500 hover:text-green-600"
                              onClick={() => handleApprove(tx.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-500 hover:text-red-600"
                              onClick={() => handleReject(tx.id)}
                              disabled={approveMutation.isPending || rejectMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No transactions found.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
