import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Briefcase, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffFetch } from "@/lib/staff-api";

interface PlatformInvestment {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  type: string;
  planName: string | null;
  amount: number;
  currency: string;
  profit: number;
  profitPercent: number;
  status: string;
  maturityDate: string | null;
  createdAt: string;
}

const statusColor: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  pending: "bg-orange-500/20 text-orange-400",
  completed: "bg-blue-500/20 text-blue-400",
  withdrawn: "bg-gray-500/20 text-gray-400",
};

export function PlatformInvestmentsPanel() {
  const [items, setItems] = useState<PlatformInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformInvestment[]>("/super-admin/investments");
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(i =>
    !search ||
    i.userName.toLowerCase().includes(search.toLowerCase()) ||
    i.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    (i.planName || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const activeCount = items.filter(i => i.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-amber-400" />
            Platform Investments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All investments from users and managers — funds collected across the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-muted-foreground mt-1">Total invested (all time)</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Active investments</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">{items.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total records</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">User & Manager Investments</CardTitle>
              <CardDescription>Review all active and completed investment positions</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user or plan..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-white/5 border-white/10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map(n => <Skeleton key={n} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No investments found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Plan / Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => (
                    <TableRow key={i.id} className="border-white/5">
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{i.userName}</p>
                          <p className="text-xs text-muted-foreground">{i.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{i.userRole}</TableCell>
                      <TableCell>
                        <p className="text-sm">{i.planName || i.type}</p>
                        <p className="text-xs text-muted-foreground capitalize">{i.type}</p>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${i.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {i.currency}
                      </TableCell>
                      <TableCell className="text-right text-green-400">
                        ${i.profit.toFixed(2)} ({i.profitPercent}%)
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${statusColor[i.status] || "bg-gray-500/20 text-gray-400"}`}>
                          {i.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(i.createdAt).toLocaleDateString()}
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
