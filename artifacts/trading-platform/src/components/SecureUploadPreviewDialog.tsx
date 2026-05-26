import { useEffect, useState } from "react";
import { Loader2, Download, ExternalLink } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fetchSecureUpload, openSecureUploadInTab } from "@/lib/secure-upload";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string | null;
  title?: string;
};

export function SecureUploadPreviewDialog({ open, onOpenChange, url, title = "Document preview" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ blobUrl: string; mimeType: string; filename: string } | null>(null);

  useEffect(() => {
    if (!open || !url) {
      setPreview(prev => {
        if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
        return null;
      });
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSecureUpload(url)
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
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load file");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, url]);

  useEffect(() => () => {
    setPreview(prev => {
      if (prev?.blobUrl) URL.revokeObjectURL(prev.blobUrl);
      return null;
    });
  }, []);

  const isImage = preview?.mimeType.startsWith("image/");
  const isPdf = preview?.mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-950 border-white/10 max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {preview?.filename || "Payment proof / uploaded document"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-[240px] flex items-center justify-center overflow-auto rounded-lg border border-white/10 bg-black/40">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground py-16">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <p className="text-sm">Loading document…</p>
            </div>
          )}
          {!loading && error && (
            <p className="text-sm text-red-400 px-4 text-center">{error}</p>
          )}
          {!loading && !error && preview && isImage && (
            <img
              src={preview.blobUrl}
              alt={preview.filename}
              className="max-h-[60vh] max-w-full object-contain"
            />
          )}
          {!loading && !error && preview && isPdf && (
            <iframe
              src={preview.blobUrl}
              title={preview.filename}
              className="w-full h-[60vh] min-h-[320px] bg-white rounded"
            />
          )}
          {!loading && !error && preview && !isImage && !isPdf && (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-sm text-muted-foreground">Preview not available for this file type.</p>
              <Button variant="outline" size="sm" onClick={() => openSecureUploadInTab(url!)}>
                <Download className="h-4 w-4 mr-1" /> Download file
              </Button>
            </div>
          )}
        </div>

        {preview && !loading && !error && (
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => url && openSecureUploadInTab(url)}
            >
              <ExternalLink className="h-4 w-4 mr-1" /> Open in new tab
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
