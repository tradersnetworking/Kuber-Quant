import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  /** Changes when a different document should load */
  documentKey: string | number | null;
  fetchBlob: () => Promise<Blob>;
  downloadFilename?: string;
  allowDownload?: boolean;
};

export function AgreementPdfViewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  documentKey,
  fetchBlob,
  downloadFilename,
  allowDownload = true,
}: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest fetcher in a ref so it isn't an effect dependency
  // (an inline arrow prop would otherwise re-run the effect on every render → reload loop).
  const fetchBlobRef = useRef(fetchBlob);
  fetchBlobRef.current = fetchBlob;

  useEffect(() => {
    if (!open) {
      setPdfUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetchBlobRef.current()
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err?.message || "Could not load agreement PDF");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, documentKey]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function handleDownload() {
    if (!pdfUrl || !downloadFilename) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = downloadFilename;
    a.click();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background border-border dark:border-white/10 max-w-4xl w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2 sm:px-6 border-b border-border/80 dark:border-white/10">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0">
              <DialogTitle className="text-base sm:text-lg truncate">{title}</DialogTitle>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
            </div>
            {pdfUrl && downloadFilename && allowDownload && (
              <Button size="sm" variant="outline" className="shrink-0" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="relative bg-muted/40 dark:bg-black/20 min-h-[50vh] max-h-[75vh]">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading agreement…
            </div>
          )}
          {error && !loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-red-400">{error}</p>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-3.5 w-3.5 mr-1.5" /> Close
              </Button>
            </div>
          )}
          {pdfUrl && !loading && (
            <iframe
              src={pdfUrl}
              title={title}
              className="w-full h-[min(75vh,720px)] border-0 bg-white dark:bg-zinc-900"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
