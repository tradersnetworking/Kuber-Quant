import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, X, Loader2 } from "lucide-react";
import { authFetch } from "@/lib/token-store";
import { apiPath } from "@/lib/token-store";
import { cn } from "@/lib/utils";

export interface MailAttachment {
  id: number;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

type Props = {
  apiBase: string;
  attachments: MailAttachment[];
  onChange: (attachments: MailAttachment[]) => void;
  disabled?: boolean;
  className?: string;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MailAttachmentPicker({ apiBase, attachments, onChange, disabled, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length || disabled) return;
    if (attachments.length + files.length > 5) {
      setError("Maximum 5 attachments per email");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      Array.from(files).forEach(file => form.append("files", file));

      const res = await authFetch(apiPath(`${apiBase}/attachments`), {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string }).error || `Upload failed (${res.status})`);
      }

      onChange([...attachments, ...(data as MailAttachment[])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="hidden"
          disabled={disabled || uploading || attachments.length >= 5}
          onChange={e => uploadFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading || attachments.length >= 5}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Paperclip className="h-4 w-4 mr-1" />}
          Attach files
        </Button>
        <span className="text-xs text-muted-foreground">PDF, JPG, PNG, WEBP · up to 10 MB each · max 5</span>
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map(att => (
            <li key={att.id} className="flex items-center justify-between gap-2 rounded-md border border-border dark:border-white/10 px-2 py-1.5 text-xs">
              <span className="truncate">{att.filename} · {formatBytes(att.sizeBytes)}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                disabled={disabled}
                onClick={() => onChange(attachments.filter(a => a.id !== att.id))}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
