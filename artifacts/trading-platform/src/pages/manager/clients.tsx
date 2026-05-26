import { useListManagerClients, User } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

type ClientRow = User & {
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalProfit?: number;
  balanceFiat?: number;
};

const fmt = (n?: number) => n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : "—";

export default function ManagerClients() {
  const { data: clients, isLoading } = useListManagerClients();

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">My Clients</h1>
          <p className="text-muted-foreground">Monitor earnings, deposits, withdrawals, and KYC for your assigned clients.</p>
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
                    <TableHead>Client</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Deposits</TableHead>
                    <TableHead>Withdrawals</TableHead>
                    <TableHead>Profit</TableHead>
                    <TableHead>KYC</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No clients assigned to you yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (clients as ClientRow[])?.map((client) => (
                      <TableRow key={client.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <p className="font-medium text-foreground">{client.fullName}</p>
                          <p className="text-xs text-muted-foreground">{client.email}</p>
                        </TableCell>
                        <TableCell className="text-emerald-400 font-medium">{fmt(client.balanceFiat)}</TableCell>
                        <TableCell className="text-green-400">{fmt(client.totalDeposits)}</TableCell>
                        <TableCell className="text-red-400">{fmt(client.totalWithdrawals)}</TableCell>
                        <TableCell className="text-amber-400">{fmt(client.totalProfit)}</TableCell>
                        <TableCell>
                          <Badge variant="outline"
                            className={
                              client.kycStatus === "verified"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : client.kycStatus === "pending" || client.kycStatus === "submitted"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }>
                            {client.kycStatus?.toUpperCase() || "UNSUBMITTED"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/manager/clients/${client.id}`}>
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
);
}
