import { useListManagerKyc, KycRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";

type KycRow = KycRecord & { userName?: string; userEmail?: string; userId?: number };

export default function ManagerKyc() {
  const { data: kycRecords, isLoading } = useListManagerKyc();

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">KYC Queue</h1>
          <p className="text-muted-foreground">Review KYC applications and identity details from your clients.</p>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Client KYC Applications</CardTitle>
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
                    <TableHead>ID Type</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kycRecords?.length === 0 ? (
                    <TableRow className="border-white/10">
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No KYC applications from your clients.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (kycRecords as KycRow[])?.map((record) => (
                      <TableRow key={record.id} className="border-white/10 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <p className="font-medium text-foreground">{record.userName || "Unknown Client"}</p>
                          <p className="text-xs text-muted-foreground">{record.userEmail}</p>
                        </TableCell>
                        <TableCell className="capitalize text-muted-foreground">{(record.idType ?? "").replace("_", " ") || "N/A"}</TableCell>
                        <TableCell className="text-muted-foreground font-mono text-sm">{record.idNumber || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(record as any).country || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.createdAt ? format(new Date(record.createdAt), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              record.status === "verified"
                                ? "bg-green-500/10 text-green-500 border-green-500/20"
                                : record.status === "pending" || record.status === "submitted"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                            }>
                            {record.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {record.userId ? (
                            <Link href={`/manager/clients/${record.userId}`}>
                              <span className="text-amber-400 hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                                View Details
                              </span>
                            </Link>
                          ) : "—"}
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
