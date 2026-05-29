import { useState } from "react";
import { Download, ExternalLink, FileText, Loader2, Lock } from "lucide-react";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { downloadSecureUpload, filenameFromStoredUrl } from "@/lib/secure-upload";
import { KYC_DOCUMENT_FIELDS, type KycDocumentRecord } from "@/lib/kyc-document-fields";

type Props = {
  kyc: KycDocumentRecord | null | undefined;
  /** When true, show every document slot (uploaded or not). */
  showMissing?: boolean;
  compact?: boolean;
  /** When true, documents are approved and locked from edit/delete until re-approval. */
  locked?: boolean;
};

function DownloadDocButton({ url, label, compact }: { url: string; label: string; compact?: boolean }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`shrink-0 ${compact ? "h-7 px-2.5 text-xs" : "h-7 px-3 text-xs"}`}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await downloadSecureUpload(url, filenameFromStoredUrl(url));
        } catch (e) {
          toast({
            title: "Download failed",
            description: e instanceof Error ? e.message : `Could not download ${label}.`,
            variant: "destructive",
          });
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Download className="h-3 w-3 sm:mr-1" /><span className="hidden sm:inline">Download</span></>}
    </Button>
  );
}

export function KycDocumentsList({ kyc, showMissing = false, compact, locked = false }: Props) {
  const rows = showMissing
    ? KYC_DOCUMENT_FIELDS.map(f => ({
        key: f.key,
        label: f.label,
        url: (kyc?.[f.key as keyof KycDocumentRecord] as string | null) || null,
      }))
    : KYC_DOCUMENT_FIELDS.filter(f => {
        const url = kyc?.[f.key as keyof KycDocumentRecord];
        return typeof url === "string" && url.length > 0;
      }).map(f => ({
        key: f.key,
        label: f.label,
        url: kyc![f.key as keyof KycDocumentRecord] as string,
      }));

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No documents uploaded yet.</p>;
  }

  return (
    <div className={`rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] divide-y divide-border/60 dark:divide-white/5 ${compact ? "text-xs" : "text-sm"}`}>
      {rows.map(row => (
        <div key={row.key} className={`flex items-center justify-between gap-3 ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-foreground/90 truncate font-medium">{row.label}</p>
              {row.url ? (
                <p className="text-[11px] text-muted-foreground truncate" title={filenameFromStoredUrl(row.url)}>
                  {filenameFromStoredUrl(row.url)}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">Not uploaded</p>
              )}
            </div>
          </div>
          {row.url && (
            <div className="flex items-center gap-1.5 shrink-0">
              {locked && <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-label="Locked — approved" />}
              <SecureUploadLink
                url={row.url}
                previewTitle={row.label}
                className="inline-flex items-center h-7 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent hover:text-accent-foreground shrink-0"
              >
                View <ExternalLink className="h-3 w-3 ml-1" />
              </SecureUploadLink>
              <DownloadDocButton url={row.url} label={row.label} compact={compact} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
