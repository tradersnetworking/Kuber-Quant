import { useListManagerTickets, Ticket } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";

export default function ManagerTickets() {
  const { data: tickets, isLoading } = useListManagerTickets();

  return (
    <AppLayout>
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
                          {(ticket as any).user?.fullName || "Unknown Client"}
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
                          <Link href={`/support/${ticket.id}`}>
                            <span className="text-amber-400 hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                              View & Reply
                            </span>
                          </Link>
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
    </AppLayout>
  );
}
