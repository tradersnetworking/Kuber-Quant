import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Activity, BarChart3, PieChart as PieIcon } from "lucide-react";

const CRYPTO_COLORS = ["#F59E0B", "#6366f1", "#22c55e", "#f43f5e"];

const ALLOCATION_COLORS: Record<string, string> = {
  invested: "#F59E0B",
  fiat: "#3b82f6",
  crypto: "#a855f7",
  profit: "#22c55e",
};

const ALLOCATION_LABEL_KEYS: Record<string, string> = {
  invested: "dashboard.invested",
  fiat: "dashboard.fiat",
  crypto: "dashboard.crypto",
  profit: "dashboard.profit",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border dark:border-white/10 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-xs text-muted-foreground mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold" style={{ color: p.color }}>
            {p.name}: {typeof p.value === "number" ? (p.name?.includes("%") || p.dataKey === "return" ? `${p.value}%` : `$${p.value.toLocaleString()}`) : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export type InvestorDashboardChartsBlockProps = {
  t: (key: string, opts?: Record<string, unknown>) => string;
  chartData?: Array<{ date: string; value: number }>;
  isLoadingChart: boolean;
  portfolioPie: Array<{ name: string; value: number; key?: string }>;
  hasPortfolioData: boolean;
  isLoadingWallet: boolean;
  isLoadingSummary: boolean;
  monthlyReturns?: Array<{ month: string; return: number; invested: number }>;
  isLoadingMonthlyReturns?: boolean;
  portfolioAllocation?: Array<{ label: string; pct: number; value: number }>;
};

export function InvestorDashboardChartsBlock({
  t,
  chartData,
  isLoadingChart,
  portfolioPie,
  hasPortfolioData,
  isLoadingWallet,
  isLoadingSummary,
  monthlyReturns = [],
  isLoadingMonthlyReturns = false,
  portfolioAllocation = [],
}: InvestorDashboardChartsBlockProps) {
  const hasMonthlyData = monthlyReturns.some(d => d.return > 0 || d.invested > 0);
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        <Card className="lg:col-span-2 bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  {t("dashboard.portfolioPerformance")}
                </CardTitle>
                  {t("dashboard.portfolioPerformanceDesc")}
              </div>
              <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs w-fit">{t("common.live")}</Badge>
            </div>
          </CardHeader>
          <CardContent className="min-w-0">
            {isLoadingChart ? (
              <Skeleton className="h-[220px] sm:h-[260px] w-full" />
            ) : chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="value" name={t("dashboard.value")} stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] sm:h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-3 px-4 text-center">
                <BarChart3 className="h-10 w-10 opacity-20" />
                <p className="text-sm">{t("dashboard.firstInvestmentHint")}</p>
                <Link href="/plans">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    {t("dashboard.viewPlans")}
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 min-w-0 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              {t("dashboard.assetAllocation")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">{t("dashboard.portfolioBreakdown")}</p>
          </CardHeader>
          <CardContent className="min-w-0">
            {isLoadingWallet || isLoadingSummary ? (
              <div className="h-[200px] flex items-center justify-center">
                <Skeleton className="h-36 w-36 rounded-full" />
              </div>
            ) : hasPortfolioData ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={portfolioPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" stroke="none" paddingAngle={3}>
                      {portfolioPie.map((item, i) => (
                        <Cell key={i} fill={ALLOCATION_COLORS[item.key || ""] || CRYPTO_COLORS[i % CRYPTO_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {portfolioPie.map((item, i) => {
                    const total = portfolioPie.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
                    return (
                      <div key={item.name} className="flex items-center justify-between gap-2 text-xs min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: ALLOCATION_COLORS[item.key || ""] || CRYPTO_COLORS[i % CRYPTO_COLORS.length] }} />
                          <span className="text-muted-foreground truncate">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-semibold">${item.value.toLocaleString()}</span>
                          <span className="text-muted-foreground/80 ml-1">({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2 px-4 text-center">
                <PieIcon className="h-8 w-8 opacity-20" />
                <p className="text-xs">{t("dashboard.depositFundsHint")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 min-w-0 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            {t("dashboard.monthlyReturns")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">{t("dashboard.historicalReturns")}</p>
        </CardHeader>
        <CardContent className="min-w-0">
          {isLoadingMonthlyReturns ? (
            <Skeleton className="h-[200px] w-full" />
          ) : hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyReturns} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Bar dataKey="return" name={t("dashboard.returnPct")} radius={[4, 4, 0, 0]} fill="#F59E0B" maxBarSize={32}>
                  {monthlyReturns.map((d, i) => (
                    <Cell key={i} fill={d.return >= 6 ? "#22c55e" : "#F59E0B"} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2 px-4 text-center">
              <BarChart3 className="h-8 w-8 opacity-20" />
              <p className="text-xs">{t("dashboard.firstInvestmentHint")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {portfolioAllocation.length > 0 && (
        <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold">{t("dashboard.portfolioGrowth")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {portfolioAllocation.map(({ label, pct }) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{t(ALLOCATION_LABEL_KEYS[label] || label)}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted/60 dark:bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: ALLOCATION_COLORS[label] || "#F59E0B" }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}
