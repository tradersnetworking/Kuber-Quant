import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

function KycActionButtons({
  recordId,
  onApprove,
  onReject,
  className,
}: {
  recordId: number;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col xs:flex-row gap-2", className)} onClick={e => e.stopPropagation()}>
      <Button size="sm" className="bg-green-600 hover:bg-green-700 touch-target" onClick={() => onApprove(recordId)}>
        <CheckCircle className="h-3 w-3 mr-1" />Approve
      </Button>
      <Button size="sm" variant="outline" className="text-red-400 touch-target" onClick={() => onReject(recordId)}>
        <XCircle className="h-3 w-3 mr-1" />Reject
      </Button>
    </div>
  );
}

export function KycManagementPanel() {
  const { toast } = useToast();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("submitted");
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openUserDetail = (userId: number) => {
    setDetailUserId(userId);
    setDetailOpen(true);
  };

  const load = async () => {
    setLoading(true);
    try {
      setRecords(await staffFetch<any[]>("/admin/kyc"));
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: number) => {
    try {
      await staffFetch(`/admin/kyc/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
      toast({ title: "KYC approved" });
      load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
    }
  };

  const reject = async () => {
    if (!rejectId) return;
    try {
      await staffFetch(`/admin/kyc/${rejectId}/reject`, { method: "POST", body: JSON.stringify({ reason: rejectReason || "Not approved" }) });
      toast({ title: "KYC rejected" });
      setRejectId(null);
      setRejectReason("");
      load();
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
    }
  };

  const filtered = filter === "all" ? records : records.filter(r => r.status === filter);

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400 shrink-0" />KYC Approvals
          </h2>
          <p className="text-sm text-muted-foreground">Review and approve or reject identity verification submissions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
        </Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10 flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="submitted">Pending</TabsTrigger>
          <TabsTrigger value="verified">Verified</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No KYC records in this filter.</p>
      ) : (
        <div className={cn(STAFF_CARD, "p-3 sm:p-4 min-w-0")}>
          <ResponsiveDataView
            caption="KYC approval queue"
            data={filtered}
            rowKey={r => r.id}
            rowClassName="border-border/80 dark:border-white/5 cursor-pointer"
            onRowClick={r => openUserDetail(r.userId)}
            columns={[
              {
                key: "applicant",
                header: "Applicant",
                mobileTitle: true,
                cell: (r: any) => (
                  <button
                    type="button"
                    className="font-medium text-left hover:text-amber-600 dark:hover:text-amber-400 hover:underline truncate max-w-full"
                    onClick={e => { e.stopPropagation(); openUserDetail(r.userId); }}
                  >
                    {r.userName || r.userEmail || `User #${r.userId}`}
                  </button>
                ),
              },
              {
                key: "status",
                header: "Status",
                cell: (r: any) => (
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className="capitalize text-[10px]">{r.status}</Badge>
                    {r.ocrValidation && (
                      <Badge
                        variant="outline"
                        className={r.ocrValidation.passed
                          ? "border-green-500/40 text-green-700 dark:text-green-400 text-[10px]"
                          : "border-orange-500/40 text-orange-600 dark:text-orange-400 text-[10px]"}
                      >
                        OCR {r.ocrValidation.riskScore}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                key: "document",
                header: "ID Document",
                hideOnMobile: true,
                cell: (r: any) => (
                  <span className="text-xs text-muted-foreground">
                    {r.idType?.toUpperCase()} · {r.idNumber} · {r.country}
                  </span>
                ),
              },
              {
                key: "name",
                header: "Legal name",
                hideOnMobile: true,
                cell: (r: any) => <span className="text-sm">{r.fullName || "—"}</span>,
              },
              {
                key: "submitted",
                header: "Submitted",
                cell: (r: any) => (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}
                  </span>
                ),
              },
              {
                key: "actions",
                header: "Actions",
                headerClassName: "text-right",
                cellClassName: "text-right",
                hideOnMobile: true,
                cell: (r: any) => r.status === "submitted" ? (
                  <KycActionButtons recordId={r.id} onApprove={approve} onReject={setRejectId} />
                ) : null,
              },
            ]}
            mobileHeader={(r: any) => (
              <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                <p className="text-sm font-semibold truncate">{r.userName || r.userEmail || `User #${r.userId}`}</p>
                <Badge variant="outline" className="capitalize text-[10px] shrink-0">{r.status}</Badge>
              </div>
            )}
            mobileFooter={(r: any) => r.status === "submitted" ? (
              <KycActionButtons recordId={r.id} onApprove={approve} onReject={setRejectId} className="mt-3 pt-3 border-t border-border/60 dark:border-white/5" />
            ) : null}
          />
        </div>
      )}

      <Dialog open={rejectId !== null} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent className="bg-background border-border dark:border-white/10">
          <DialogHeader><DialogTitle>Reject KYC Application</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" placeholder="Explain why this application was rejected..." />
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={reject}>Confirm Rejection</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserFullDetailSheet
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        apiBase="/admin"
        defaultTab="kyc"
      />
    </div>
  );
}
