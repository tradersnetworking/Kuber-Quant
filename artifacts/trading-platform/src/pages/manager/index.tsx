import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, ShieldCheck, Ticket, ArrowRightLeft, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Activity, Clock, CheckCircle2,
  DollarSign, BarChart3, RefreshCw, AlertCircle,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useManagerAnalytics, staffFetch } from "@/lib/staff-api";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { PeriodFinanceKpiGrid } from "@/components/finance/PeriodFinanceKpiGrid";
import { appendPeriodQuery, defaultStaffFinancePeriod, todayIso } from "@/lib/finance-period";
import { formatActivityTime } from "@/lib/format-activity-time";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { WalletQuickActions } from "@/components/wallet/WalletQuickActions";
import { SafeBoundary } from "@/components/SafeBoundary";
import { StaffEscalationsPanel } from "@/components/staff/StaffEscalationsPanel";
import { StaffDashboardStatCard } from "@/components/staff/StaffDashboardStatCard";
import { StaffQuickLinkTile } from "@/components/staff/StaffQuickLinkTile";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_STAT_GRID, STAFF_CHART_GRID, STAFF_DASHBOARD_SPLIT, STAFF_DASHBOARD_MAIN, STAFF_DASHBOARD_SIDE, STAFF_QUICK_ACTIONS_GRID, STAFF_LIST_ROW } from "@/lib/staff-dashboard-ui";
import type { StaffStatTone } from "@/lib/staff-dashboard-ui";
import { AppPage } from "@/components/layout/AppPage";

const FALLBACK_CASH_FLOW = [
  { day: "Mon", deposits: 0, withdrawals: 0 },
  { day: "Tue", deposits: 0, withdrawals: 0 },
  { day: "Wed", deposits: 0, withdrawals: 0 },
  { day: "Thu", deposits: 0, withdrawals: 0 },
  { day: "Fri", deposits: 0, withdrawals: 0 },
  { day: "Sat", deposits: 0, withdrawals: 0 },
  { day: "Sun", deposits: 0, withdrawals: 0 },
];

const FALLBACK_INVESTOR_GROWTH = [
  { week: "Wk1", investors: 0 },
  { week: "Wk2", investors: 0 },
  { week: "Wk3", investors: 0 },
  { week: "Wk4", investors: 0 },
];

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  deposit:    { icon: ArrowUpRight,  color: "text-green-700 dark:text-green-400",  bg: "bg-green-500/10",  label: "Deposit" },
  withdrawal: { icon: ArrowDownLeft, color: "text-red-400",    bg: "bg-red-500/10",    label: "Withdrawal" },
  kyc:        { icon: ShieldCheck,   color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-500/10",  label: "KYC" },
  support:    { icon: Ticket,        color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-500/10",   label: "Support" },
};

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  review:   "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  open:     "bg-red-500/20 text-red-400 border-red-500/30",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-4 py-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: ${p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

export default function ManagerDashboard() {
  const [period, setPeriod] = useState(defaultStaffFinancePeriod());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  const [appliedCustom, setAppliedCustom] = useState({ from: customFrom, to: customTo });

  const periodQuery = appendPeriodQuery(
    "",
    period,
    period === "custom" ? appliedCustom.from : undefined,
    period === "custom" ? appliedCustom.to : undefined,
  );

  const { data: stats, isLoading, refetch: refetchStats } = useQuery({
    queryKey: ["/api/manager/stats", period, appliedCustom],
    queryFn: () => staffFetch<any>(`/manager/stats${periodQuery}`),
    ...financeQueryOptions,
  });
  const { data: analytics, isLoading: analyticsLoading, isError: analyticsError, refetch: refetchAnalytics } = useManagerAnalytics();

  const cashFlow = analytics?.cashFlow?.length ? analytics.cashFlow : FALLBACK_CASH_FLOW;
  const investorGrowth = analytics?.investorGrowth?.length ? analytics.investorGrowth : FALLBACK_INVESTOR_GROWTH;
  const recentActivity = (analytics?.recentActivity || []).map((item: any) => ({
    ...item,
    time: formatActivityTime(item.time),
  }));

  const cards = [
    { title: "Assigned Clients", value: stats?.totalClients, icon: Users, href: "/manager/clients", tone: "blue" as const, sub: "Total investors assigned" },
    { title: "Pending KYC", value: stats?.pendingKyc, icon: ShieldCheck, href: "/manager/kyc", tone: "amber" as const, sub: "Awaiting review" },
    { title: "Open Tickets", value: stats?.pendingTickets, icon: Ticket, href: "/manager/tickets", tone: "rose" as const, sub: "Active support requests" },
    { title: "Pending Transactions", value: stats?.pendingTransactions, icon: ArrowRightLeft, href: "/manager/upcoming-transactions", tone: "emerald" as const, sub: "Awaiting approval" },
  ];

  const quickLinks: { href: string; label: string; icon: typeof Users; tone: StaffStatTone }[] = [
    { href: "/manager/clients", label: "Manage Clients", icon: Users, tone: "blue" },
    { href: "/manager/kyc", label: "KYC Review", icon: ShieldCheck, tone: "amber" },
    { href: "/manager/upcoming-transactions", label: "Upcoming Txns", icon: Clock, tone: "amber" },
    { href: "/manager/transactions", label: "All Transactions", icon: ArrowRightLeft, tone: "emerald" },
    { href: "/manager/tickets", label: "Support Tickets", icon: Ticket, tone: "rose" },
    { href: "/copy-trading", label: "Copy Trading", icon: Users, tone: "cyan" },
    { href: "/mt5-relay", label: "MT4/MT5 Handling", icon: BarChart3, tone: "violet" },
  ];

  return (
    <AppPage
      stackClassName={STAFF_PAGE_STACK}
      title={
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 dark:from-amber-400 dark:to-yellow-600 bg-clip-text text-transparent">
          Manager Dashboard
        </h1>
      }
      subtitle="View assigned client KYC, transactions & investments (read-only). Report issues to Super Admin."
      actions={
        <>
          <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30 text-xs px-3 py-1.5 w-full xs:w-auto justify-center">
            <CheckCircle2 className="h-3 w-3 mr-1.5" /> Active
          </Badge>
          <Button size="sm" variant="outline" className="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 text-xs gap-1.5 w-full xs:w-auto" onClick={() => { refetchStats(); refetchAnalytics(); }}>
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </>
      }
    >

        {analyticsError && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <p className="text-sm text-red-400 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Analytics failed to load. Stats may be incomplete.
              </p>
              <Button size="sm" variant="outline" onClick={() => refetchAnalytics()}>Retry</Button>
            </CardContent>
          </Card>
        )}

        <Card className={STAFF_CARD}>
          <CardContent className="py-3 px-4">
            <CalendarPeriodFilter
              period={period}
              customFrom={customFrom}
              customTo={customTo}
              periodLabel={stats?.periodLabel}
              onPeriodChange={setPeriod}
              onCustomFromChange={setCustomFrom}
              onCustomToChange={setCustomTo}
              onApplyCustom={() => setAppliedCustom({ from: customFrom, to: customTo })}
            />
          </CardContent>
        </Card>

        <PeriodFinanceKpiGrid
          loading={isLoading}
          variant="staff"
          data={{
            period,
            periodLabel: stats?.periodLabel,
            fiatBalance: stats?.fiatBalance,
            fiatBalanceInr: stats?.fiatBalanceInr,
            periodInvested: stats?.periodInvested,
            periodInvestedInr: stats?.periodInvestedInr,
            periodFiatDeposits: stats?.periodFiatDeposits,
            periodFiatWithdrawals: stats?.periodFiatWithdrawals,
            periodCryptoDeposits: stats?.periodCryptoDeposits,
            periodCryptoWithdrawals: stats?.periodCryptoWithdrawals,
            periodFiatDepositsInr: stats?.periodFiatDepositsInr,
            periodFiatWithdrawalsInr: stats?.periodFiatWithdrawalsInr,
            periodCryptoDepositsInr: stats?.periodCryptoDepositsInr,
            periodCryptoWithdrawalsInr: stats?.periodCryptoWithdrawalsInr,
          }}
        />

        {/* Stats Grid */}
        <div className={STAFF_STAT_GRID}>
          {cards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <StaffDashboardStatCard
                label={card.title}
                value={card.value}
                subValue={card.sub}
                icon={card.icon}
                href={card.href}
                tone={card.tone}
                loading={isLoading}
              />
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className={STAFF_CHART_GRID}>
          <Card className={STAFF_CARD}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-600 dark:text-amber-400" /> Weekly Cash Flow
              </CardTitle>
              <p className="text-xs text-muted-foreground">Your clients' deposits vs withdrawals</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cashFlow} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="day" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="deposits" name="Deposits" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#f43f5e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className={STAFF_CARD}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Investor Growth
              </CardTitle>
              <p className="text-xs text-muted-foreground">New investors added weekly</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={investorGrowth} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
                  <XAxis dataKey="week" className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis className="text-muted-foreground" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", fontSize: 12 }} />
                  <Area type="monotone" dataKey="investors" name="Investors" stroke="#6366f1" strokeWidth={2} fill="url(#invGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity + Quick Links */}
        <div className={STAFF_DASHBOARD_SPLIT}>
          <Card className={cn(STAFF_CARD, STAFF_DASHBOARD_MAIN)}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-700 dark:text-green-400" /> Recent Activity
                </CardTitle>
                <Link href="/manager/transactions">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">View All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {analyticsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : recentActivity.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">No recent client activity.</p>
              ) : recentActivity.map((item: any, i: number) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.deposit;
                const Icon = cfg.icon;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    className={cn(STAFF_LIST_ROW, "hover:border-primary/20 transition-colors")}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-lg ${cfg.bg} shrink-0`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{cfg.label} — {item.user}</p>
                        {item.amount && <p className="text-[11px] text-muted-foreground">{item.amount}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Badge className={`text-[10px] border ${STATUS_BADGE[item.status] || ""}`}>{item.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          <Card className={cn(STAFF_CARD, STAFF_DASHBOARD_SIDE)}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className={STAFF_QUICK_ACTIONS_GRID}>
              <SafeBoundary label="Wallet actions unavailable">
                <WalletQuickActions />
              </SafeBoundary>
              {quickLinks.map(link => (
                <StaffQuickLinkTile key={link.href} {...link} />
              ))}
              <StaffEscalationsPanel role="manager" />
            </CardContent>
          </Card>
        </div>
    </AppPage>
  );
}
