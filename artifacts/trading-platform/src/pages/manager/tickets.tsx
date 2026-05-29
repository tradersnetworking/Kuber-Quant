import { useState } from "react";
import { useListManagerTickets, Ticket } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { replyToTicketAsStaff } from "@/lib/staff-api";
import { format } from "date-fns";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";

function priorityBadgeClass(priority: string) {
  if (priority === "high" || priority === "urgent") {
    return "border-red-500/50 text-red-500 bg-red-500/5";
  }
  if (priority === "medium") {
    return "border-amber-500/50 text-amber-500 bg-amber-500/5";
  }
  return "border-blue-500/50 text-blue-500 bg-blue-500/5";
}

function statusBadgeClass(status: string) {
  if (status === "open") return "bg-green-500/10 text-green-500 border-green-500/20";
  if (status === "closed") return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  return "bg-amber-500/10 text-amber-500 border-amber-500/20";
}

export default function ManagerTickets() {
  const { data: tickets, isLoading, refetch } = useListManagerTickets();
  const { toast } = useToast();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyPending, setReplyPending] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage) return;

    setReplyPending(true);
    try {
      await replyToTicketAsStaff(selectedTicket.id, replyMessage, "manager");
      toast({ title: "Reply sent successfully" });
      setReplyMessage("");
      const updated = await refetch();
      const fresh = updated.data?.find(t => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    } catch (err: any) {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    } finally {
      setReplyPending(false);
    }
  };

  const ticketColumns: ResponsiveColumn<Ticket>[] = [
    {
      key: "client",
      header: "Client",
      mobileTitle: true,
      cell: (ticket) => (
        <span className="font-medium text-foreground">
          {ticket.userName || ticket.userEmail || "Unknown Client"}
        </span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      cell: (ticket) => (
        <span className="text-muted-foreground truncate max-w-[200px] block">{ticket.subject}</span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (ticket) => (
        <Badge variant="outline" className={priorityBadgeClass(ticket.priority)}>
          {ticket.priority.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (ticket) => (
        <Badge className={statusBadgeClass(ticket.status)}>
          {ticket.status.toUpperCase()}
        </Badge>
      ),
    },
    {
      key: "lastUpdate",
      header: "Last Update",
      cell: (ticket) => (
        <span className="text-muted-foreground">
          {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, HH:mm") : "N/A"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (ticket) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedTicket(ticket)}
          className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
        >
          View & Reply
        </Button>
      ),
    },
  ];

  return (
    <>
    <div className={STAFF_PAGE_STACK}>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">Support Tickets</h1>
          <p className="page-subtitle">Manage support requests from your assigned clients.</p>
        </div>

        <Card className={STAFF_CARD}>
          <CardHeader>
            <CardTitle>Ticket Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : tickets?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No support tickets found.
              </div>
            ) : (
              <ResponsiveDataView
                className={STAFF_TABLE_WRAP}
                columns={ticketColumns}
                data={tickets ?? []}
                rowKey={(ticket) => ticket.id}
                rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 transition-colors"
                mobileFooter={(ticket) => (
                  <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 w-full justify-start px-0"
                    >
                      View & Reply
                    </Button>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-2xl max-h-[90vh] flex flex-col w-[calc(100vw-2rem)] sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Ticket #{selectedTicket?.id}: {selectedTicket?.subject}</span>
              <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-500 border-amber-500/20">
                {selectedTicket?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
            <div className="bg-muted/60 dark:bg-white/5 rounded-lg p-4 border border-border dark:border-white/10">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-amber-600 dark:text-amber-400">{selectedTicket?.userName || selectedTicket?.userEmail}</span>
                <span className="text-xs text-muted-foreground">
                  {selectedTicket && new Date(selectedTicket.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-sm">{selectedTicket?.message}</p>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {selectedTicket?.replies?.map((reply: any) => (
                  <div
                    key={reply.id}
                    className={`p-4 rounded-lg border ${
                      reply.isAdmin
                        ? "bg-amber-500/10 border-amber-500/20 ml-8"
                        : "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-bold ${reply.isAdmin ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                        {reply.isAdmin ? "Staff" : "Client"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm">{reply.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <form onSubmit={handleReply} className="space-y-4 pt-4 border-t border-border dark:border-white/10">
              <div className="grid gap-2">
                <Label htmlFor="reply">Post Reply</Label>
                <Textarea
                  id="reply"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response here..."
                  className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 focus:border-amber-500 min-h-[100px]"
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-600 text-black w-full"
                  disabled={!replyMessage || replyPending || selectedTicket?.status === "closed"}
                >
                  {replyPending ? "Sending..." : "Send Reply"}
                </Button>
              </DialogFooter>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
