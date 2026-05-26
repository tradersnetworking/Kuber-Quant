import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SecureUploadPreviewDialog } from "@/components/SecureUploadPreviewDialog";

type SecureUploadLinkProps = {
  url: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  previewTitle?: string;
};

export function SecureUploadLink({ url, children, className, disabled, previewTitle }: SecureUploadLinkProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpen = () => {
    if (!url) {
      toast({ title: "No file", description: "No document was uploaded for this item.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setOpen(true);
    setLoading(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        disabled={disabled || loading}
        className={className}
      >
        {loading ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </span>
        ) : (
          children
        )}
      </button>
      <SecureUploadPreviewDialog
        open={open}
        onOpenChange={setOpen}
        url={open ? url : null}
        title={previewTitle}
      />
    </>
  );
}
