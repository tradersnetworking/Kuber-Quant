import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  pending: "bg-orange-500/20 text-orange-400",
  forwarded: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-amber-500/20 text-amber-400",
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-gray-500/20 text-gray-400",
  pending_review: "bg-yellow-500/20 text-yellow-400",
};

const CATEGORY_COLOR: Record<string, string> = {
  starter: "bg-zinc-500/20 text-zinc-300",
  growth: "bg-blue-500/20 text-blue-400",
  premium: "bg-purple-500/20 text-purple-400",
  elite: "bg-amber-500/20 text-amber-400",
};

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
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-yellow-400" />
                Investment Plans
              </CardTitle>
              <CardDescription>Plans created for users and managers to subscribe</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => onNavigate("investment-plans")}>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Plan</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Min – Max</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead className="text-right">Investors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.slice(0, 6).map(p => (
                    <TableRow key={p.id} className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => onNavigate("investment-plans")}>
                      <TableCell>
                        <p className="font-medium text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{p.description}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${CATEGORY_COLOR[p.category] || ""}`}>{p.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-amber-400 font-semibold">{p.roiPercent}%</TableCell>
                      <TableCell className="text-right text-sm">
                        {p.currency === "USD" ? "$" : ""}{p.minAmount.toLocaleString()} – {p.maxAmount.toLocaleString()} {p.currency}
                      </TableCell>
                      <TableCell className="text-right text-sm">{p.durationDays}d</TableCell>
                      <TableCell className="text-right text-sm">{p.totalInvestors.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EA Strategies */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-400" />
                  EA Strategies
                </CardTitle>
                <CardDescription>Expert Advisor catalog for MT5</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => onNavigate("ea-strategies")}>
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
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 cursor-pointer transition-colors"
                  onClick={() => onNavigate("ea-strategies")}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{ea.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{ea.type} · {ea.pairs || ea.category || "MT5"}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    {ea.backtestRoi != null && (
                      <p className="text-sm font-bold text-green-400">{ea.backtestRoi}% ROI</p>
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
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Copy Trading Masters
                </CardTitle>
                <CardDescription>Top copy traders on the platform</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => onNavigate("copy-trading")}>
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
                  className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 cursor-pointer"
                  onClick={() => onNavigate("copy-trading")}
                >
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.followers} followers · {t.winRate}% win rate</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-cyan-400">{t.roi}% ROI</p>
                    <Badge className="text-[10px] capitalize">{t.riskLevel} risk</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* MT5 Accounts */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-sky-400" />
                MT Accounts & Profit Share
              </CardTitle>
              <CardDescription>User-submitted MT4/MT5 credentials for copy trading and account handling</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => onNavigate("mt5-accounts")}>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>Account</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Broker / Server</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mt5Accs.map(a => (
                    <TableRow key={a.id} className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => onNavigate("mt5-accounts")}>
                      <TableCell className="font-mono text-sm">{a.accountNumber}</TableCell>
                      <TableCell className="text-sm">{a.userName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.broker} · {a.serverName}</TableCell>
                      <TableCell className="text-right">${a.balance.toLocaleString()}</TableCell>
                      <TableCell className={`text-right font-medium ${a.profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {a.profit >= 0 ? "+" : ""}{a.profit.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${STATUS_COLOR[a.status] || ""}`}>{a.status.replace("_", " ")}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MT5 Relay & Account Handling */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <LineChart className="h-4 w-4 text-violet-400" />
                MT5 Services — Copy Trading & Account Handling
              </CardTitle>
              <CardDescription>Relay requests from users for copy trading setup and managed accounts</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-amber-400" onClick={() => onNavigate("mt5-accounts")}>
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Service Type</TableHead>
                    <TableHead>Profit Share</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mt5Reqs.map(r => (
                    <TableRow key={r.id} className="border-white/5 hover:bg-white/5 cursor-pointer" onClick={() => onNavigate("mt5")}>
                      <TableCell className="text-muted-foreground">#{r.id}</TableCell>
                      <TableCell className="text-sm font-medium">{r.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{r.profitSharingPercent}%</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.details}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${STATUS_COLOR[r.status] || ""}`}>{r.status}</Badge>
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
