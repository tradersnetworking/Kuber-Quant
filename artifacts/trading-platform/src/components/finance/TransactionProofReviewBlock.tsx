import { useEffect, useState } from "react";
import { Loader2, FileImage, AlertCircle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SecureUploadLink } from "@/components/SecureUploadLink";
import { fetchSecureUpload } from "@/lib/secure-upload";
import { cn } from "@/lib/utils";

export type TransactionProofFields = {
  id?: number;
  type: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string | null;
  gatewayProvider?: string | null;
  utrReference?: string | null;
  txHash?: string | null;
  proofUrl?: string | null;
  notes?: string | null;
};

function isOnlineGateway(tx: TransactionProofFields): boolean {
  const provider = (tx.gatewayProvider || "").toLowerCase();
  const method = (tx.paymentMethod || "").toLowerCase();
  if (provider && provider !== "manual") return true;
  return ["razorpay", "payu", "phonepe", "stripe", "paypal", "cashfree", "easebuzz", "instamojo", "crypto"].some(g =>
    provider.includes(g) || method.includes(g),
  );
}

function InlineProofPreview({ proofUrl }: { proofUrl: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ blobUrl: string; mimeType: string; filename: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSecureUpload(proofUrl)
      .then(data => {
        if (cancelled) {
          URL.revokeObjectURL(data.blobUrl);
          return;
        }
        setPreview(prev => {
          if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
          return data;
        });
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load proof");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [proofUrl]);

  useEffect(() => () => {
    setPreview(prev => {
      if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-amber-500" />
        <span className="text-sm">Loading payment proof…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p>{error}</p>
          <SecureUploadLink url={proofUrl} className="text-amber-600 dark:text-amber-400 underline mt-1 inline-block">
            Retry in full viewer
          </SecureUploadLink>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  const isImage = preview.mimeType.startsWith("image/");
  const isPdf = preview.mimeType === "application/pdf";

  return (
    <div className="space-y-2">
      <div className="rounded-lg border border-amber-500/25 bg-black/20 overflow-hidden flex items-center justify-center min-h-[160px] max-h-[320px]">
        {isImage && (
          <img src={preview.blobUrl} alt={preview.filename} className="max-h-[300px] max-w-full object-contain" />
        )}
        {isPdf && (
          <iframe src={preview.blobUrl} title={preview.filename} className="w-full h-[280px] bg-white" />
        )}
        {!isImage && !isPdf && (
          <div className="py-8 text-center text-sm text-muted-foreground px-4">
            <FileImage className="h-8 w-8 mx-auto mb-2 opacity-50" />
            Preview unavailable — open the file below.
          </div>
        )}
      </div>
      <SecureUploadLink
        url={proofUrl}
        previewTitle="Payment proof"
        className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
      >
        Open full-size proof ({preview.filename})
      </SecureUploadLink>
    </div>
  );
}

export function TransactionProofReviewBlock({
  tx,
  showInlinePreview = true,
  className,
}: {
  tx: TransactionProofFields;
  showInlinePreview?: boolean;
  className?: string;
}) {
  if (tx.type !== "deposit") return null;

  const gateway = isOnlineGateway(tx);
  const hasProof = Boolean(tx.proofUrl?.trim());
  const hasUtr = Boolean(tx.utrReference?.trim());

  return (
    <div className={cn("rounded-xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-emerald-500/5 p-3 sm:p-4 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Deposit verification</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review UTR/reference and uploaded proof before approving.
          </p>
        </div>
        {gateway && (
          <Badge variant="outline" className="shrink-0 border-violet-500/40 text-violet-700 dark:text-violet-300 capitalize">
            <CreditCard className="h-3 w-3 mr-1" />
            {tx.gatewayProvider || "Gateway"}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/50 dark:bg-white/5 p-2.5">
          <p className="text-[10px] uppercase text-muted-foreground">Payment method</p>
          <p className="font-medium capitalize mt-0.5">{tx.paymentMethod || tx.gatewayProvider || "Manual"}</p>
        </div>
        {tx.amount != null && tx.currency && (
          <div className="rounded-lg bg-muted/50 dark:bg-white/5 p-2.5">
            <p className="text-[10px] uppercase text-muted-foreground">Amount</p>
            <p className="font-medium mt-0.5">{tx.amount.toLocaleString()} {tx.currency}</p>
          </div>
        )}
        {hasUtr && (
          <div className="rounded-lg bg-muted/50 dark:bg-white/5 p-2.5 sm:col-span-2">
            <p className="text-[10px] uppercase text-muted-foreground">UTR / Reference</p>
            <p className="font-mono font-medium mt-0.5 break-all">{tx.utrReference}</p>
          </div>
        )}
        {tx.txHash && (
          <div className="rounded-lg bg-muted/50 dark:bg-white/5 p-2.5 sm:col-span-2">
            <p className="text-[10px] uppercase text-muted-foreground">Transaction hash</p>
            <p className="font-mono text-[11px] mt-0.5 break-all">{tx.txHash}</p>
          </div>
        )}
      </div>

      {hasProof ? (
        showInlinePreview ? (
          <InlineProofPreview proofUrl={tx.proofUrl!} />
        ) : (
          <SecureUploadLink url={tx.proofUrl!} previewTitle="Payment proof" className="text-sm text-amber-600 dark:text-amber-400 underline">
            View uploaded payment proof
          </SecureUploadLink>
        )
      ) : gateway ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-violet-500/20 bg-violet-500/5 p-2.5">
          Online gateway deposit — verify payment status in the gateway dashboard. No manual proof upload for this transaction.
        </p>
      ) : (
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>No payment proof uploaded{hasUtr ? " — verify UTR/reference with bank records before approving." : ". Consider rejecting or requesting proof from the user."}</p>
        </div>
      )}

      {tx.notes && (
        <p className="text-[11px] text-muted-foreground border-t border-border/60 pt-2 line-clamp-3">{tx.notes}</p>
      )}
    </div>
  );
}

/** Compact proof link for table rows and mobile cards. */
export function TransactionProofLink({ tx }: { tx: TransactionProofFields }) {
  if (tx.type !== "deposit") return null;
  if (tx.proofUrl) {
    return (
      <SecureUploadLink url={tx.proofUrl} previewTitle="Payment proof" className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-medium">
        View proof
      </SecureUploadLink>
    );
  }
  if (tx.utrReference) {
    return <span className="text-xs text-muted-foreground font-mono">UTR: {tx.utrReference}</span>;
  }
  if (isOnlineGateway(tx)) {
    return <span className="text-xs text-violet-600 dark:text-violet-400">Gateway payment</span>;
  }
  return <span className="text-xs text-amber-600/80">No proof</span>;
}
