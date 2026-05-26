import { useListAdminTickets } from "@workspace/api-client-react";
import { replyToTicketAsStaff } from "@/lib/staff-api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function AdminTicketsPage() {
  const { data: tickets, isLoading, refetch } = useListAdminTickets();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [replyPending, setReplyPending] = useState(false);

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage) return;

    setReplyPending(true);
    try {
      await replyToTicketAsStaff(selectedTicket.id, replyMessage, "admin");
      toast({ title: "Reply sent successfully" });
      setReplyMessage("");
      const updated = await refetch();
      const fresh = updated.data?.find((t: any) => t.id === selectedTicket.id);
      if (fresh) setSelectedTicket(fresh);
    } catch (err: any) {
      toast({ title: "Failed to send reply", description: err.message, variant: "destructive" });
    } finally {
      setReplyPending(false);
    }
  };

  const filteredTickets = tickets?.filter((t: any) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const handleOpenTicket = (ticket: any) => {
    setSelectedTicket(ticket);
  };

  return (
    <>
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Support Tickets</h1>
          <p className="text-muted-foreground">Manage and resolve user support requests.</p>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all">All Tickets</TabsTrigger>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress</TabsTrigger>
            <TabsTrigger value="resolved">Resolved</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Tickets Queue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredTickets?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead>ID</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Activity</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTickets.map((ticket) => (
                    <TableRow key={ticket.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-mono text-xs">#{ticket.id}</TableCell>
                      <TableCell className="text-white">{ticket.userEmail}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ticket.priority === "high" || ticket.priority === "urgent"
                              ? "bg-red-500/20 text-red-500 border-red-500/20"
                              : ticket.priority === "medium"
                              ? "bg-amber-500/20 text-amber-500 border-amber-500/20"
                              : "bg-blue-500/20 text-blue-500 border-blue-500/20"
                          }
                        >
                          {ticket.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            ticket.status === "open"
                              ? "bg-green-500/20 text-green-500 border-green-500/20"
                              : ticket.status === "resolved"
                              ? "bg-gray-500/20 text-gray-300 border-gray-500/20"
                              : "bg-amber-500/20 text-amber-500 border-amber-500/20"
                          }
                        >
                          {ticket.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenTicket(ticket)}
                          className="text-amber-400 hover:text-amber-500 hover:bg-amber-500/10"
                        >
                          View & Reply
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No support tickets found.</div>
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
                <span className="font-bold text-amber-400">{selectedTicket?.userEmail}</span>
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
                        {reply.isAdmin ? "Staff" : "User"}
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
