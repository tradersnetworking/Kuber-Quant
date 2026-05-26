import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cpu, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staff-api";
import { AlgoStrategiesManagementPanel } from "@/components/super-admin/AlgoStrategiesManagementPanel";

interface AlgoSubscription {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  strategyId: number;
  strategyName: string;
  active: boolean;
  createdAt: string;
}

export function PlatformAlgoTradingPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<AlgoSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<AlgoSubscription[]>("/super-admin/algo-subscriptions");
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
    i.strategyName.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = items.filter(i => i.active).length;

  const toggleSub = async (id: number, active: boolean) => {
    setPending(id);
    try {
      await staffFetch(`/super-admin/algo-subscriptions/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      });
      setItems(prev => prev.map(i => i.id === id ? { ...i, active } : i));
      toast({ title: active ? "Subscription activated" : "Subscription deactivated" });
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="space-y-8">
      <AlgoStrategiesManagementPanel />

      <div className="border-t border-white/10 pt-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-400" />
            Algo Trading Subscriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor algorithmic trading subscriptions across users and managers.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-indigo-400">{activeCount}</p>
            <p className="text-xs text-muted-foreground mt-1">Active subscriptions</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-400">{items.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total subscriptions</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base">User & Manager Algo Subscriptions</CardTitle>
              <CardDescription>Who is subscribed to which algo strategy</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search user or strategy..."
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
              {[1, 2, 3].map(n => <Skeleton key={n} className="h-10 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No algo subscriptions found</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Strategy</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subscribed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(i => (
                    <TableRow key={i.id} className="border-white/5">
                      <TableCell>
                        <p className="font-medium text-sm">{i.userName}</p>
                        <p className="text-xs text-muted-foreground">{i.userEmail}</p>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{i.userRole}</TableCell>
                      <TableCell>{i.strategyName}</TableCell>
                      <TableCell>
                        <Badge className={i.active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                          {i.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(i.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending === i.id}
                          onClick={() => toggleSub(i.id, !i.active)}>
                          {i.active ? "Deactivate" : "Activate"}
                        </Button>
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
    </div>
  );
}
