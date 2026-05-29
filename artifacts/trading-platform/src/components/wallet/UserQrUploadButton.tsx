import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStoredToken, apiPath } from "@/lib/token-store";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";

type Props = {
  onUploaded: (url: string) => void;
  disabled?: boolean;
  label?: string;
  uploadPath?: string;
};

export function UserQrUploadButton({
  onUploaded,
  disabled,
  label = "Upload QR code",
  uploadPath = "/wallet/payment-accounts/upload/upi-qr",
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const token = getStoredToken();
      const res = await fetch(apiPath(uploadPath.startsWith("/") ? uploadPath : `/${uploadPath}`), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
      toast({ title: "QR code uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="wrap"
        disabled={disabled || uploading}
        className={cn("border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 max-w-full", mobileBtnWrap)}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Upload className="h-4 w-4 shrink-0" />}
        <span className="min-w-0">{uploading ? "Uploading…" : label}</span>
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={upload}
        disabled={disabled || uploading}
      />
    </>
  );
}
