import { useGetAdminStats } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Users, FileCheck, Ticket, Briefcase, LayoutGrid, ClipboardList, TrendingUp, CreditCard, Settings, UserCheck } from "lucide-react";

export default function AdminDashboardPage() {
  const { data: stats, isLoading } = useGetAdminStats();

  const quickActions = [
    { label: "Manage Users", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
    { label: "KYC Queue", href: "/admin/kyc", icon: <FileCheck className="w-4 h-4" /> },
    { label: "Support Tickets", href: "/admin/tickets", icon: <Ticket className="w-4 h-4" /> },
    { label: "Transactions", href: "/admin/transactions", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "Investment Plans", href: "/admin/plans", icon: <LayoutGrid className="w-4 h-4" /> },
    { label: "Referral Stats", href: "/admin/referrals", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "Managers", href: "/admin/managers", icon: <UserCheck className="w-4 h-4" /> },
    { label: "Payment Gateways", href: "/admin/payment-gateways", icon: <CreditCard className="w-4 h-4" /> },
    { label: "Site Settings", href: "/admin/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Overview</h1>
            <p className="text-muted-foreground">Platform-wide statistics and management.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Users" value={stats?.totalUsers} isLoading={isLoading} icon={<Users className="w-4 h-4 text-amber-500" />} />
          <StatCard title="Pending KYC" value={stats?.pendingKyc} isLoading={isLoading} icon={<FileCheck className="w-4 h-4 text-amber-500" />} />
          <StatCard title="Open Tickets" value={stats?.openTickets} isLoading={isLoading} icon={<Ticket className="w-4 h-4 text-amber-500" />} />
          <StatCard title="Total Managers" value={stats?.totalManagers} isLoading={isLoading} icon={<Briefcase className="w-4 h-4 text-amber-500" />} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard title="Total Deposits" value={stats?.totalDeposits} isLoading={isLoading} prefix="$" />
          <StatCard title="Total Withdrawals" value={stats?.totalWithdrawals} isLoading={isLoading} prefix="$" />
          <StatCard title="Total Investments" value={stats?.totalInvestments} isLoading={isLoading} prefix="$" />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4 text-white">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-9 gap-4">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href}>
                <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground group-hover:text-white">{action.label}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ title, value, isLoading, prefix = "", icon }: any) {
  const formattedValue = value !== undefined 
    ? `${prefix}${value.toLocaleString()}` 
    : "—";
    
  return (
    <Card className="bg-white/5 backdrop-blur-sm border-white/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-3xl font-bold text-white">
            {formattedValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
