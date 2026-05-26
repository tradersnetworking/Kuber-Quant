import { ExternalLink, FileText } from "lucide-react";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { KYC_DOCUMENT_FIELDS, type KycDocumentRecord } from "@/lib/kyc-document-fields";

type Props = {
  kyc: KycDocumentRecord | null | undefined;
  /** When true, show every document slot (uploaded or not). */
  showMissing?: boolean;
  compact?: boolean;
};

export function KycDocumentsList({ kyc, showMissing = false, compact }: Props) {
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
    <div className={`rounded-lg border border-white/10 bg-white/[0.02] divide-y divide-white/5 ${compact ? "text-xs" : "text-sm"}`}>
      {rows.map(row => (
        <div key={row.key} className={`flex items-center justify-between gap-3 ${compact ? "px-3 py-2" : "px-3 py-2.5"}`}>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground truncate">{row.label}</span>
          </div>
          {row.url ? (
            <SecureUploadLink
              url={row.url}
              previewTitle={row.label}
              className="inline-flex items-center h-7 px-3 rounded-md border border-input bg-background text-xs hover:bg-accent hover:text-accent-foreground shrink-0"
            >
              View <ExternalLink className="h-3 w-3 ml-1" />
            </SecureUploadLink>
          ) : (
            <span className="text-xs text-muted-foreground italic shrink-0">Not uploaded</span>
          )}
        </div>
      ))}
    </div>
  );
}
