import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, Clock, FileText, Lock, XCircle } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type KycDocStatus = "pending" | "approved" | "rejected" | "superseded";

type AdminKycDocument = {
  id: number;
  docType: string;
  label: string;
  fileUrl: string;
  originalFilename: string | null;
  status: KycDocStatus;
  supersedesId: number | null;
  rejectionReason: string | null;
  createdAt: string;
};

const STATUS_META: Record<KycDocStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: Clock },
  approved: { label: "Approved", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", icon: XCircle },
  superseded: { label: "Replaced", className: "bg-muted text-muted-foreground border-border", icon: Clock },
};

export function KycDocumentReview({ userId, readOnly = false }: { userId: number; readOnly?: boolean }) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<AdminKycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      setDocs(await staffFetch<AdminKycDocument[]>(`/admin/kyc/${userId}/documents`));
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [userId]);

  const approve = async (id: number) => {
    setBusyId(id);
    try {
      await staffFetch(`/admin/kyc/documents/${id}/approve`, { method: "POST", body: JSON.stringify({}) });
      toast({ title: "Document approved" });
      await load();
    } catch (e: any) {
      toast({ title: "Approve failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: number) => {
    setBusyId(id);
    try {
      await staffFetch(`/admin/kyc/documents/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: rejectReason[id] || "Document not accepted" }),
      });
      toast({ title: "Document rejected" });
      await load();
    } catch (e: any) {
      toast({ title: "Reject failed", description: e.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const visible = docs.filter(d => d.status !== "superseded");

  if (loading) return <Skeleton className="h-32 w-full" />;
  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No individually-managed documents for this user.</p>;
  }

  return (
    <div className="space-y-2">
      {visible.map(doc => {
        const meta = STATUS_META[doc.status];
        const StatusIcon = meta.icon;
        const busy = busyId === doc.id;
        const isReplacement = doc.supersedesId != null;
        return (
          <div key={doc.id} className="rounded-lg border border-border dark:border-white/10 bg-background/60 p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2 min-w-0">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {doc.label}
                    {isReplacement && <span className="ml-1 text-[10px] text-amber-600 dark:text-amber-400">(replacement)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{doc.originalFilename || "document"}</p>
                </div>
              </div>
              <Badge className={cn("gap-1 shrink-0", meta.className)}>
                {doc.status === "approved" && <Lock className="h-3 w-3" />}
                <StatusIcon className="h-3 w-3" />
                {meta.label}
              </Badge>
            </div>

            {doc.status === "rejected" && doc.rejectionReason && (
              <p className="text-[11px] text-red-500">Reason: {doc.rejectionReason}</p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              <SecureUploadLink
                url={doc.fileUrl}
                previewTitle={doc.label}
                className="inline-flex items-center h-7 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent hover:text-accent-foreground"
              >
                View
              </SecureUploadLink>
              {!readOnly && doc.status !== "approved" && (
                <>
                  <Button size="sm" className="h-7 px-3 text-xs bg-green-600 hover:bg-green-700" disabled={busy} onClick={() => approve(doc.id)}>
                    <CheckCircle className="h-3 w-3 mr-1" /> Approve
                  </Button>
                  <Input
                    value={rejectReason[doc.id] || ""}
                    onChange={e => setRejectReason(prev => ({ ...prev, [doc.id]: e.target.value }))}
                    placeholder="Reject reason"
                    className="h-7 w-40 text-xs"
                  />
                  <Button size="sm" variant="outline" className="h-7 px-3 text-xs text-red-500 border-red-500/30" disabled={busy} onClick={() => reject(doc.id)}>
                    <XCircle className="h-3 w-3 mr-1" /> Reject
                  </Button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
