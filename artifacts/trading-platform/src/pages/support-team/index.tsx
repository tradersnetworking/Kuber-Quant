import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Headset, CheckCircle, Clock, MessageSquare, AlertTriangle,
  AlertCircle, HelpCircle, Inbox, ArrowRight, Mail, Ticket, Search,
  ShieldCheck, TrendingUp, ArrowDownUp,
} from "lucide-react";
import { Link } from "wouter";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";
import { StaffEscalationsPanel } from "@/components/staff/StaffEscalationsPanel";
import { StaffDashboardStatCard } from "@/components/staff/StaffDashboardStatCard";
import { StaffQuickLinkTile } from "@/components/staff/StaffQuickLinkTile";
import { cn } from "@/lib/utils";
import { STAFF_PAGE_STACK, STAFF_STAT_GRID, STAFF_CARD, STAFF_DASHBOARD_SPLIT, STAFF_DASHBOARD_MAIN, STAFF_DASHBOARD_SIDE, STAFF_QUICK_ACTIONS_GRID, STAFF_LIST_ROW } from "@/lib/staff-dashboard-ui";
import { CalendarPeriodFilter } from "@/components/finance/CalendarPeriodFilter";
import { defaultStaffFinancePeriod, todayIso, type StatsPeriod } from "@/lib/finance-period";
import type { StaffStatTone } from "@/lib/staff-dashboard-ui";
import { AppPage } from "@/components/layout/AppPage";

interface SupportStats {
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  closedTickets: number;
  totalTickets: number;
  urgentTickets: number;
  complaintTickets: number;
  queryTickets: number;
  pendingToday: number;
}

interface SupportTicket {
  id: number;
  subject: string;
  userName: string | null;
  userEmail: string | null;
  status: string;
  priority: string;
  category: string | null;
  createdAt: string;
}

export default function SupportTeamDashboard() {
  const [period, setPeriod] = useState<StatsPeriod>(defaultStaffFinancePeriod());
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());

  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/support-team/stats"],
    queryFn: () => staffFetch<SupportStats>("/support-team/stats"),
  });

  const { data: recentTickets, isLoading: recentLoading } = useQuery({
    queryKey: ["/api/support-team/tickets", "recent"],
    queryFn: () => staffFetch<SupportTicket[]>("/support-team/tickets?status=open"),
  });

  const statCards: { label: string; value?: number; icon: typeof Inbox; tone: StaffStatTone; href: string }[] = [
    { label: "Open", value: stats?.openTickets, icon: Inbox, tone: "rose", href: "/support-team/tickets" },
    { label: "In Progress", value: stats?.inProgressTickets, icon: Clock, tone: "amber", href: "/support-team/tickets" },
    { label: "Urgent / High", value: stats?.urgentTickets, icon: AlertTriangle, tone: "orange", href: "/support-team/tickets" },
    { label: "Resolved", value: stats?.resolvedTickets, icon: CheckCircle, tone: "emerald", href: "/support-team/tickets" },
    { label: "Complaints", value: stats?.complaintTickets, icon: AlertCircle, tone: "orange", href: "/support-team/complaints" },
    { label: "Queries", value: stats?.queryTickets, icon: HelpCircle, tone: "blue", href: "/support-team/queries" },
  ];

  const quickLinks: { href: string; label: string; desc: string; icon: typeof Ticket; tone: StaffStatTone }[] = [
    { href: "/support-team/tickets", label: "All Tickets", desc: "Full ticket queue", icon: Ticket, tone: "rose" },
    { href: "/support-team/complaints", label: "Complaints", desc: "Customer complaints", icon: AlertCircle, tone: "orange" },
    { href: "/support-team/queries", label: "Queries", desc: "General inquiries", icon: HelpCircle, tone: "blue" },
    { href: "/support-team/mail", label: "Support Mail", desc: "support@kuberquant.com inbox", icon: Mail, tone: "cyan" },
    { href: "/support-team/users", label: "User Lookup", desc: "Read-only investor details", icon: Search, tone: "violet" },
    { href: "/support-team/kyc", label: "KYC Records", desc: "Verification status", icon: ShieldCheck, tone: "teal" },
    { href: "/support-team/plans", label: "Investment Plans", desc: "Platform catalog (read-only)", icon: TrendingUp, tone: "amber" },
    { href: "/support-team/exchange", label: "Exchange Orders", desc: "Crypto orders (read-only)", icon: ArrowDownUp, tone: "amber" },
  ];

  return (
    <AppPage
      stackClassName={STAFF_PAGE_STACK}
      title={
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 dark:from-rose-400 dark:to-amber-400 bg-clip-text text-transparent">
          Support Dashboard
        </h1>
      }
      subtitle="View investor details read-only, handle tickets, and report account issues to Super Admin."
    >

      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Could not load support stats.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <Card className={STAFF_CARD}>
        <CardContent className="py-3 px-4">
          <CalendarPeriodFilter
            period={period}
            customFrom={customFrom}
            customTo={customTo}
            onPeriodChange={setPeriod}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </CardContent>
      </Card>

      <div className={STAFF_STAT_GRID}>
        {statCards.map(c => (
          <StaffDashboardStatCard
            key={c.label}
            label={c.label}
            value={c.value ?? 0}
            icon={c.icon}
            href={c.href}
            tone={c.tone}
            loading={isLoading}
          />
        ))}
      </div>

      <div className={STAFF_DASHBOARD_SPLIT}>
        <Card className={cn(STAFF_CARD, STAFF_DASHBOARD_MAIN)}>
          <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Headset className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              Open Tickets — Needs Attention
            </CardTitle>
            <Link href="/support-team/tickets">
              <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400 w-full sm:w-auto">
                View all <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !recentTickets?.length ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No open tickets right now.</p>
            ) : (
              recentTickets.slice(0, 6).map(t => (
                <Link key={t.id} href="/support-team/tickets">
                  <div className={cn(STAFF_LIST_ROW, "hover:border-rose-500/30 cursor-pointer")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">#{t.id} — {t.subject}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.userName || t.userEmail} · {t.category || "General"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Badge variant="outline" className={
                        t.priority === "urgent" || t.priority === "high"
                          ? "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/25"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25"
                      }>{t.priority}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {format(new Date(t.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className={STAFF_DASHBOARD_SIDE}>
          <Card className={STAFF_CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className={STAFF_QUICK_ACTIONS_GRID}>
              {quickLinks.map(link => (
                <StaffQuickLinkTile
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  desc={link.desc}
                  icon={link.icon}
                  tone={link.tone}
                />
              ))}
            </CardContent>
          </Card>

          <Card className={STAFF_CARD}>
            <CardHeader className="pb-2"><CardTitle className="text-base">Today&apos;s Summary</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">New / pending today</span>
                <span className="font-semibold text-amber-700 dark:text-amber-400">{stats?.pendingToday ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Total tickets</span>
                <span className="font-semibold">{stats?.totalTickets ?? "—"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Closed</span>
                <span className="font-semibold text-muted-foreground">{stats?.closedTickets ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className={STAFF_CARD}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Guidelines
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Search a user in <strong className="text-foreground">User Lookup</strong> before viewing finance data</p>
              <p>• Individual deposits, investments & subscriptions — not platform-wide lists</p>
              <p>• Report payment, KYC, or wallet issues to Super Admin</p>
              <p>• Mark tickets resolved when the customer confirms fix</p>
            </CardContent>
          </Card>
          <StaffEscalationsPanel role="support" />
        </div>
      </div>

      <Card className={STAFF_CARD}>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            Support Mail — support@kuberquant.com
          </CardTitle>
          <Link href="/support-team/mail">
            <Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400 w-full sm:w-auto">
              Open full inbox <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com.
          </p>
          <SupportMailInboxPanel compact apiBase="/support-team/mail" title="" description="" />
        </CardContent>
      </Card>
    </AppPage>
  );
}
