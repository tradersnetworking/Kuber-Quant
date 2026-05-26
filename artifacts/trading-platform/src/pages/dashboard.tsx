import * as ApiHooks from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowUpRight, ArrowDownLeft, Users, Bell, Wallet,
  TrendingUp, ShieldAlert, Plus, ArrowRightLeft,
  Activity, Target, BarChart3, PieChart as PieIcon,
  Coins, Award, LineChart,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { SafeBoundary } from "@/components/SafeBoundary";

const CRYPTO_COLORS = ["#F59E0B", "#6366f1", "#22c55e", "#f43f5e"];

const MONTHLY_DATA = [
  { month: "Jan", return: 4.2, invested: 12000 },
  { month: "Feb", return: 5.8, invested: 15000 },
  { month: "Mar", return: 3.1, invested: 18000 },
  { month: "Apr", return: 7.4, invested: 22000 },
  { month: "May", return: 6.2, invested: 25000 },
  { month: "Jun", return: 8.9, invested: 30000 },
];

function StatCard({
  title, value, isLoading, prefix = "", suffix = "", icon, trend, trendValue, gradient = false,
}: {
  title: string; value?: number; isLoading: boolean; prefix?: string; suffix?: string;
  icon?: React.ReactNode; trend?: "up" | "down"; trendValue?: string; gradient?: boolean;
}) {
  const formatted = value !== undefined
    ? `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`
    : "—";
  return (
    <Card className={`${gradient ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-500/30" : "bg-white/5 border-white/10"} backdrop-blur-sm`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between mb-3">
          <p className="text-sm text-muted-foreground">{title}</p>
          <div className={`p-2 rounded-lg ${gradient ? "bg-amber-500/20" : "bg-white/5"}`}>{icon}</div>
        </div>
        {isLoading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <div>
            <p className={`text-3xl font-black tracking-tight ${gradient ? "text-amber-400" : "text-white"}`}>{formatted}</p>
            {trend && trendValue && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
                {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                {trendValue} this month
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#050A14] border border-white/10 rounded-lg px-4 py-3 shadow-xl">
        <p className="text-xs text-zinc-400 mb-2">{label}</p>
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

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: isLoadingSummary } = ApiHooks.useGetDashboardSummary();
  const { data: chartData, isLoading: isLoadingChart } = ApiHooks.useGetPortfolioChart();
  const { data: activity, isLoading: isLoadingActivity } = ApiHooks.useGetRecentActivity();

  const useGetWallet = (ApiHooks as any).useGetWallet;
  const useGetReferralStats = (ApiHooks as any).useGetReferralStats;
  const useListNotifications = (ApiHooks as any).useListNotifications;

  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet ? useGetWallet() : { data: null, isLoading: false };
  const { data: referralStats } = useGetReferralStats ? useGetReferralStats() : { data: null };
  const { data: notifications } = useListNotifications ? useListNotifications() : { data: null };

  const unreadCount = (notifications as any[])?.filter((n: any) => !n.isRead).length || 0;

  const portfolioPie = [
    { name: "Fiat USD", value: Number(wallet?.fiatBalance || 0) },
    { name: "Crypto", value: Number(wallet?.cryptoBalance || 0) },
    { name: "Invested", value: Number(summary?.totalInvested || 0) },
    { name: "Profit", value: Number(summary?.totalProfit || 0) },
  ].filter(d => d.value > 0);

  const hasPortfolioData = portfolioPie.length > 0;

  return (
    <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Welcome back, {user?.fullName?.split(" ")[0]}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SafeBoundary label="Wallet actions unavailable">
              <WalletQuickActions layout="row" />
            </SafeBoundary>
            <Link href="/referral">
              <Button variant="ghost" className="text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 h-9">
                <Users className="mr-2 h-4 w-4" /> Refer
              </Button>
            </Link>
            {unreadCount > 0 && (
              <Link href="/notifications">
                <Button variant="ghost" className="text-zinc-400 hover:text-amber-400 hover:bg-amber-500/10 h-9 relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* ── KYC Banner ── */}
        {user?.kycStatus !== "verified" && (
          <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-yellow-600/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-full">
                    <ShieldAlert className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-amber-400">Complete KYC Verification</h3>
                    <p className="text-xs text-muted-foreground">Unlock full platform features, higher limits, and withdrawals.</p>
                  </div>
                </div>
                <Link href="/kyc">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-bold">Verify Now →</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Top Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Portfolio" value={summary?.totalBalance} isLoading={isLoadingSummary}
            prefix="$" icon={<Wallet className="h-4 w-4 text-amber-400" />}
            trend="up" trendValue="+12.4%" gradient
          />
          <StatCard
            title="Fiat Balance" value={wallet?.fiatBalance} isLoading={isLoadingWallet}
            prefix="$" icon={<Coins className="h-4 w-4 text-blue-400" />}
          />
          <StatCard
            title="Total Profit" value={summary?.totalProfit} isLoading={isLoadingSummary}
            prefix="$" icon={<TrendingUp className="h-4 w-4 text-green-400" />}
            trend="up" trendValue="+8.2%"
          />
          <StatCard
            title="Referral Earnings" value={referralStats?.totalEarnings} isLoading={false}
            prefix="$" icon={<Award className="h-4 w-4 text-purple-400" />}
          />
        </div>

        {/* ── Secondary Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="col-span-2 lg:col-span-1">
            <Card className="bg-white/5 border-white/10 h-full">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Active Investments</p>
                  <Target className="h-4 w-4 text-amber-400" />
                </div>
                <div className="text-4xl font-black text-white">{isLoadingSummary ? <Skeleton className="h-10 w-16" /> : (summary?.activeInvestments || 0)}</div>
                <div className="text-xs text-muted-foreground">Total invested: <span className="text-amber-400 font-semibold">${Number(summary?.totalInvested || 0).toLocaleString()}</span></div>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-2 lg:col-span-1">
            <Card className="bg-white/5 border-white/10 h-full">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Crypto (USD)</p>
                  <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                </div>
                <div className="text-4xl font-black text-white">
                  {isLoadingWallet ? <Skeleton className="h-10 w-16" /> : `$${Number(wallet?.cryptoBalance || 0).toLocaleString()}`}
                </div>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span>BTC: <span className="text-orange-400">{wallet?.btcBalance?.toFixed(4) || "0"}</span></span>
                  <span>ETH: <span className="text-blue-400">{wallet?.ethBalance?.toFixed(4) || "0"}</span></span>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="col-span-2">
            <Card className="bg-white/5 border-white/10 h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-muted-foreground">Portfolio Growth</p>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">+12.5% YTD</Badge>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Investments", pct: 65, color: "bg-amber-500" },
                    { label: "Fiat", pct: 25, color: "bg-blue-500" },
                    { label: "Crypto", pct: 10, color: "bg-purple-500" },
                  ].map(({ label, pct, color }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{label}</span><span>{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ── Main Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Portfolio Performance Area Chart */}
          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-amber-400" />
                    Portfolio Performance
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">30-day value trend</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Live</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingChart ? (
                <Skeleton className="h-[260px] w-full" />
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
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="Value" stroke="#F59E0B" strokeWidth={2.5} fillOpacity={1} fill="url(#areaGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                  <BarChart3 className="h-10 w-10 opacity-20" />
                  <p className="text-sm">Make your first investment to see performance data</p>
                  <Link href="/plans">
                    <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      View Plans
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portfolio Allocation Pie */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <PieIcon className="h-4 w-4 text-amber-400" />
                Asset Allocation
              </CardTitle>
              <p className="text-xs text-muted-foreground">Portfolio breakdown</p>
            </CardHeader>
            <CardContent>
              {isLoadingWallet || isLoadingSummary ? (
                <div className="h-[200px] flex items-center justify-center">
                  <Skeleton className="h-36 w-36 rounded-full" />
                </div>
              ) : hasPortfolioData ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={portfolioPie} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                        dataKey="value" stroke="none" paddingAngle={3}>
                        {portfolioPie.map((_, i) => (
                          <Cell key={i} fill={CRYPTO_COLORS[i % CRYPTO_COLORS.length]} />
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
                        <div key={item.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: CRYPTO_COLORS[i % CRYPTO_COLORS.length] }} />
                            <span className="text-zinc-400">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold">${item.value.toLocaleString()}</span>
                            <span className="text-zinc-600 ml-1">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                  <PieIcon className="h-8 w-8 opacity-20" />
                  <p className="text-xs text-center">Deposit funds to see your allocation</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Monthly Returns Bar Chart + Wallet ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" />
                Monthly Returns (%)
              </CardTitle>
              <p className="text-xs text-muted-foreground">Historical return performance</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={MONTHLY_DATA} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Bar dataKey="return" name="Return %" radius={[4, 4, 0, 0]} fill="#F59E0B" maxBarSize={32}>
                    {MONTHLY_DATA.map((d, i) => (
                      <Cell key={i} fill={d.return >= 6 ? "#22c55e" : "#F59E0B"} fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Wallet Overview */}
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Wallet Balances</CardTitle>
                <Link href="/wallet">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">Manage →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: "$", label: "USD Fiat", sub: "Primary", val: `$${Number(wallet?.fiatBalance || 0).toLocaleString()}`, color: "bg-blue-500/20 text-blue-400" },
                { icon: "₿", label: "Bitcoin", sub: "BTC", val: `${wallet?.btcBalance?.toFixed(6) || "0"} BTC`, color: "bg-orange-500/20 text-orange-400" },
                { icon: "Ξ", label: "Ethereum", sub: "ETH", val: `${wallet?.ethBalance?.toFixed(4) || "0"} ETH`, color: "bg-indigo-500/20 text-indigo-400" },
                { icon: "₮", label: "Tether", sub: "USDT", val: `$${Number(wallet?.usdtBalance || 0).toLocaleString()}`, color: "bg-green-500/20 text-green-400" },
              ].map(({ icon, label, sub, val, color }) => (
                <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full ${color} flex items-center justify-center font-bold text-sm`}>{icon}</div>
                    <div>
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{sub}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold">{val}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── Activity + Quick Actions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  Recent Activity
                </CardTitle>
                <Link href="/transactions">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">View All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="space-y-1.5 flex-1">
                        <Skeleton className="h-3.5 w-48" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-1">
                  {activity.map(item => (
                    <div key={item.id} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 group">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          item.type === "deposit" ? "bg-green-500/10 text-green-400" :
                          item.type === "withdrawal" ? "bg-red-500/10 text-red-400" :
                          "bg-amber-500/10 text-amber-400"
                        }`}>
                          {item.type === "deposit" ? <ArrowUpRight className="h-3.5 w-3.5" /> :
                           item.type === "withdrawal" ? <ArrowDownLeft className="h-3.5 w-3.5" /> :
                           <TrendingUp className="h-3.5 w-3.5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium group-hover:text-amber-400 transition-colors">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${
                        item.type === "withdrawal" ? "text-red-400" : item.amount > 0 ? "text-green-400" : "text-zinc-400"
                      }`}>
                        {item.type === "withdrawal" ? "-" : item.amount > 0 ? "+" : ""}
                        {item.amount} {item.currency}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No transactions yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions + Investment Summary */}
          <div className="space-y-4">
            <Card className="bg-white/5 backdrop-blur-sm border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <SafeBoundary label="Wallet actions unavailable">
                  <WalletQuickActions />
                </SafeBoundary>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { href: "/copy-trading", icon: Users, label: "Copy Trading", cls: "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300" },
                    { href: "/mt5-relay", icon: LineChart, label: "MT4/MT5", cls: "bg-violet-500/15 hover:bg-violet-500/25 text-violet-300" },
                    { href: "/plans", icon: TrendingUp, label: "Invest", cls: "bg-white/10 hover:bg-white/15 text-white" },
                    { href: "/support", icon: Activity, label: "Support", cls: "bg-white/10 hover:bg-white/15 text-white" },
                  ].map(({ href, icon: Icon, label, cls }) => (
                    <Link key={label} href={href}>
                      <Button className={`w-full h-10 text-xs font-semibold ${cls}`}>
                        <Icon className="h-3.5 w-3.5 mr-1.5" />{label}
                      </Button>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-600/5 border-amber-500/20">
              <CardContent className="pt-5 pb-5 space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="h-4 w-4 text-amber-400" />
                  <p className="text-sm font-bold text-amber-400">Referral Program</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-xl font-black text-white">{user?.referralCount || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Referrals</p>
                  </div>
                  <div className="p-2 rounded-lg bg-white/5">
                    <p className="text-xl font-black text-amber-400">${Number(user?.referralEarnings || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Earned</p>
                  </div>
                </div>
                <Link href="/referral" className="block">
                  <Button size="sm" className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/20 font-semibold text-xs">
                    Share Referral Link
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
);
}
