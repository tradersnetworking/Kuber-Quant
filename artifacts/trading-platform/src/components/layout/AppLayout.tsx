import { Link, useLocation } from "wouter";
import logo from "@/assets/logo.png";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  LineChart, 
  Briefcase, 
  Users, 
  Cpu, 
  ArrowRightLeft, 
  Settings, 
  ShieldAlert, 
  LogOut, 
  Menu,
  Wallet,
  TrendingUp,
  History,
  Headset,
  ShieldCheck,
  Bell,
  Users2,
  FileCheck,
  ClipboardList,
  ArrowLeftRight,
  Crown,
  Activity,
  FileText
} from "lucide-react";
import { SupportWidget } from "@/components/SupportWidget";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  useListNotifications, 
  useGetWallet 
} from "@workspace/api-client-react";
import type { Notification } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  name: string;
  href: string;
  icon: any;
  section?: string;
  onClick?: () => void;
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: notifications } = useListNotifications({
    query: { enabled: !!user, refetchInterval: 30000 } as any,
  });

  const { data: wallet } = useGetWallet({
    query: { enabled: !!user } as any,
  });

  if (!user) {
    return <div className="min-h-screen bg-background text-foreground flex items-center justify-center">Redirecting...</div>;
  }

  const unreadCount = notifications?.filter((n: Notification) => !n.isRead).length || 0;

  const navItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallet", href: "/wallet", icon: Wallet },
    { name: "Investments", href: "/investments", icon: Briefcase },
    { name: "Investment Plans", href: "/plans", icon: TrendingUp },
    { name: "Copy Trading", href: "/copy-trading", icon: Users },
    { name: "Algo Trading", href: "/algo-trading", icon: Cpu },
    { name: "EA Strategies", href: "/ea-strategies", icon: Cpu },
    { name: "MT5 Accounts", href: "/mt5-accounts", icon: History },
    { name: "Transactions", href: "/transactions", icon: ArrowRightLeft },
    { name: "Referral Program", href: "/referral", icon: Users2 },
    { name: "Support", href: "/support", icon: Headset },
    { name: "KYC Verification", href: "/kyc", icon: ShieldCheck },
    { name: "MT5 Services", href: "/mt5-relay", icon: Activity },
    { name: "Legal Agreements", href: "/agreements", icon: FileText },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  if ((user.role as string) === "manager" || user.role === "admin" || (user.role as string) === "superadmin") {
    navItems.push(
      { name: "My Clients", href: "/manager/clients", icon: Users2, section: "Manager" },
      { name: "KYC Queue", href: "/manager/kyc", icon: FileCheck, section: "Manager" },
      { name: "Tickets", href: "/manager/tickets", icon: ClipboardList, section: "Manager" },
      { name: "Manager Trans.", href: "/manager/transactions", icon: ArrowLeftRight, section: "Manager" }
    );
  }

  if (user.role === "admin" || (user.role as string) === "superadmin") {
    navItems.push(
      { name: "Admin Overview", href: "/admin", icon: ShieldAlert, section: "Admin" },
      { name: "Users", href: "/admin/users", icon: Users, section: "Admin" },
      { name: "KYC Review", href: "/admin/kyc", icon: FileCheck, section: "Admin" },
      { name: "Transactions", href: "/admin/transactions", icon: ClipboardList, section: "Admin" },
      { name: "Investment Plans", href: "/admin/plans", icon: TrendingUp, section: "Admin" },
      { name: "Managers", href: "/admin/managers", icon: Users2, section: "Admin" },
      { name: "Payment Gateways", href: "/admin/payment-gateways", icon: LineChart, section: "Admin" },
      { name: "Support Tickets", href: "/admin/tickets", icon: Headset, section: "Admin" },
      { name: "Referrals", href: "/admin/referrals", icon: ArrowLeftRight, section: "Admin" },
      { name: "Site Settings", href: "/admin/settings", icon: Settings, section: "Admin" },
    );
  }

  if ((user.role as string) === "superadmin") {
    navItems.push(
      { name: "Super Admin", href: "/super-admin", icon: Crown, section: "Super Admin" },
    );
  }

  const mobileNavItems: NavItem[] = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallet", href: "/wallet", icon: Wallet },
    { name: "Investments", href: "/investments", icon: Briefcase },
    { name: "Copy Trading", href: "/copy-trading", icon: Users },
    { name: "More", href: "#", icon: Menu, onClick: () => setMobileMenuOpen(true) },
  ];

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Kuber Quant" className="h-9 w-9 object-contain" />
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Kuber Quant
            </h1>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-none">
          <ul className="space-y-1 px-3">
            {navItems.map((item, index) => {
              const isActive = location === item.href || (item.href !== "#" && location.startsWith(`${item.href}/`));
              const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);
              
              return (
                <li key={item.name}>
                  {showSection && (
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                      {item.section}
                    </div>
                  )}
                  <Link href={item.href} className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md transition-all relative group",
                    isActive ? "text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNav"
                        className="absolute inset-0 bg-primary/10 border-l-2 border-primary rounded-r-md"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn("h-5 w-5 relative z-10", isActive ? "text-primary" : "group-hover:text-primary transition-colors")} />
                    <span className="relative z-10">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-border bg-white/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-amber-400/20 to-yellow-600/20 border border-amber-500/30 flex items-center justify-center text-primary font-bold">
              {user.fullName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="flex items-center justify-between p-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold hidden md:block">
              {navItems.find(i => i.href === location)?.name || "Dashboard"}
            </h2>
            <div className="md:hidden flex items-center gap-2">
              <img src={logo} alt="Kuber Quant" className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
              <span className="text-base font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent tracking-tight">
                Kuber Quant
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground border-2 border-background">
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </Link>
            <div className="h-8 w-[1px] bg-border mx-2 hidden sm:block" />
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs text-muted-foreground">Balance</span>
              <span className="text-sm font-bold text-primary">
                ${wallet?.fiatBalance?.toFixed(2) || "0.00"}
              </span>
            </div>
          </div>
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden absolute inset-0 z-50 bg-background/98 backdrop-blur-md pt-4 px-4 pb-24 overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="Kuber Quant" className="h-10 w-10 object-contain" />
                </div>
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <LogOut className="h-6 w-6 rotate-180" />
                </Button>
              </div>

              <nav>
                <ul className="space-y-2">
                  {navItems.map((item, index) => {
                    const isActive = location === item.href || (item.href !== "#" && location.startsWith(`${item.href}/`));
                    const showSection = item.section && (index === 0 || navItems[index - 1].section !== item.section);

                    return (
                      <li key={item.name}>
                        {showSection && (
                          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                            {item.section}
                          </div>
                        )}
                        <Link href={item.href} onClick={() => setMobileMenuOpen(false)} className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-lg text-lg transition-colors",
                          isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground active:bg-white/5"
                        )}>
                          <item.icon className={cn("h-6 w-6", isActive ? "text-primary" : "text-muted-foreground")} />
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                  <li className="pt-4 mt-4 border-t border-border">
                    <button onClick={logout} className="flex items-center gap-3 px-4 py-3 rounded-lg text-lg text-destructive w-full">
                      <LogOut className="h-6 w-6" />
                      Logout
                    </button>
                  </li>
                </ul>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 pb-24 md:pb-8 md:p-8 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
          <AnimatePresence mode="wait">
            <motion.div
              key={location}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        <SupportWidget />

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden flex items-center justify-around p-2 border-t border-border bg-card/80 backdrop-blur-lg fixed bottom-0 left-0 right-0 z-40">
          {mobileNavItems.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.name}
                onClick={item.onClick ? item.onClick : () => (window.location.href = item.href)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px]",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveNav"
                    className="w-1 h-1 rounded-full bg-primary"
                  />
                )}
              </button>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
