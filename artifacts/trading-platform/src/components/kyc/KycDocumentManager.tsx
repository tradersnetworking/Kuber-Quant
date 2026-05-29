import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, Download, ExternalLink, FileText, Loader2, Lock, Pencil, Trash2, Upload, XCircle } from "lucide-react";
import { authFetch, apiPath, authFetchJson } from "@/lib/token-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { useToast } from "@/hooks/use-toast";
import { downloadSecureUpload, filenameFromStoredUrl } from "@/lib/secure-upload";
import { cn } from "@/lib/utils";

type KycDocStatus = "pending" | "approved" | "rejected" | "superseded";

type KycDocument = {
  id: number;
  docType: string;
  label: string;
  fileUrl: string;
  originalFilename: string | null;
  status: KycDocStatus;
  supersedesId: number | null;
  rejectionReason: string | null;
  locked: boolean;
  createdAt: string;
};

type DocsResponse = {
  documents: KycDocument[];
  catalog: { key: string; label: string }[];
};

/** Local fallback so the picker always works even if the API omits the catalog. */
const FALLBACK_DOC_TYPES: { key: string; label: string }[] = [
  { key: "passport_photo", label: "Passport Size Photo" },
  { key: "id_document", label: "ID Document" },
  { key: "pan", label: "PAN Document" },
  { key: "aadhaar_front", label: "Aadhaar Front" },
  { key: "aadhaar_back", label: "Aadhaar Back" },
  { key: "passport_document", label: "Passport Document" },
  { key: "drivers_license", label: "Driver's License" },
  { key: "address_proof", label: "Address Proof" },
  { key: "selfie", label: "Selfie Verification" },
  { key: "signature", label: "Signature" },
  { key: "cancelled_cheque", label: "Cancelled Cheque / Bank Proof" },
];

const STATUS_META: Record<KycDocStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending review", className: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", icon: Clock },
  approved: { label: "Verified", className: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30", icon: XCircle },
  superseded: { label: "Replaced", className: "bg-muted text-muted-foreground border-border", icon: Clock },
};

export function KycDocumentManager() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addType, setAddType] = useState("");
  const [busyId, setBusyId] = useState<number | "new" | null>(null);
  const addFileRef = useRef<HTMLInputElement>(null);
  const updateRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["/api/kyc/documents"],
    queryFn: () => authFetchJson<DocsResponse>("/kyc/documents"),
  });

  const documents = (data?.documents || []).filter(d => d.status !== "superseded");
  const catalog = data?.catalog && data.catalog.length > 0 ? data.catalog : FALLBACK_DOC_TYPES;

  const refresh = () => qc.invalidateQueries({ queryKey: ["/api/kyc/documents"] });

  async function uploadNew(file: File) {
    if (!addType) {
      toast({ title: "Select a document type first", variant: "destructive" });
      return;
    }
    setBusyId("new");
    try {
      const fd = new FormData();
      fd.append("docType", addType);
      fd.append("file", file);
      const res = await authFetch(apiPath("/kyc/documents"), { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Upload failed");
      toast({ title: "Document uploaded", description: "Submitted for verification." });
      setAddType("");
      if (addFileRef.current) addFileRef.current.value = "";
      refresh();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function updateDoc(doc: KycDocument, file: File) {
    setBusyId(doc.id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await authFetch(apiPath(`/kyc/documents/${doc.id}`), { method: "PATCH", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Update failed");
      toast({ title: "Document updated", description: "Resubmitted for verification." });
      refresh();
    } catch (e) {
      toast({ title: "Update failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  /** Approved docs: upload a replacement (creates a pending version that needs our team's approval). */
  async function replaceApproved(doc: KycDocument, file: File) {
    setBusyId(doc.id);
    try {
      const fd = new FormData();
      fd.append("docType", doc.docType);
      fd.append("file", file);
      const res = await authFetch(apiPath("/kyc/documents"), { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Upload failed");
      toast({ title: "Replacement submitted", description: "Our team must approve it before the current document is replaced." });
      refresh();
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  async function removeDoc(doc: KycDocument) {
    setBusyId(doc.id);
    try {
      const res = await authFetch(apiPath(`/kyc/documents/${doc.id}`), { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Delete failed");
      toast({ title: "Document deleted" });
      refresh();
    } catch (e) {
      toast({ title: "Delete failed", description: e instanceof Error ? e.message : "Try again.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  }

  const pendingReplacementTypes = new Set(
    documents.filter(d => d.supersedesId != null && d.status === "pending").map(d => d.docType),
  );

  return (
    <div className="space-y-4">
      {/* Add / upload */}
      <div className="rounded-xl border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-3 sm:p-4 space-y-3">
        <Label className="text-sm font-semibold">Upload a document</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={addType} onValueChange={setAddType}>
            <SelectTrigger className="sm:w-64"><SelectValue placeholder="Choose document type" /></SelectTrigger>
            <SelectContent>
              {catalog.map(c => (
                <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input
            ref={addFileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) void uploadNew(f);
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!addType || busyId === "new"}
            onClick={() => addFileRef.current?.click()}
            className="border-amber-500/30 text-amber-700 dark:text-amber-400"
          >
            {busyId === "new" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
            Choose file & upload
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Images or PDF up to 10 MB. Uploading a document that's already verified submits a replacement for our team's approval.
        </p>
      </div>

      {/* Document list */}
      {isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : documents.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {documents.map(doc => {
            const meta = STATUS_META[doc.status];
            const StatusIcon = meta.icon;
            const busy = busyId === doc.id;
            const hasPendingReplacement = doc.status === "approved" && pendingReplacementTypes.has(doc.docType);
            return (
              <div key={doc.id} className="rounded-lg border border-border dark:border-white/10 bg-background/60 p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{doc.label}</p>
                      <p className="text-[11px] text-muted-foreground truncate" title={doc.originalFilename || filenameFromStoredUrl(doc.fileUrl)}>
                        {doc.originalFilename || filenameFromStoredUrl(doc.fileUrl)}
                      </p>
                    </div>
                  </div>
                  <Badge className={cn("gap-1 shrink-0", meta.className)}>
                    {doc.locked && <Lock className="h-3 w-3" />}
                    <StatusIcon className="h-3 w-3" />
                    {meta.label}
                  </Badge>
                </div>

                {doc.status === "rejected" && doc.rejectionReason && (
                  <p className="text-[11px] text-red-500">Reason: {doc.rejectionReason}</p>
                )}
                {hasPendingReplacement && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">A replacement is awaiting our team's approval.</p>
                )}

                <div className="flex flex-wrap items-center gap-1.5">
                  <SecureUploadLink
                    url={doc.fileUrl}
                    previewTitle={doc.label}
                    className="inline-flex items-center h-7 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent hover:text-accent-foreground"
                  >
                    View <ExternalLink className="h-3 w-3 ml-1" />
                  </SecureUploadLink>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-xs"
                    disabled={busy}
                    onClick={() => void downloadSecureUpload(doc.fileUrl, doc.originalFilename || filenameFromStoredUrl(doc.fileUrl))}
                  >
                    <Download className="h-3 w-3 mr-1" /> Download
                  </Button>

                  {/* Hidden per-row file input for update/replace */}
                  <input
                    ref={el => { updateRefs.current[doc.id] = el; }}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      if (doc.status === "approved") void replaceApproved(doc, f);
                      else void updateDoc(doc, f);
                      e.target.value = "";
                    }}
                  />

                  {doc.status === "approved" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-xs border-amber-500/30 text-amber-700 dark:text-amber-400"
                      disabled={busy || hasPendingReplacement}
                      onClick={() => updateRefs.current[doc.id]?.click()}
                    >
                      {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                      Replace (needs approval)
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        disabled={busy}
                        onClick={() => updateRefs.current[doc.id]?.click()}
                      >
                        {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Pencil className="h-3 w-3 mr-1" />}
                        Update
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs border-red-500/30 text-red-600 dark:text-red-400"
                        disabled={busy}
                        onClick={() => void removeDoc(doc)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" /> Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
