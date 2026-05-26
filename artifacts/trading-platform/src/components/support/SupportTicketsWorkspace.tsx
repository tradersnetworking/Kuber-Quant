import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RefreshCw, Headset } from "lucide-react";
import {
  staffFetch,
  replyToTicketAsStaff,
  updateSupportTicketStatus,
  resolveSupportTicket,
  closeSupportTicket,
} from "@/lib/staff-api";

export interface SupportTicket {
  id: number;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  category: string | null;
  replies: Array<{ id: number; message: string; isAdmin: boolean; createdAt: string }>;
  createdAt: string;
}

interface SupportTicketsWorkspaceProps {
  title: string;
  description: string;
  defaultStatus?: string;
  defaultCategory?: string;
}

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function priorityBadge(priority: string) {
  if (priority === "urgent" || priority === "high") return "bg-red-500/20 text-red-400 border-red-500/20";
  if (priority === "medium") return "bg-amber-500/20 text-amber-400 border-amber-500/20";
  return "bg-blue-500/20 text-blue-400 border-blue-500/20";
}

function statusBadge(status: string) {
  if (status === "open") return "bg-green-500/20 text-green-400 border-green-500/20";
  if (status === "resolved" || status === "closed") return "bg-gray-500/20 text-gray-300 border-gray-500/20";
  return "bg-amber-500/20 text-amber-400 border-amber-500/20";
}

export function SupportTicketsWorkspace({
  title,
  description,
  defaultStatus = "all",
  defaultCategory,
}: SupportTicketsWorkspaceProps) {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(defaultStatus);
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (defaultCategory) params.set("category", defaultCategory);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);
      const qs = params.toString();
      setTickets(await staffFetch<SupportTicket[]>(`/support-team/tickets${qs ? `?${qs}` : ""}`));
    } catch (e: any) {
      toast({ title: "Failed to load tickets", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, defaultCategory, toast]);

  useEffect(() => { load(); }, [load]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected || !reply.trim()) return;
    setPending(true);
    try {
      const updated = await replyToTicketAsStaff(selected.id, reply, "support");
      toast({ title: "Reply sent" });
      setReply("");
      setSelected(updated);
      await load();
    } catch (err: any) {
      toast({ title: "Reply failed", description: err.message, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    try {
      const updated = await updateSupportTicketStatus(selected.id, status);
      toast({ title: `Ticket marked ${status.replace("_", " ")}` });
      setSelected(updated);
      await load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  const handleResolve = async () => {
    if (!selected) return;
    try {
      const updated = await resolveSupportTicket(selected.id);
      toast({ title: "Ticket resolved" });
      setSelected(updated);
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleClose = async () => {
    if (!selected) return;
    try {
      const updated = await closeSupportTicket(selected.id);
      toast({ title: "Ticket closed" });
      setSelected(updated);
      await load();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Headset className="h-7 w-7 text-rose-400" />
            {title}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
            {STATUS_TABS.map(t => (
              <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-40 bg-white/5 border-white/10">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-white/10 bg-white/5">
        <CardHeader>
          <CardTitle className="text-base">Ticket Queue ({tickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : tickets.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">No tickets match your filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(t => (
                    <TableRow key={t.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-mono text-xs">#{t.id}</TableCell>
                      <TableCell>
                        <p className="text-sm">{t.userName || "—"}</p>
                        <p className="text-xs text-muted-foreground">{t.userEmail}</p>
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate font-medium">{t.subject}</TableCell>
                      <TableCell className="text-sm capitalize">{t.category || "General"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={priorityBadge(t.priority)}>{t.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusBadge(t.status)}>{t.status.replace("_", " ")}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{format(new Date(t.createdAt), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" className="text-amber-400" onClick={() => setSelected(t)}>
                          View & Reply
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="pr-8">
              Ticket #{selected?.id}: {selected?.subject}
            </DialogTitle>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className={statusBadge(selected?.status || "")}>{selected?.status?.replace("_", " ")}</Badge>
              <Badge variant="outline" className={priorityBadge(selected?.priority || "")}>{selected?.priority}</Badge>
              <Badge variant="outline">{selected?.category || "General"}</Badge>
              <span className="text-xs text-muted-foreground">{selected?.userName} · {selected?.userEmail}</span>
            </div>
          </DialogHeader>
          <ScrollArea className="flex-1 max-h-[280px] pr-2">
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm whitespace-pre-wrap">{selected?.message}</div>
              {selected?.replies?.map(r => (
                <div key={r.id} className={`p-3 rounded-lg border text-sm whitespace-pre-wrap ${r.isAdmin ? "bg-amber-500/10 border-amber-500/20 ml-4" : "bg-white/5 border-white/10 mr-4"}`}>
                  <p className="text-xs text-muted-foreground mb-1">{r.isAdmin ? "Support Team" : "Customer"} · {format(new Date(r.createdAt), "MMM d, h:mm a")}</p>
                  {r.message}
                </div>
              ))}
            </div>
          </ScrollArea>
          {selected?.status === "closed" ? (
            <DialogFooter className="pt-3 border-t border-white/10">
              <Button type="button" variant="outline" onClick={() => changeStatus("open")}>Reopen Ticket</Button>
            </DialogFooter>
          ) : selected?.status !== "closed" && (
            <form onSubmit={sendReply} className="space-y-3 pt-3 border-t border-white/10">
              <Label>Reply to customer</Label>
              <Textarea
                value={reply}
                onChange={e => setReply(e.target.value)}
                className="bg-white/5 border-white/10 min-h-[90px]"
                placeholder="Type your response..."
              />
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <div className="flex flex-wrap gap-2 mr-auto">
                  {selected?.status === "open" && (
                    <Button type="button" variant="outline" size="sm" onClick={() => changeStatus("in_progress")}>Mark In Progress</Button>
                  )}
                  {selected?.status !== "resolved" && (
                    <Button type="button" variant="outline" size="sm" onClick={handleResolve}>Resolve</Button>
                  )}
                  <Button type="button" variant="outline" size="sm" onClick={handleClose}>Close</Button>
                  {(selected?.status === "resolved") && (
                    <Button type="button" variant="outline" size="sm" onClick={() => changeStatus("open")}>Reopen</Button>
                  )}
                </div>
                <Button type="submit" disabled={pending || !reply.trim()} className="bg-amber-500 text-black">
                  {pending ? "Sending..." : "Send Reply"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
