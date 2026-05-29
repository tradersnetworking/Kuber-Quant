import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { useToast } from "@/hooks/use-toast";
import { Headset, RefreshCw } from "lucide-react";
import { staffFetch, replyToTicketAsStaff, closeTicketAsAdmin } from "@/lib/staff-api";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

export function SupportTicketsPanel() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setTickets(await staffFetch<any[]>("/admin/tickets"));
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setPending(true);
    try {
      await replyToTicketAsStaff(selected.id, reply, "superadmin");
      toast({ title: "Reply sent" });
      setReply("");
      const fresh = await staffFetch<any[]>("/admin/tickets");
      setTickets(fresh);
      setSelected(fresh.find(t => t.id === selected.id) || null);
    } catch (err: any) {
      toast({ title: "Reply failed", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const closeTicket = async (id: number) => {
    try {
      await closeTicketAsAdmin(id);
      toast({ title: "Ticket closed" });
      load();
      setSelected(null);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const statusBadge = (status?: string) => (
    <Badge variant="outline" className="capitalize shrink-0 text-[10px]">
      {status?.replace("_", " ") ?? "—"}
    </Badge>
  );

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Headset className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0" />
            Support Tickets
          </h2>
          <p className="text-sm text-muted-foreground">View, reply to, and close all platform support tickets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No support tickets.</p>
      ) : (
        <div className={cn(STAFF_CARD, "p-3 sm:p-4 min-w-0")}>
          <ResponsiveDataView
            caption="Support ticket queue"
            data={tickets}
            rowKey={t => t.id}
            rowClassName="border-border/80 dark:border-white/5 cursor-pointer"
            onRowClick={t => setSelected(t)}
            columns={[
              {
                key: "subject",
                header: "Subject",
                mobileTitle: true,
                cell: (t: any) => (
                  <span className="font-medium truncate max-w-full block">
                    #{t.id} — {t.subject}
                  </span>
                ),
              },
              {
                key: "user",
                header: "User",
                cell: (t: any) => <span className="text-sm truncate">{t.userEmail ?? "—"}</span>,
              },
              {
                key: "priority",
                header: "Priority",
                hideOnMobile: true,
                cell: (t: any) => <span className="text-xs capitalize">{t.priority ?? "—"}</span>,
              },
              {
                key: "status",
                header: "Status",
                cell: (t: any) => statusBadge(t.status),
              },
              {
                key: "created",
                header: "Created",
                hideOnMobile: true,
                cell: (t: any) => (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
                  </span>
                ),
              },
            ]}
            mobileHeader={(t: any) => (
              <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                <p className="text-sm font-semibold truncate">#{t.id} — {t.subject}</p>
                {statusBadge(t.status)}
              </div>
            )}
            mobileFooter={(t: any) => (
              <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/60 dark:border-white/5">
                {t.userEmail} · {t.priority} · {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}
              </p>
            )}
          />
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-[calc(100vw-1.5rem)] sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-left break-words">Ticket #{selected?.id}: {selected?.subject}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[300px] pr-2 min-w-0">
            <div className="space-y-3 min-w-0">
              <div className="p-3 rounded-lg bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 text-sm break-words">{selected?.message}</div>
              {selected?.replies?.map((r: any) => (
                <div key={r.id} className={`p-3 rounded-lg border text-sm break-words ${r.isAdmin ? "bg-amber-500/10 border-amber-500/20 ml-0 sm:ml-6" : "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 mr-0 sm:mr-6"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{r.isAdmin ? "Staff" : "User"} · {new Date(r.createdAt).toLocaleString()}</p>
                  {r.message}
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={sendReply} className="space-y-2 pt-2 border-t border-border dark:border-white/10 min-w-0">
            <Label>Reply</Label>
            <Textarea value={reply} onChange={e => setReply(e.target.value)} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[80px]" placeholder="Type your response..." />
            <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
              {selected?.status !== "closed" && (
                <Button type="button" variant="outline" onClick={() => closeTicket(selected.id)} className="w-full sm:w-auto">Close Ticket</Button>
              )}
              <Button type="submit" disabled={pending || !reply.trim()} className="bg-amber-500 text-black w-full sm:w-auto">{pending ? "Sending..." : "Send Reply"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
