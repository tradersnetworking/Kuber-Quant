import { useState } from "react";
import { useListManagerTickets, Ticket } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

  return (
    <>
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Support Tickets</h1>
          <p className="text-muted-foreground">Manage support requests from your assigned clients.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Ticket Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Client</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Update</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No support tickets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tickets?.map((ticket: Ticket) => (
                      <TableRow key={ticket.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-foreground">
                          {ticket.userName || ticket.userEmail || "Unknown Client"}
                        </TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[200px]">{ticket.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            ticket.priority === "high" || ticket.priority === "urgent"
                              ? "border-red-500/50 text-red-500 bg-red-500/5"
                              : ticket.priority === "medium"
                              ? "border-amber-500/50 text-amber-500 bg-amber-500/5"
                              : "border-blue-500/50 text-blue-500 bg-blue-500/5"
                          }>
                            {ticket.priority.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            ticket.status === "open"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : ticket.status === "closed"
                              ? "bg-slate-500/10 text-slate-500 border-slate-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }>
                            {ticket.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.createdAt ? format(new Date(ticket.createdAt), "MMM d, HH:mm") : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTicket(ticket)}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            View & Reply
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={selectedTicket !== null} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Ticket #{selectedTicket?.id}: {selectedTicket?.subject}</span>
              <Badge variant="outline" className="ml-2 bg-amber-500/20 text-amber-500 border-amber-500/20">
                {selectedTicket?.status}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
            <div className="bg-white/5 rounded-lg p-4 border border-white/10">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold text-amber-400">{selectedTicket?.userName || selectedTicket?.userEmail}</span>
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
                        : "bg-white/5 border-white/10 mr-8"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`font-bold ${reply.isAdmin ? "text-amber-400" : "text-white"}`}>
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

            <form onSubmit={handleReply} className="space-y-4 pt-4 border-t border-white/10">
              <div className="grid gap-2">
                <Label htmlFor="reply">Post Reply</Label>
                <Textarea
                  id="reply"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type your response here..."
                  className="bg-white/5 border-white/10 focus:border-amber-500 min-h-[100px]"
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
