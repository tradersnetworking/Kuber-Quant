import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Headset, CheckCircle, Clock, MessageSquare, Users, AlertTriangle,
  AlertCircle, HelpCircle, Inbox, ArrowRight, Mail,
} from "lucide-react";
import { Link } from "wouter";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { SupportMailInboxPanel } from "@/components/support/SupportMailInboxPanel";

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
  const { data: stats, isLoading, isError, refetch } = useQuery({
    queryKey: ["/api/support-team/stats"],
    queryFn: () => staffFetch<SupportStats>("/support-team/stats"),
  });

  const { data: recentTickets, isLoading: recentLoading } = useQuery({
    queryKey: ["/api/support-team/tickets", "recent"],
    queryFn: () => staffFetch<SupportTicket[]>("/support-team/tickets?status=open"),
  });

  const statCards = [
    { label: "Open", value: stats?.openTickets, icon: Inbox, color: "text-rose-400", href: "/support-team/tickets" },
    { label: "In Progress", value: stats?.inProgressTickets, icon: Clock, color: "text-amber-400", href: "/support-team/tickets" },
    { label: "Urgent / High", value: stats?.urgentTickets, icon: AlertTriangle, color: "text-red-400", href: "/support-team/tickets" },
    { label: "Resolved", value: stats?.resolvedTickets, icon: CheckCircle, color: "text-green-400", href: "/support-team/tickets" },
    { label: "Complaints", value: stats?.complaintTickets, icon: AlertCircle, color: "text-orange-400", href: "/support-team/complaints" },
    { label: "Queries", value: stats?.queryTickets, icon: HelpCircle, color: "text-blue-400", href: "/support-team/queries" },
  ];

  const quickLinks = [
    { href: "/support-team/tickets", label: "All Tickets", desc: "Full ticket queue" },
    { href: "/support-team/complaints", label: "Complaints", desc: "Customer complaints" },
    { href: "/support-team/queries", label: "Queries", desc: "General inquiries" },
    { href: "/support-team/mail", label: "Support Mail", desc: "Queries, complaints, disputes → support@kuberquant.com" },
    { href: "/support-team/users", label: "User Lookup", desc: "Find account info" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Support Dashboard</h1>
        <p className="text-muted-foreground">Manage tickets, complaints, queries, user lookup, and mail to support@kuberquant.com.</p>
      </div>

      {isError && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="pt-4 flex items-center justify-between gap-4">
            <p className="text-sm text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Could not load support stats.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(c => (
          <Link key={c.label} href={c.href}>
            <Card className="border-white/10 bg-white/5 hover:border-primary/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                {isLoading ? <Skeleton className="h-8 w-16" /> : (
                  <p className={`text-2xl font-bold ${c.color}`}>{c.value ?? 0}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-white/10 bg-white/5 lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Headset className="h-4 w-4 text-rose-400" />
              Open Tickets — Needs Attention
            </CardTitle>
            <Link href="/support-team/tickets">
              <Button variant="ghost" size="sm" className="text-amber-400">View all <ArrowRight className="h-3 w-3 ml-1" /></Button>
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">#{t.id} — {t.subject}</p>
                      <p className="text-xs text-muted-foreground">{t.userName || t.userEmail} · {t.category || "General"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <Badge variant="outline" className={
                        t.priority === "urgent" || t.priority === "high"
                          ? "bg-red-500/20 text-red-400 border-red-500/20"
                          : "bg-amber-500/20 text-amber-400 border-amber-500/20"
                      }>{t.priority}</Badge>
                      <span className="text-[10px] text-muted-foreground hidden sm:inline">
                        {format(new Date(t.createdAt), "MMM d")}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-base">Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid gap-2">
              {quickLinks.map(link => (
                <Link key={link.href} href={link.href}>
                  <div className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    <p className="text-sm font-medium">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-base">Today&apos;s Summary</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">New / pending today</span>
                <span className="font-medium text-amber-400">{stats?.pendingToday ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total tickets</span>
                <span className="font-medium">{stats?.totalTickets ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Closed</span>
                <span className="font-medium text-muted-foreground">{stats?.closedTickets ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Guidelines</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>• Reply promptly to open and urgent tickets</p>
              <p>• Check Support Mail for emails to support@kuberquant.com</p>
              <p>• Escalate payment or KYC issues to admin</p>
              <p>• Mark resolved when the customer confirms fix</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-sky-400" />
            Support Mail — support@kuberquant.com
          </CardTitle>
          <Link href="/support-team/mail">
            <Button variant="ghost" size="sm" className="text-amber-400">Open full inbox <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </Link>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Manage client queries, complaints, disputes, and other emails sent to support@kuberquant.com directly from the support dashboard.
          </p>
          <SupportMailInboxPanel compact apiBase="/support-team/mail" title="" description="" />
        </CardContent>
      </Card>
    </div>
  );
}
