import { useListAdminKyc, useApproveKyc, useRejectKyc } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function AdminKycPage() {
  const { data: kycRecords, isLoading, refetch } = useListAdminKyc();
  const approveMutation = useApproveKyc();
  const rejectMutation = useRejectKyc();
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id: number) => {
    approveMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "KYC approved successfully" });
          refetch();
        },
      }
    );
  };

  const handleReject = () => {
    if (!rejectingId) return;
    rejectMutation.mutate(
      { id: rejectingId, data: { reason: rejectReason } },
      {
        onSuccess: () => {
          toast({ title: "KYC rejected" });
          setRejectingId(null);
          setRejectReason("");
          refetch();
        },
      }
    );
  };

  const filteredRecords = kycRecords?.filter((r: any) => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">KYC Verification</h1>
            <p className="text-muted-foreground">Review and manage user identity verifications.</p>
          </div>
        </div>

        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="verified">Verified</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredRecords?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead>User</TableHead>
                    <TableHead>ID Type</TableHead>
                    <TableHead>ID Number</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record: any) => (
                    <TableRow key={record.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{record.fullName}</TableCell>
                      <TableCell className="capitalize">{record.idType?.replace("_", " ")}</TableCell>
                      <TableCell>{record.idNumber}</TableCell>
                      <TableCell>{new Date(record.updatedAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            record.status === "verified"
                              ? "bg-green-500/20 text-green-500 border-green-500/20"
                              : record.status === "rejected"
                              ? "bg-red-500/20 text-red-500 border-red-500/20"
                              : "bg-amber-500/20 text-amber-500 border-amber-500/20"
                          }
                          variant="outline"
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {record.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-black"
                              onClick={() => handleApprove(record.id)}
                              disabled={approveMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                              onClick={() => setRejectingId(record.id)}
                              disabled={rejectMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No KYC applications found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={rejectingId !== null} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent className="bg-[#050A14] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Reject KYC Application</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Please provide a reason for rejecting this application. This will be shown to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Reason for rejection</Label>
              <Textarea
                id="reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ID document is blurry or expired"
                className="bg-white/5 border-white/10 focus:border-amber-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectingId(null)} className="text-white hover:bg-white/5">
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={!rejectReason || rejectMutation.isPending}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
