import { useListManagerClients, User } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

export default function ManagerClients() {
  const { data: clients, isLoading } = useListManagerClients();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Clients</h1>
          <p className="text-muted-foreground">Manage and monitor your assigned client accounts.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Client List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Client Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>KYC Status</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No clients assigned to you yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients?.map((client: User) => (
                      <TableRow key={client.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell className="font-medium text-foreground">{client.fullName}</TableCell>
                        <TableCell className="text-muted-foreground">{client.email}</TableCell>
                        <TableCell>
                          <Badge variant={client.kycStatus === "verified" ? "default" : "outline"} 
                            className={
                              client.kycStatus === "verified" 
                                ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                : client.kycStatus === "pending"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }>
                            {client.kycStatus?.toUpperCase() || "UNSUBMITTED"}
                          </Badge>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">{client.role}</TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/users/${client.id}`}>
                            <span className="text-amber-400 hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                              View Details
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
