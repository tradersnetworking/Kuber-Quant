import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Briefcase, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staffFetch } from "@/lib/staff-api";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_STAT_GRID, STAFF_TOOLBAR_ROW } from "@/lib/staff-dashboard-ui";

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
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  completed: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  withdrawn: "bg-muted text-muted-foreground",
};

export function PlatformInvestmentsPanel({
  apiBase = "/super-admin",
}: {
  apiBase?: "/super-admin" | "/support-team";
}) {
  const [items, setItems] = useState<PlatformInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformInvestment[]>(`${apiBase}/investments`);
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
    i.userEmail.toLowerCase().includes(search.toLowerCase()) ||
    (i.planName || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = items.reduce((s, i) => s + i.amount, 0);
  const activeCount = items.filter(i => i.status === "active").length;

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            Platform Investments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            All investments from users and managers — funds collected across the platform.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className={STAFF_STAT_GRID}>
        <KpiStatCard compact label="Total invested (all time)" value={`$${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} iconClassName="text-amber-600 dark:text-amber-400" />
        <KpiStatCard compact label="Active investments" value={activeCount} iconClassName="text-green-700 dark:text-green-400" />
        <KpiStatCard compact label="Total records" value={items.length} iconClassName="text-blue-600 dark:text-blue-400" />
      </div>

      <Card className={STAFF_CARD}>
        <CardHeader>
          <div className={STAFF_TOOLBAR_ROW}>
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
                className="pl-9 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
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
                  key: "plan",
                  header: "Plan / Type",
                  cell: i => (
                    <>
                      <p className="text-sm">{i.planName || i.type}</p>
                      <p className="text-xs text-muted-foreground capitalize font-normal">{i.type}</p>
                    </>
                  ),
                },
                {
                  key: "amount",
                  header: "Amount",
                  headerClassName: "text-right",
                  cellClassName: "text-right font-medium",
                  cell: i => `$${i.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${i.currency}`,
                },
                {
                  key: "profit",
                  header: "Profit",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-green-700 dark:text-green-400",
                  cell: i => `$${i.profit.toFixed(2)} (${i.profitPercent}%)`,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: i => (
                    <Badge className={`text-xs ${statusColor[i.status] || "bg-muted text-muted-foreground"}`}>{i.status}</Badge>
                  ),
                },
                {
                  key: "date",
                  header: "Date",
                  hideOnMobile: true,
                  cellClassName: "text-xs text-muted-foreground",
                  cell: i => new Date(i.createdAt).toLocaleDateString(),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
