import { useGetManagerStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Users, ShieldCheck, Ticket, ArrowRightLeft, TrendingUp,
  ArrowUpRight, ArrowDownLeft, Activity, Clock, CheckCircle2,
  DollarSign, BarChart3, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { motion } from "framer-motion";

const DEPOSIT_TREND = [
  { day: "Mon", deposits: 12000, withdrawals: 4000 },
  { day: "Tue", deposits: 18000, withdrawals: 7000 },
  { day: "Wed", deposits: 14000, withdrawals: 5000 },
  { day: "Thu", deposits: 22000, withdrawals: 8000 },
  { day: "Fri", deposits: 28000, withdrawals: 12000 },
  { day: "Sat", deposits: 16000, withdrawals: 6000 },
  { day: "Sun", deposits: 10000, withdrawals: 3000 },
];

const INVESTOR_GROWTH = [
  { week: "Wk1", investors: 24 },
  { week: "Wk2", investors: 31 },
  { week: "Wk3", investors: 28 },
  { week: "Wk4", investors: 38 },
];

const RECENT_ACTIVITY = [
  { type: "deposit",    user: "Rahul V.",  amount: "$3,500", time: "5m ago",  status: "pending" },
  { type: "kyc",       user: "Deepa N.",  amount: null,     time: "12m ago", status: "review" },
  { type: "withdrawal",user: "Arun T.",   amount: "$8,000", time: "18m ago", status: "pending" },
  { type: "support",   user: "Meena K.", amount: null,     time: "25m ago", status: "open" },
  { type: "deposit",   user: "Suresh B.", amount: "$10,000",time: "34m ago", status: "approved" },
];

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  deposit:    { icon: ArrowUpRight,  color: "text-green-400",  bg: "bg-green-500/10",  label: "Deposit" },
  withdrawal: { icon: ArrowDownLeft, color: "text-red-400",    bg: "bg-red-500/10",    label: "Withdrawal" },
  kyc:        { icon: ShieldCheck,   color: "text-amber-400",  bg: "bg-amber-500/10",  label: "KYC" },
  support:    { icon: Ticket,        color: "text-blue-400",   bg: "bg-blue-500/10",   label: "Support" },
};

const STATUS_BADGE: Record<string, string> = {
  pending:  "bg-amber-500/20 text-amber-400 border-amber-500/30",
  review:   "bg-blue-500/20 text-blue-400 border-blue-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  open:     "bg-red-500/20 text-red-400 border-red-500/30",
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#050A14] border border-white/10 rounded-lg px-4 py-3 shadow-xl text-xs">
      <p className="text-zinc-400 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-bold">
          {p.name}: ${p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
};

function StatCard({ title, value, icon, href, color = "text-white", isLoading, sub }: any) {
  const inner = (
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all group cursor-pointer h-full">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{title}</p>
          <div className="p-1.5 rounded-lg bg-white/5 group-hover:scale-110 transition-transform">{icon}</div>
        </div>
        {isLoading ? <Skeleton className="h-8 w-20" /> : (
          <p className={`text-3xl font-black ${color}`}>{value ?? "—"}</p>
        )}
        {sub && <p className="text-[11px] text-zinc-600 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function ManagerDashboard() {
  const { data: stats, isLoading } = useGetManagerStats();

  const cards = [
    { title: "Assigned Clients", value: stats?.totalClients, icon: <Users className="h-4 w-4 text-blue-400" />, href: "/manager/clients", color: "text-white", sub: "Total investors assigned" },
    { title: "Pending KYC", value: stats?.pendingKyc, icon: <ShieldCheck className="h-4 w-4 text-amber-400" />, href: "/manager/kyc", color: "text-amber-400", sub: "Awaiting review" },
    { title: "Open Tickets", value: stats?.pendingTickets, icon: <Ticket className="h-4 w-4 text-red-400" />, href: "/manager/tickets", color: "text-red-400", sub: "Active support requests" },
    { title: "Pending Transactions", value: stats?.pendingTransactions, icon: <ArrowRightLeft className="h-4 w-4 text-green-400" />, href: "/manager/transactions", color: "text-green-400", sub: "Awaiting approval" },
  ];

  const quickLinks = [
    { href: "/manager/clients",     label: "Manage Clients",    icon: Users,         color: "bg-blue-500/10   text-blue-400   border-blue-500/20" },
    { href: "/manager/kyc",         label: "KYC Review",        icon: ShieldCheck,   color: "bg-amber-500/10 text-amber-400  border-amber-500/20" },
    { href: "/manager/transactions",label: "Transactions",      icon: ArrowRightLeft,color: "bg-green-500/10  text-green-400  border-green-500/20" },
    { href: "/manager/tickets",     label: "Support Tickets",   icon: Ticket,        color: "bg-red-500/10    text-red-400    border-red-500/20" },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Manager Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs px-3 py-1.5">
              <CheckCircle2 className="h-3 w-3 mr-1.5" /> Active
            </Badge>
            <Button size="sm" variant="outline" className="border-white/10 hover:bg-white/5 text-xs gap-1.5">
              <RefreshCw className="h-3 w-3" /> Refresh
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card, i) => (
            <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <StatCard {...card} isLoading={isLoading} />
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-400" /> Weekly Cash Flow
              </CardTitle>
              <p className="text-xs text-zinc-500">Your clients' deposits vs withdrawals</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={DEPOSIT_TREND} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="day" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                  <Bar dataKey="deposits" name="Deposits" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
                  <Bar dataKey="withdrawals" name="Withdrawals" fill="#f43f5e" fillOpacity={0.85} radius={[3, 3, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" /> Investor Growth
              </CardTitle>
              <p className="text-xs text-zinc-500">New investors added weekly</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={INVESTOR_GROWTH} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="week" stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#050A14', borderColor: 'rgba(255,255,255,0.1)', fontSize: 12 }} />
                  <Area type="monotone" dataKey="investors" name="Investors" stroke="#6366f1" strokeWidth={2} fill="url(#invGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Activity + Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-400" /> Recent Activity
                </CardTitle>
                <Link href="/manager/transactions">
                  <Button variant="link" className="text-amber-500 p-0 h-auto text-xs">View All →</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {RECENT_ACTIVITY.map((item, i) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.deposit;
                const Icon = cfg.icon;
                return (
                  <motion.div key={i}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
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
                      <Badge className={`text-[10px] border ${STATUS_BADGE[item.status] || ""}`}>{item.status}</Badge>
                      <span className="text-[10px] text-zinc-600">{item.time}</span>
                    </div>
                  </motion.div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickLinks.map(({ href, label, icon: Icon, color }) => (
                <Link key={href} href={href}>
                  <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${color} mb-2`}>
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="text-xs font-semibold">{label}</span>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
