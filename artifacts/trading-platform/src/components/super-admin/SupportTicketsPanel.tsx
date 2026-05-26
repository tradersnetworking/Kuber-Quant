import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Headset, RefreshCw } from "lucide-react";
import { staffFetch, replyToTicketAsStaff, closeTicketAsAdmin } from "@/lib/staff-api";

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
      await replyToTicketAsStaff(selected.id, reply, "admin");
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><Headset className="h-5 w-5 text-rose-400" />Support Tickets</h2>
          <p className="text-sm text-muted-foreground">View, reply to, and close all platform support tickets.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      {loading ? (
        <Skeleton className="h-20 w-full" />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No support tickets.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {tickets.map(t => (
            <Card key={t.id} className="bg-white/5 border-white/10 cursor-pointer hover:border-white/20" onClick={() => setSelected(t)}>
              <CardContent className="p-3 flex justify-between items-center gap-3">
                <div>
                  <p className="text-sm font-medium">#{t.id} — {t.subject}</p>
                  <p className="text-xs text-muted-foreground">{t.userEmail} · {t.priority} · {new Date(t.createdAt).toLocaleDateString()}</p>
                </div>
                <Badge variant="outline" className="capitalize shrink-0">{t.status?.replace("_", " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Ticket #{selected?.id}: {selected?.subject}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[300px] pr-2">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">{selected?.message}</div>
              {selected?.replies?.map((r: any) => (
                <div key={r.id} className={`p-3 rounded-lg border text-sm ${r.isAdmin ? "bg-amber-500/10 border-amber-500/20 ml-6" : "bg-white/5 border-white/10 mr-6"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{r.isAdmin ? "Staff" : "User"} · {new Date(r.createdAt).toLocaleString()}</p>
                  {r.message}
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={sendReply} className="space-y-2 pt-2 border-t border-white/10">
            <Label>Reply</Label>
            <Textarea value={reply} onChange={e => setReply(e.target.value)} className="bg-white/5 border-white/10 min-h-[80px]" placeholder="Type your response..." />
            <DialogFooter className="gap-2 sm:gap-0">
              {selected?.status !== "closed" && (
                <Button type="button" variant="outline" onClick={() => closeTicket(selected.id)}>Close Ticket</Button>
              )}
              <Button type="submit" disabled={pending || !reply.trim()} className="bg-amber-500 text-black">{pending ? "Sending..." : "Send Reply"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
