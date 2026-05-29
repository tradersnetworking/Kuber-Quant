import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { TrendingUp, Activity, History, LineChart, ArrowRight, Cpu } from "lucide-react";

export interface OverviewData {
  investmentPlans: Array<{
    id: number; name: string; description: string | null; minAmount: number; maxAmount: number;
    roiPercent: number; durationDays: number; currency: string; category: string; totalInvestors: number; isActive: boolean;
  }>;
  eaStrategies: Array<{
    id: number; name: string; type: string; description?: string; backtestRoi?: number;
    winRate?: number; pairs?: string; priceMonthly?: number; riskLevel?: string; category?: string;
  }>;
  mt5Requests: Array<{
    id: number; userId: number; userName: string; type: string; status: string;
    profitSharingPercent: number; details: string | null; createdAt: string;
  }>;
  mt5Accounts: Array<{
    id: number; userId: number; userName: string; accountNumber: string; broker: string;
    serverName: string | null; balance: number; equity: number; profit: number; status: string;
  }>;
  copyTraders: Array<{
    id: number; name: string; roi: number; monthlyRoi: number; followers: number; winRate: number; riskLevel: string;
  }>;
}

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  forwarded: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  accepted: "bg-green-500/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  active: "bg-green-500/20 text-green-700 dark:text-green-400",
  inactive: "bg-muted text-muted-foreground",
  pending_review: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400",
};

const CATEGORY_COLOR: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  premium: "bg-purple-500/20 text-purple-600 dark:text-purple-400",
  elite: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
};

function fmtNum(value: unknown, digits = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

interface Props {
  data: OverviewData | null;
  loading: boolean;
  onNavigate: (tab: string) => void;
}

export function SuperAdminOverviewSamples({ data, loading, onNavigate }: Props) {
  const plans = data?.investmentPlans ?? [];
  const eas = data?.eaStrategies ?? [];
  const mt5Reqs = data?.mt5Requests ?? [];
  const mt5Accs = data?.mt5Accounts ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Platform Catalog Preview</h3>
          <p className="text-sm text-muted-foreground">Sample investment plans, EA strategies, and MT5 services available on the platform</p>
        </div>
      </div>

      {/* Investment Plans */}
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                Investment Plans
              </CardTitle>
              <CardDescription>Plans created for users and managers to subscribe</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => onNavigate("investment-plans")}>
              Manage all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : plans.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No plans yet — create plans in Investment Plans tab</p>
          ) : (
            <ResponsiveDataView
              data={plans.slice(0, 6)}
              rowKey={p => p.id}
              onRowClick={() => onNavigate("investment-plans")}
              rowClassName="border-border/80 dark:border-white/5 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
              columns={[
                {
                  key: "plan",
                  header: "Plan",
                  mobileTitle: true,
                  cell: p => (
                    <>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 font-normal">{p.description}</p>
                    </>
                  ),
                },
                {
                  key: "category",
                  header: "Category",
                  cell: p => (
                    <Badge className={`text-xs capitalize ${CATEGORY_COLOR[p.category] || ""}`}>{p.category}</Badge>
                  ),
                },
                {
                  key: "roi",
                  header: "ROI",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-amber-600 dark:text-amber-400 font-semibold",
                  cell: p => `${fmtNum(p.roiPercent, 2)}%`,
                },
                {
                  key: "range",
                  header: "Min – Max",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-sm",
                  hideOnMobile: true,
                  cell: p => (
                    <>
                      {p.currency === "USD" ? "$" : ""}{fmtNum(p.minAmount, 2)} – {fmtNum(p.maxAmount, 2)} {p.currency || ""}
                    </>
                  ),
                },
                {
                  key: "duration",
                  header: "Duration",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-sm",
                  cell: p => `${p.durationDays ?? "—"}d`,
                },
                {
                  key: "investors",
                  header: "Investors",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-sm",
                  cell: p => fmtNum(p.totalInvestors),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EA Strategies */}
        <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  EA Strategies
                </CardTitle>
                <CardDescription>Expert Advisor catalog for MT5</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => onNavigate("ea-strategies")}>
                Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)
            ) : eas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No EA strategies in catalog</p>
            ) : (
              eas.map(ea => (
                <div
                  key={ea.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border/80 dark:border-white/5 hover:border-border dark:border-white/10 cursor-pointer transition-colors"
                  onClick={() => onNavigate("ea-strategies")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ea.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ea.type} · {ea.pairs || ea.category || "MT5"}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {ea.backtestRoi != null && (
                      <p className="text-sm font-bold text-green-700 dark:text-green-400">{ea.backtestRoi}% ROI</p>
                    )}
                    {ea.priceMonthly != null && (
                      <p className="text-xs text-muted-foreground">${ea.priceMonthly}/mo</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Copy Trading preview */}
        <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  Copy Trading Masters
                </CardTitle>
                <CardDescription>Top copy traders on the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => onNavigate("copy-trading")}>
                Manage <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              [1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)
            ) : (data?.copyTraders ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No copy traders configured</p>
            ) : (
              (data?.copyTraders ?? []).map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 dark:bg-white/[0.03] border border-border/80 dark:border-white/5 hover:border-border dark:border-white/10 cursor-pointer"
                  onClick={() => onNavigate("copy-trading")}
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.followers} followers · {t.winRate}% win rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{fmtNum(t.roi, 2)}% ROI</p>
                    <Badge className="text-[10px] capitalize">{t.riskLevel} risk</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* MT5 Accounts */}
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                MT Accounts & Profit Share
              </CardTitle>
              <CardDescription>User-submitted MT4/MT5 credentials for copy trading and account handling</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => onNavigate("mt5-accounts")}>
              View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : mt5Accs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No MT5 accounts linked yet</p>
          ) : (
            <ResponsiveDataView
              data={mt5Accs}
              rowKey={a => a.id}
              onRowClick={() => onNavigate("mt5-accounts")}
              rowClassName="border-border/80 dark:border-white/5 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
              columns={[
                {
                  key: "account",
                  header: "Account",
                  mobileTitle: true,
                  cell: a => <span className="font-mono text-sm">{a.accountNumber}</span>,
                },
                {
                  key: "user",
                  header: "User",
                  cell: a => <span className="text-sm">{a.userName}</span>,
                },
                {
                  key: "broker",
                  header: "Broker / Server",
                  hideOnMobile: true,
                  cell: a => <span className="text-sm text-muted-foreground">{a.broker} · {a.serverName}</span>,
                },
                {
                  key: "balance",
                  header: "Balance",
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  cell: a => `$${fmtNum(a.balance, 2)}`,
                },
                {
                  key: "profit",
                  header: "Profit",
                  headerClassName: "text-right",
                  cellClassName: `text-right font-medium`,
                  cell: a => (
                    <span className={Number(a.profit) >= 0 ? "text-green-700 dark:text-green-400" : "text-red-400"}>
                      {Number(a.profit) >= 0 ? "+" : ""}{fmtNum(a.profit, 2)}
                    </span>
                  ),
                },
                {
                  key: "status",
                  header: "Status",
                  cell: a => (
                    <Badge className={`text-xs capitalize ${STATUS_COLOR[a.status] || ""}`}>{a.status.replace("_", " ")}</Badge>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      {/* MT5 Relay & Account Handling */}
      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                MT5 Services — Copy Trading & Account Handling
              </CardTitle>
              <CardDescription>Relay requests from users for copy trading setup and managed accounts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400" onClick={() => onNavigate("mt5-accounts")}>
              Manage requests <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : mt5Reqs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No MT5 relay requests yet</p>
          ) : (
            <ResponsiveDataView
              data={mt5Reqs}
              rowKey={r => r.id}
              onRowClick={() => onNavigate("mt5")}
              rowClassName="border-border/80 dark:border-white/5 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
              mobileHeader={r => (
                <div className="mb-2 min-w-0">
                  <p className="font-semibold text-sm">{r.userName}</p>
                  <p className="text-xs text-muted-foreground">#{r.id}</p>
                </div>
              )}
              columns={[
                {
                  key: "id",
                  header: "ID",
                  hideOnMobile: true,
                  cell: r => <span className="text-muted-foreground">#{r.id}</span>,
                },
                {
                  key: "user",
                  header: "User",
                  mobileTitle: true,
                  hideOnMobile: true,
                  cell: r => <span className="text-sm font-medium">{r.userName}</span>,
                },
                {
                  key: "type",
                  header: "Service Type",
                  cell: r => (
                    <Badge variant="outline" className="text-xs capitalize">
                      {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}
                    </Badge>
                  ),
                },
                {
                  key: "profit",
                  header: "Profit Share",
                  cell: r => <span className="text-sm">{r.profitSharingPercent}%</span>,
                },
                {
                  key: "details",
                  header: "Details",
                  hideOnMobile: true,
                  cell: r => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{r.details}</span>,
                },
                {
                  key: "status",
                  header: "Status",
                  cell: r => (
                    <Badge className={`text-xs capitalize ${STATUS_COLOR[r.status] || ""}`}>{r.status}</Badge>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
