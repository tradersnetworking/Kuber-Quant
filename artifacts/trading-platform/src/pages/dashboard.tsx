import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Users, 
  Bell, 
  Wallet, 
  TrendingUp, 
  ShieldAlert,
  Plus,
  ArrowRightLeft,
  Copy
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: summary, isLoading: isLoadingSummary } = ApiHooks.useGetDashboardSummary();
  const { data: chartData, isLoading: isLoadingChart } = ApiHooks.useGetPortfolioChart();
  const { data: activity, isLoading: isLoadingActivity } = ApiHooks.useGetRecentActivity();
  
  const useGetWallet = (ApiHooks as any).useGetWallet;
  const { data: wallet, isLoading: isLoadingWallet } = useGetWallet ? useGetWallet() : { data: null, isLoading: false };
  
  const useGetReferralStats = (ApiHooks as any).useGetReferralStats;
  const { data: referralStats, isLoading: isLoadingReferral } = useGetReferralStats ? useGetReferralStats() : { data: null, isLoading: false };
  
  const useListNotifications = (ApiHooks as any).useListNotifications;
  const { data: notifications } = useListNotifications ? useListNotifications() : { data: null };

  const unreadCount = (notifications as any[])?.filter(n => !n.isRead).length || 0;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Welcome back, {user?.fullName}
            </h1>
            <p className="text-muted-foreground">Here's what's happening with your portfolio today.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/wallet">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Plus className="mr-2 h-4 w-4" /> Deposit
              </Button>
            </Link>
            <Link href="/wallet">
              <Button variant="outline" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10">
                <ArrowDownLeft className="mr-2 h-4 w-4" /> Withdraw
              </Button>
            </Link>
            <Link href="/referral">
              <Button variant="ghost" className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10">
                <Users className="mr-2 h-4 w-4" /> Refer Friend
              </Button>
            </Link>
          </div>
        </div>

        {user?.kycStatus !== "verified" && (
          <Card className="border-amber-500/50 bg-amber-500/5 backdrop-blur-sm">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-full">
                    <ShieldAlert className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-amber-500">KYC Verification Required</h3>
                    <p className="text-sm text-muted-foreground">Complete your identity verification to unlock full platform features and higher limits.</p>
                  </div>
                </div>
                <Link href="/kyc">
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">Verify Now</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard 
            title="Total Balance" 
            value={summary?.totalBalance} 
            isLoading={isLoadingSummary} 
            prefix="$" 
            icon={<Wallet className="h-4 w-4 text-amber-500" />}
          />
          <StatCard 
            title="Fiat Balance" 
            value={wallet?.fiatBalance} 
            isLoading={isLoadingWallet} 
            prefix="$" 
            icon={<TrendingUp className="h-4 w-4 text-amber-500" />}
          />
          <StatCard 
            title="Crypto Balance (USD)" 
            value={wallet?.cryptoBalance} 
            isLoading={isLoadingWallet} 
            prefix="$" 
            icon={<ArrowRightLeft className="h-4 w-4 text-amber-500" />}
          />
          <StatCard 
            title="Referral Earnings" 
            value={referralStats?.totalEarnings} 
            isLoading={isLoadingReferral} 
            prefix="$" 
            icon={<Users className="h-4 w-4 text-amber-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold">Portfolio Performance</CardTitle>
                <p className="text-sm text-muted-foreground">Value over time</p>
              </div>
              {unreadCount > 0 && (
                <Link href="/notifications">
                  <Badge className="bg-amber-500 text-black hover:bg-amber-600 cursor-pointer">
                    <Bell className="h-3 w-3 mr-1" /> {unreadCount} New
                  </Badge>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {isLoadingChart ? (
                <Skeleton className="h-[300px] w-full" />
              ) : chartData ? (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: '#050A14', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ color: '#F59E0B' }}
                      />
                      <Area type="monotone" dataKey="value" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorValue)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Wallet Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                      $
                    </div>
                    <div>
                      <p className="text-sm font-medium">Fiat Wallet</p>
                      <p className="text-xs text-muted-foreground">Primary Currency</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${wallet?.fiatBalance?.toLocaleString() || '0.00'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">USD</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 font-bold">
                      ₿
                    </div>
                    <div>
                      <p className="text-sm font-medium">Bitcoin</p>
                      <p className="text-xs text-muted-foreground">Digital Gold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{wallet?.btcBalance?.toFixed(8) || '0.00000000'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">BTC</p>
                  </div>
                </div>

                <div className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-500 font-bold">
                      ₮
                    </div>
                    <div>
                      <p className="text-sm font-medium">Tether</p>
                      <p className="text-xs text-muted-foreground">Stablecoin</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">${wallet?.usdtBalance?.toLocaleString() || '0.00'}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">USDT</p>
                  </div>
                </div>
              </div>

              <Link href="/wallet">
                <Button variant="outline" className="w-full border-white/10 hover:bg-white/5">View All Wallets</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingActivity ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-3 w-[100px]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-4">
                  {activity.map((item) => (
                    <div key={item.id} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          item.type === 'deposit' ? 'bg-green-500/10 text-green-500' :
                          item.type === 'withdrawal' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {item.type === 'deposit' ? <ArrowUpRight className="h-4 w-4" /> : 
                           item.type === 'withdrawal' ? <ArrowDownLeft className="h-4 w-4" /> : 
                           <TrendingUp className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-bold ${
                        item.type === 'withdrawal' ? 'text-red-500' : 
                        item.amount > 0 ? 'text-green-500' : ''
                      }`}>
                        {item.type === 'withdrawal' ? '-' : item.amount > 0 ? '+' : ''}{item.amount} {item.currency}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">No recent activity</div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 backdrop-blur-sm border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-xl font-bold">Investment Status</CardTitle>
              <Link href="/investments">
                <Button variant="link" className="text-amber-500 p-0 h-auto">View All</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Active Investments</p>
                    <p className="text-2xl font-bold">{summary?.activeInvestments || 0}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Total Invested</p>
                    <p className="text-lg font-bold">${summary?.totalInvested?.toLocaleString() || '0.00'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Portfolio Growth</span>
                    <span className="text-green-500">+12.5%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-[65%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Total Profit</p>
                    <p className="text-lg font-bold text-green-500">${summary?.totalProfit?.toLocaleString() || '0.00'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                    <p className="text-xs text-muted-foreground mb-1">Avg. Monthly ROI</p>
                    <p className="text-lg font-bold">4.2%</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatCard({ 
  title, 
  value, 
  isLoading, 
  prefix = "", 
  isProfit = false,
  icon
}: { 
  title: string, 
  value?: number, 
  isLoading: boolean, 
  prefix?: string, 
  isProfit?: boolean,
  icon?: React.ReactNode
}) {
  const formattedValue = value !== undefined 
    ? `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
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
          <div className={`text-2xl font-bold ${isProfit && value && value > 0 ? "text-green-500" : isProfit && value && value < 0 ? "text-red-500" : ""}`}>
            {formattedValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

