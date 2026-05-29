import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Cpu, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staff-api";
import { AlgoStrategiesManagementPanel } from "@/components/super-admin/AlgoStrategiesManagementPanel";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_STAT_GRID, STAFF_TOOLBAR_ROW } from "@/lib/staff-dashboard-ui";

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

export function PlatformAlgoTradingPanel({
  apiBase = "/super-admin",
  readOnly = false,
}: {
  apiBase?: "/super-admin" | "/support-team";
  readOnly?: boolean;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<AlgoSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<AlgoSubscription[]>(`${apiBase}/algo-subscriptions`);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [apiBase]);

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
      {!readOnly && <AlgoStrategiesManagementPanel />}

      <div className={`${readOnly ? "" : "border-t border-border dark:border-white/10 pt-8"} space-y-6 min-w-0`}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Cpu className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            Algo Trading Subscriptions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor algorithmic trading subscriptions across users and managers.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className={STAFF_STAT_GRID}>
        <KpiStatCard compact label="Active subscriptions" value={activeCount} iconClassName="text-indigo-600 dark:text-indigo-400" />
        <KpiStatCard compact label="Total subscriptions" value={items.length} iconClassName="text-blue-600 dark:text-blue-400" />
      </div>

      <Card className={STAFF_CARD}>
        <CardHeader>
          <div className={STAFF_TOOLBAR_ROW}>
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
                className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
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
            <ResponsiveDataView
              data={filtered}
              rowKey={i => i.id}
              rowClassName="border-border/80 dark:border-white/5"
              mobileHeader={i => (
                <div className="mb-2 min-w-0">
                  <p className="font-semibold text-sm">{i.userName}</p>
                  <p className="text-xs text-muted-foreground truncate">{i.userEmail}</p>
                </div>
              )}
              mobileFooter={!readOnly ? i => (
                <div className="mt-3 pt-3 border-t border-border/80 flex justify-end">
                  <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending === i.id}
                    onClick={() => toggleSub(i.id, !i.active)}>
                    {i.active ? "Deactivate" : "Activate"}
                  </Button>
                </div>
              ) : undefined}
              columns={[
                {
                  key: "user",
                  header: "User",
                  mobileTitle: true,
                  hideOnMobile: true,
                  cell: i => (
                    <>
                      <p className="font-medium text-sm">{i.userName}</p>
                      <p className="text-xs text-muted-foreground font-normal">{i.userEmail}</p>
                    </>
                  ),
                },
                {
                  key: "role",
                  header: "Role",
                  cell: i => <span className="capitalize text-sm">{i.userRole}</span>,
                },
                {
                  key: "strategy",
                  header: "Strategy",
                  cell: i => i.strategyName,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: i => (
                    <Badge className={i.active ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}>
                      {i.active ? "Active" : "Inactive"}
                    </Badge>
                  ),
                },
                {
                  key: "subscribed",
                  header: "Subscribed",
                  cellClassName: "text-xs text-muted-foreground",
                  cell: i => new Date(i.createdAt).toLocaleDateString(),
                },
                ...(!readOnly ? [{
                  key: "actions",
                  header: "Actions",
                  headerClassName: "text-right",
                  hideOnMobile: true,
                  cell: (i: typeof filtered[0]) => (
                    <div className="text-right">
                      <Button size="sm" variant="outline" className="h-7 text-xs" disabled={pending === i.id}
                        onClick={() => toggleSub(i.id, !i.active)}>
                        {i.active ? "Deactivate" : "Activate"}
                      </Button>
                    </div>
                  ),
                }] : []),
              ]}
            />
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
