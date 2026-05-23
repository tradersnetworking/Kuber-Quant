import { useState } from "react";
import { useListTransactions, useCreateTransaction } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function TransactionsPage() {
  const { data: transactions, isLoading, refetch } = useListTransactions();
  const createMutation = useCreateTransaction();
  const { toast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [type, setType] = useState<"deposit"|"withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"USD"|"EUR"|"BTC"|"ETH"|"USDT">("USD");
  const [paymentMethod, setPaymentMethod] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { type, amount: Number(amount), currency, paymentMethod } },
      {
        onSuccess: () => {
          toast({ title: "Transaction requested", description: "Your request is pending approval." });
          setShowCreate(false);
          setAmount("");
          refetch();
        },
        onError: () => {
          toast({ title: "Request failed", variant: "destructive" });
        }
      }
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="text-muted-foreground">Manage deposits and withdrawals.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "Cancel" : "New Transaction"}
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardHeader>
              <CardTitle>New Transaction</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={type} 
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="deposit">Deposit</option>
                      <option value="withdrawal">Withdrawal</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={currency} 
                      onChange={(e) => setCurrency(e.target.value as any)}
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="BTC">BTC</option>
                      <option value="ETH">ETH</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Amount</label>
                    <Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Method / Address</label>
                    <Input required value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Bank account, crypto address, etc." />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Processing..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
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
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{tx.type}</TableCell>
                      <TableCell className="font-bold">{tx.amount} {tx.currency}</TableCell>
                      <TableCell>{tx.paymentMethod || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={
                          tx.status === "approved" ? "default" :
                          tx.status === "rejected" ? "destructive" : "outline"
                        }>
                          {tx.status}
                        </Badge>
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
