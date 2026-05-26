import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users, Ticket } from "lucide-react";
import { Link } from "wouter";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { KycDocumentsList } from "@/components/kyc/KycDocumentsList";

export default function SupportUserLookup() {
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/support-team/users/lookup", search],
    queryFn: () => staffFetch<any[]>(`/support-team/users/lookup?q=${encodeURIComponent(search)}`),
    enabled: search.length >= 2,
  });

  const lookupId = selectedUserId ?? (users?.length === 1 ? users[0].id : null);

  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ["/api/support-team/users/status", lookupId],
    queryFn: () => staffFetch<any>(`/support-team/users/${lookupId}/status`),
    enabled: !!lookupId,
    ...financeQueryOptions,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-blue-400" />
          User Lookup
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Search customers by email or name — view read-only account status and ticket history.</p>
      </div>

      <form onSubmit={e => { e.preventDefault(); setSearch(q); setSelectedUserId(null); }} className="flex gap-2 max-w-lg">
        <Input placeholder="Email or name..." value={q} onChange={e => setQ(e.target.value)} className="bg-white/5 border-white/10" />
        <Button type="submit"><Search className="h-4 w-4" /></Button>
      </form>

      {isLoading && <Skeleton className="h-32 w-full" />}

      {users && users.length > 0 && (
        <Card className="border-white/10 bg-white/5">
          <CardHeader><CardTitle className="text-base">Results ({users.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {users.map(u => (
              <button
                key={u.id}
                type="button"
                onClick={() => setSelectedUserId(u.id)}
                className={`w-full flex justify-between items-center p-3 rounded-lg border text-left transition-colors ${
                  lookupId === u.id ? "bg-amber-500/10 border-amber-500/30" : "bg-white/5 border-white/10 hover:border-white/20"
                }`}
              >
                <div>
                  <p className="font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </div>
                <Badge className="capitalize">{u.kycStatus}</Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {search.length >= 2 && !isLoading && users?.length === 0 && (
        <p className="text-sm text-muted-foreground">No users found for &quot;{search}&quot;.</p>
      )}

      {lookupId && detailLoading && <Skeleton className="h-48 w-full" />}

      {detail && !detailLoading && (
        <>
          <Card className="border-white/10 bg-white/5">
            <CardHeader><CardTitle className="text-base">Account Status — {detail.user.fullName}</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><p className="text-muted-foreground text-xs">Email</p><p>{detail.user.email}</p></div>
                <div><p className="text-muted-foreground text-xs">Wallet</p><p className="font-bold text-emerald-400">${detail.user.balanceFiat}</p></div>
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
                  <p className="text-xs uppercase text-muted-foreground mb-2">Recent Transactions (read-only)</p>
                  <div className="space-y-1">
                    {detail.recentTransactions.map((t: any) => (
                      <div key={t.id} className="flex justify-between py-1.5 border-b border-white/5 text-xs">
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

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Ticket className="h-4 w-4" /> Ticket History</CardTitle>
              <Link href="/support-team/tickets"><Button variant="ghost" size="sm" className="text-amber-400">Open queue</Button></Link>
            </CardHeader>
            <CardContent>
              {!detail.recentTickets?.length ? (
                <p className="text-sm text-muted-foreground">No tickets from this user.</p>
              ) : (
                <div className="space-y-2">
                  {detail.recentTickets.map((t: any) => (
                    <div key={t.id} className="flex justify-between items-center p-2 rounded-lg bg-white/5 border border-white/10 text-sm">
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
    </div>
  );
}
