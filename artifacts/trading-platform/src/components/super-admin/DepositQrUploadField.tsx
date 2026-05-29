import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getStoredToken, apiPath } from "@/lib/token-store";
import { Upload, X, Loader2 } from "lucide-react";

type DepositQrUploadFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  fallbackPreview?: string;
  inputId: string;
};

export function DepositQrUploadField({
  label,
  hint,
  value,
  onChange,
  fallbackPreview,
  inputId,
}: DepositQrUploadFieldProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const token = getStoredToken();
      const res = await fetch(apiPath("/admin/upload/qr-code"), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      onChange(data.url);
      toast({ title: "QR code uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const previewSrc = value || fallbackPreview;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {previewSrc && (
        <div className="flex items-start gap-3 p-3 rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20">
          <img
            src={previewSrc}
            alt="QR preview"
            className="h-28 w-28 object-contain rounded border border-border dark:border-white/10 bg-white p-1"
          />
          <div className="space-y-2">
            {value ? (
              <Button type="button" variant="ghost" size="sm" className="text-red-400 h-8" onClick={() => onChange("")}>
                <X className="h-4 w-4 mr-1" /> Remove uploaded QR
              </Button>
            ) : (
              <p className="text-[10px] text-muted-foreground max-w-[180px]">
                Live preview from UPI ID / wallet address. Saved accounts store an auto-generated QR on the server.
              </p>
            )}
          </div>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <Label htmlFor={inputId} className="cursor-pointer">
          <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-sm">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload QR image"}
          </span>
        </Label>
        <Input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={upload}
          disabled={uploading}
        />
      </div>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Or paste QR image URL (optional)"
        className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-xs"
      />
    </div>
  );
}
