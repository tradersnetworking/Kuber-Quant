import { useState } from "react";
import { useListInvestments, useCreateInvestment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function InvestmentsPage() {
  const { data: investments, isLoading, refetch } = useListInvestments();
  const createMutation = useCreateInvestment();
  
  const [showCreate, setShowCreate] = useState(false);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"algo"|"copy"|"ea"|"manual">("manual");
  const [currency, setCurrency] = useState<"USD"|"EUR"|"BTC"|"ETH"|"USDT">("USD");
  const [planName, setPlanName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(
      { data: { amount: Number(amount), type, currency, planName } },
      {
        onSuccess: () => {
          setShowCreate(false);
          setAmount("");
          setPlanName("");
          refetch();
        }
      }
    );
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Investments
            </h1>
            <p className="text-muted-foreground">Manage your active and completed investments.</p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            {showCreate ? "Cancel" : "New Investment"}
          </Button>
        </div>

        {showCreate && (
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Create New Investment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Type</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                      value={type} 
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="manual">Manual</option>
                      <option value="algo">Algo</option>
                      <option value="copy">Copy</option>
                      <option value="ea">EA</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Currency</label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                    <Input type="number" required value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-black/50 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plan Name</label>
                    <Input required value={planName} onChange={(e) => setPlanName(e.target.value)} className="bg-black/50 border-white/10" />
                  </div>
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                  {createMutation.isPending ? "Creating..." : "Confirm Investment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Your Portfolio</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : investments?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-muted-foreground">Plan</TableHead>
                    <TableHead className="text-muted-foreground">Type</TableHead>
                    <TableHead className="text-muted-foreground">Amount</TableHead>
                    <TableHead className="text-muted-foreground">Profit</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map(inv => (
                    <TableRow key={inv.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium">{inv.planName}</TableCell>
                      <TableCell className="uppercase text-xs text-amber-500">{inv.type}</TableCell>
                      <TableCell>{inv.amount} {inv.currency}</TableCell>
                      <TableCell className={inv.profit > 0 ? "text-green-500 font-bold" : inv.profit < 0 ? "text-red-500 font-bold" : ""}>
                        {inv.profit > 0 ? "+" : ""}{inv.profit} {inv.currency}
                      </TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "active" ? "default" : "secondary"} className={inv.status === "active" ? "bg-green-500" : ""}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Link href={`/investments/${inv.id}`}>
                          <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">Details</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No investments found.</div>
            )}
          </CardContent>
        </Card>
      </div>
);
}
