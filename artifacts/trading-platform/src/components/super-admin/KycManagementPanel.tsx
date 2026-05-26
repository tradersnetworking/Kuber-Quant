import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";

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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-teal-400" />KYC Approvals</h2>
          <p className="text-sm text-muted-foreground">Review and approve or reject identity verification submissions.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-white/5 border border-white/10">
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
        <div className="space-y-2">
          {filtered.map(r => (
            <Card
              key={r.id}
              className="bg-white/5 border-white/10 cursor-pointer hover:bg-white/[0.07] transition-colors"
              onClick={() => openUserDetail(r.userId)}
            >
              <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      className="font-medium text-left hover:text-amber-400 hover:underline"
                      onClick={e => { e.stopPropagation(); openUserDetail(r.userId); }}
                    >
                      {r.userName || r.userEmail || `User #${r.userId}`}
                    </button>
                    <Badge variant="outline" className="capitalize">{r.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {r.idType?.toUpperCase()} · {r.idNumber} · {r.country} · {r.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}</p>
                </div>
                {r.status === "submitted" && (
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => approve(r.id)}>
                      <CheckCircle className="h-3 w-3 mr-1" />Approve
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-400" onClick={() => setRejectId(r.id)}>
                      <XCircle className="h-3 w-3 mr-1" />Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={rejectId !== null} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent className="bg-[#050A14] border-white/10">
          <DialogHeader><DialogTitle>Reject KYC Application</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="bg-white/5 border-white/10" placeholder="Explain why this application was rejected..." />
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
