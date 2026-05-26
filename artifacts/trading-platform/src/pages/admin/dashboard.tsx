import { useGetAdminStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, FileCheck, Ticket, Briefcase, LayoutGrid, ClipboardList,
  TrendingUp, CreditCard, Settings, UserCheck, DollarSign, ArrowUpRight,
  ArrowDownLeft, Shield, Activity, Wallet, BarChart3, Bell, Globe,
  AlertTriangle, CheckCircle2, Clock, Zap, PieChart, RefreshCw, Mail,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart as RPieChart, Pie, Cell,
} from "recharts";
import { motion } from "framer-motion";
import { useAdminAnalytics } from "@/lib/staff-api";
import { formatActivityTime } from "@/lib/format-activity-time";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { SafeBoundary } from "@/components/SafeBoundary";
import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";

const FALLBACK_CASH_FLOW = [
  { month: "Jan", revenue: 0, deposits: 0, withdrawals: 0 },
  { month: "Feb", revenue: 0, deposits: 0, withdrawals: 0 },
  { month: "Mar", revenue: 0, deposits: 0, withdrawals: 0 },
  { month: "Apr", revenue: 0, deposits: 0, withdrawals: 0 },
  { month: "May", revenue: 0, deposits: 0, withdrawals: 0 },
  { month: "Jun", revenue: 0, deposits: 0, withdrawals: 0 },
];

const FALLBACK_USER_GROWTH = [
  { month: "Jan", users: 0 },
  { month: "Feb", users: 0 },
  { month: "Mar", users: 0 },
  { month: "Apr", users: 0 },
  { month: "May", users: 0 },
  { month: "Jun", users: 0 },
];

const FEED_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  deposit:    { icon: ArrowUpRight,  color: "text-green-400",  bg: "bg-green-500/10",  label: "Deposit" },
  withdrawal: { icon: ArrowDownLeft, color: "text-red-400",    bg: "bg-red-500/10",    label: "Withdrawal" },
  kyc:        { icon: Shield,        color: "text-amber-400",  bg: "bg-amber-500/10",  label: "KYC" },
  register:   { icon: Users,         color: "text-blue-400",   bg: "bg-blue-500/10",   label: "New User" },
  investment: { icon: TrendingUp,    color: "text-purple-400", bg: "bg-purple-500/10", label: "Investment" },
};

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  review:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  active:   "bg-purple-500/20 text-purple-400 border-purple-500/30",
  new:      "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#050A14] border border-white/10 rounded-lg px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-2 font-medium">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: {typeof p.value === "number" ? `$${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

function MetricCard({
  title, value, icon, prefix = "", suffix = "", color = "text-white",
  trend, trendVal, isLoading, href, highlight = false
}: any) {
  const display = value !== undefined && value !== null
    ? `${prefix}${typeof value === "number" ? value.toLocaleString() : value}${suffix}`
    : "—";

  const card = (
    <Card className={`${highlight ? "bg-gradient-to-br from-amber-500/20 to-yellow-600/10 border-amber-500/30" : "bg-white/5 border-white/10"} backdrop-blur-sm hover:border-white/20 transition-all group`}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider leading-tight">{title}</p>
          <div className={`p-1.5 rounded-lg ${highlight ? "bg-amber-500/20" : "bg-white/5"} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className={`text-2xl font-black ${color}`}>{display}</p>
        )}
        {trend && trendVal && (
          <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold ${trend === "up" ? "text-green-400" : "text-red-400"}`}>
            {trend === "up" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
            {trendVal} vs last month
          </div>
        )}
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useGetAdminStats();
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch: refetchAnalytics } = useAdminAnalytics();

  const cashFlow = analytics?.cashFlow?.length ? analytics.cashFlow : FALLBACK_CASH_FLOW;
  const userGrowth = analytics?.userGrowth?.length ? analytics.userGrowth : FALLBACK_USER_GROWTH;
  const subscriptionPie = analytics?.subscriptionMix?.length ? analytics.subscriptionMix : [{ name: "Investment Plans", value: 1, color: "#F59E0B" }];
  const pieTotal = subscriptionPie.reduce((s: number, d: any) => s + d.value, 0) || 1;
  const liveFeed = (analytics?.recentActivity || []).map((item: any) => ({
    id: item.id,
    type: item.type,
    user: item.userName || "User",
    amount: item.type === "deposit" || item.type === "withdrawal"
      ? `$${Number(item.amount).toLocaleString()}`
      : null,
    time: formatActivityTime(item.createdAt),
    status: item.status,
  }));

  const topMetrics = [
    { title: "Total Users", value: stats?.totalUsers, icon: <Users className="h-4 w-4 text-blue-400" />, href: "/admin/users", trend: "up", trendVal: "+248" },
    { title: "Active Investors", value: stats?.activeUsers, icon: <Activity className="h-4 w-4 text-green-400" />, trend: "up", trendVal: "+18.2%" },
    { title: "Total Managers", value: stats?.totalManagers, icon: <Briefcase className="h-4 w-4 text-purple-400" />, href: "/admin/managers" },
    { title: "Platform Revenue", value: stats?.totalProfit, icon: <DollarSign className="h-4 w-4 text-amber-400" />, prefix: "$", highlight: true, trend: "up", trendVal: "+24.6%" },
    { title: "Total Deposits", value: stats?.totalDeposits, icon: <ArrowUpRight className="h-4 w-4 text-green-400" />, prefix: "$", href: "/admin/transactions" },
    { title: "Total Withdrawals", value: stats?.totalWithdrawals, icon: <ArrowDownLeft className="h-4 w-4 text-red-400" />, prefix: "$" },
    { title: "Total Investments", value: stats?.totalInvestments, icon: <TrendingUp className="h-4 w-4 text-amber-400" />, prefix: "$", href: "/admin/plans" },
    { title: "New Users (Month)", value: stats?.newUsersThisMonth, icon: <Users className="h-4 w-4 text-cyan-400" />, trend: "up", trendVal: "+12%" },
  ];

  const pendingMetrics = [
    { title: "Pending KYC", value: stats?.pendingKyc, icon: <Shield className="h-4 w-4 text-amber-400" />, href: "/admin/kyc", color: "text-amber-400" },
    { title: "Pending Transactions", value: stats?.pendingTransactions, icon: <Clock className="h-4 w-4 text-orange-400" />, href: "/admin/transactions", color: "text-orange-400" },
    { title: "Open Tickets", value: stats?.openTickets, icon: <Ticket className="h-4 w-4 text-red-400" />, href: "/admin/tickets", color: "text-red-400" },
    { title: "Referral Commissions", value: undefined, icon: <Zap className="h-4 w-4 text-purple-400" />, prefix: "$", color: "text-purple-400" },
  ];

  const quickActions = [
    { label: "Users", href: "/admin/users", icon: Users, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    { label: "KYC Queue", href: "/admin/kyc", icon: FileCheck, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    { label: "Tickets", href: "/admin/tickets", icon: Ticket, color: "bg-red-500/10 text-red-400 border-red-500/20" },
    { label: "Support Mail Desk", href: "/admin/mail", icon: Mail, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    { label: "Transactions", href: "/admin/transactions", icon: ClipboardList, color: "bg-green-500/10 text-green-400 border-green-500/20" },
    { label: "Plans", href: "/admin/plans", icon: LayoutGrid, color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    { label: "Referrals", href: "/admin/referrals", icon: TrendingUp, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { label: "Managers", href: "/admin/managers", icon: UserCheck, color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
    { label: "Gateways", href: "/admin/payment-gateways", icon: CreditCard, color: "bg-pink-500/10 text-pink-400 border-pink-500/20" },
    { label: "Copy Trading", href: "/copy-trading", icon: Users, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
    { label: "User MT Accounts", href: "/admin/mt5-accounts", icon: BarChart3, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
    { label: "Settings", href: "/admin/settings", icon: Settings, color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
  ];

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Admin Control Centre
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })} • Platform Overview
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-3 py-1.5">
              <CheckCircle2 className="h-3 w-3 mr-1.5" /> All Systems Operational
            </Badge>
            <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 text-xs gap-1.5" onClick={() => refetchAnalytics()}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>

        {analyticsError && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Platform analytics failed to load. Metrics may be incomplete.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetchAnalytics()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Top Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {topMetrics.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
              <MetricCard {...m} isLoading={isLoading} />
            </motion.div>
          ))}
        </div>

        {/* Pending / Alert Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {pendingMetrics.map((m, i) => (
            <motion.div key={m.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 + i * 0.04 }}>
              <MetricCard {...m} isLoading={isLoading} />
            </motion.div>
          ))}
        </div>

        {/* Revenue + User Growth Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-amber-400" /> Revenue & Cash Flow
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">Deposits vs Withdrawals (monthly)</p>
                </div>
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">6M</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="deposits" name="Deposits" fill="#22c55e" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#f43f5e" fillOpacity={0.8} radius={[3, 3, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="revenue" name="Net Revenue" fill="#F59E0B" fillOpacity={0.9} radius={[3, 3, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-400" /> User Growth
                  </CardTitle>
                  <p className="text-xs text-zinc-500 mt-0.5">Total vs Active users</p>
                </div>
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">6M</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={userGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Area type="monotone" dataKey="users" name="New Users" stroke="#6366f1" strokeWidth={2} fill="url(#totalGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Pie + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Subscription Breakdown */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <PieChart className="h-4 w-4 text-amber-400" /> Subscription Mix
              </CardTitle>
              <p className="text-xs text-zinc-500">Active subscription types</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <RPieChart>
                  <Pie data={subscriptionPie} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                    dataKey="value" stroke="none" paddingAngle={3}>
                    {subscriptionPie.map((d: any, i: number) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => `${Math.round((v / pieTotal) * 100)}%`} contentStyle={{ backgroundColor: '#050A14', borderColor: 'rgba(255,255,255,0.1)', fontSize: 12 }} />
                </RPieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {subscriptionPie.map((d: any) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-zinc-400">{d.name}</span>
                    </div>
                    <span className="font-bold">{Math.round((d.value / pieTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Live Activity Feed */}
          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" />
                  Live Activity Feed
                  <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                </CardTitle>
                <Link href="/admin/transactions">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">View All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : liveFeed.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No recent activity yet.</p>
              ) : liveFeed.map((item: any, i: number) => {
                const cfg = FEED_CONFIG[item.type] || FEED_CONFIG.register;
                const Icon = cfg.icon;
                return (
                  <motion.div key={item.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{cfg.label} — {item.user}</p>
                        {item.amount && <p className="text-[11px] text-zinc-500">{item.amount}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-[10px] border ${STATUS_BADGE[item.status]}`}>{item.status}</Badge>
                      <span className="text-[10px] text-zinc-600">{item.time}</span>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* My Wallet */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">My Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <SafeBoundary label="Wallet actions unavailable">
              <WalletQuickActions layout="row" />
            </SafeBoundary>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
              {quickActions.map(({ label, href, icon: Icon, color }) => (
                <Link key={href} href={href}>
                  <div className={`flex flex-col items-center gap-2 p-3 rounded-xl border cursor-pointer hover:scale-105 transition-all ${color}`}>
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-400" />
              Support Mail — support@kuberquant.com
            </CardTitle>
            <Link href="/admin/mail">
              <Button variant="ghost" size="sm" className="text-amber-400 text-xs">Open full inbox</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-3">
              Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com directly from the admin dashboard.
            </p>
            <SupportMailInboxPanel compact apiBase="/admin/mail" title="" description="" />
          </CardContent>
        </Card>
      </div>
);
}
