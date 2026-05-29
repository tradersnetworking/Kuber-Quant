import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Ticket, Eye, ShieldAlert } from "lucide-react";
import { Link } from "wouter";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { StaffReportDialog } from "@/components/staff/StaffReportDialog";
import { SupportUserFinancePanel } from "@/components/support/SupportUserFinancePanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STAFF_PAGE_STACK, STAFF_CARD } from "@/lib/staff-dashboard-ui";

function roleBadgeClass(role: string) {
  if (role === "manager") return "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400";
  if (role === "support") return "bg-rose-500/10 text-rose-600 dark:text-rose-400";
  return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
}

export default function SupportUserLookup() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/support-team/users/lookup", search, roleFilter],
    queryFn: () => staffFetch<any[]>(`/support-team/users/lookup?q=${encodeURIComponent(search)}&role=${encodeURIComponent(roleFilter)}`),
    enabled: search.length >= 2,
  });

  const lookupId = selectedUserId ?? (users?.length === 1 ? users[0].id : null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/support-team/users/status", lookupId],
    queryFn: () => staffFetch<any>(`/support-team/users/${lookupId}/status`),
    enabled: !!lookupId,
    ...financeQueryOptions,
  });

  const selectedUser = users?.find(u => u.id === lookupId) ?? detail?.user;

  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6 sm:h-7 sm:w-7 text-blue-600 dark:text-blue-400 shrink-0" />
          User Lookup
        </h1>
        <p className="page-subtitle">
          Search an investor or manager, then view their individual deposits, withdrawals, investments, subscriptions, and exchange activity — not platform-wide data.
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>
            Support can <strong className="text-foreground">view only</strong> individual user records — search a user first, then open their finance & profile data.
            You cannot browse all platform transactions or approve changes. Use <strong className="text-foreground">Report to Super Admin</strong> when action is needed.
          </p>
        </CardContent>
      </Card>

      <form onSubmit={e => { e.preventDefault(); setSearch(q); setSelectedUserId(null); }} className="flex flex-wrap gap-2 max-w-2xl">
        <Input placeholder="Email or name..." value={q} onChange={e => setQ(e.target.value)} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 flex-1 min-w-[200px]" />
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[140px] bg-muted/60 dark:bg-white/5">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="user">Investors</SelectItem>
            <SelectItem value="manager">Managers</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit"><Search className="h-4 w-4" /></Button>
      </form>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {users && users.length > 0 && (
        <Card className={STAFF_CARD}>
          <CardHeader><CardTitle className="text-base">Results ({users.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full flex justify-between items-center p-3 rounded-lg border text-left transition-colors ${
                  lookupId === u.id ? "bg-amber-500/10 border-amber-500/30" : "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-border dark:border-white/20"
                }`}
              >
                <div>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className={`capitalize ${roleBadgeClass(u.role)}`}>{u.role}</Badge>
                  <Badge variant="outline" className="capitalize">{u.kycStatus}</Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {search.length >= 2 && !isLoading && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found for &quot;{search}&quot;.</p>
      )}

      {lookupId && detailLoading && <Skeleton className="h-48 w-full" />}

      {detail && !detailLoading && selectedUser && (
        <>
          <div className="flex flex-wrap gap-2">
            <Button className="gap-2" onClick={() => setDetailOpen(true)}>
              <Eye className="h-4 w-4" /> Full account details
            </Button>
            <StaffReportDialog
              role="support"
              subjectUserId={lookupId}
              subjectUserName={selectedUser.fullName}
            />
          </div>

          <Card className={STAFF_CARD}>
            <CardHeader><CardTitle className="text-base">Account Status — {detail.user.fullName}</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-muted-foreground text-xs">Role</p><p className="capitalize">{detail.user.role}</p></div>
                {detail.managerName && (
                  <div><p className="text-muted-foreground text-xs">Assigned manager</p><p>{detail.managerName}</p></div>
                )}
                <div><p className="text-muted-foreground text-xs">Email</p><p>{detail.user.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Wallet</p><p className="font-bold text-emerald-600 dark:text-emerald-400">${detail.user.balanceFiat}</p></div>
                <div><p className="text-muted-foreground text-xs">KYC</p><p className="capitalize">{detail.user.kycStatus}</p></div>
                <div><p className="text-muted-foreground text-xs">Member since</p><p>{format(new Date(detail.user.createdAt), "MMM yyyy")}</p></div>
              </div>
              {detail.kyc && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-2">KYC Documents (read-only)</p>
                  <KycDocumentsList kyc={detail.kyc} />
                </div>
              )}
              {detail.recentTransactions?.length > 0 && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-2">Transactions (read-only)</p>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {detail.recentTransactions.map((t: any) => (
                      <div key={t.id} className="flex justify-between py-1.5 border-b border-border/80 dark:border-white/5 text-xs">
                        <span className="capitalize">{t.type}</span>
                        <span>{t.currency} {t.amount}</span>
                        <Badge variant="outline" className="text-[10px]">{t.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <SupportUserFinancePanel userId={lookupId} />

          <Card className={STAFF_CARD}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4" /> Ticket History</CardTitle>
              <Link href="/support-team/tickets"><Button variant="ghost" size="sm" className="text-amber-600 dark:text-amber-400">Open queue</Button></Link>
            </CardHeader>
            <CardContent>
              {!detail.recentTickets?.length ? (
                <p className="text-sm text-muted-foreground">No tickets from this user.</p>
              ) : (
                <div className="space-y-2">
                  {detail.recentTickets.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 text-sm">
                      <div>
                        <p className="font-medium">#{t.id} — {t.subject}</p>
                        <p className="text-xs text-muted-foreground">{t.category || "General"} · {format(new Date(t.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <Badge variant="outline" className="capitalize">{t.status.replace("_", " ")}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <UserFullDetailSheet
        userId={lookupId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        apiBase="/support-team"
        readOnly
      />
    </div>
  );
}
