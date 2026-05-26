import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE } from "@/lib/onboarding/constants";

type Props = {
  label: string;
  value?: File;
  onChange: (file?: File) => void;
  hint?: string;
  required?: boolean;
  error?: string;
};

async function isBlurry(_file: File): Promise<boolean> {
  return false;
}

export function FileUploadField({ label, value, onChange, hint, required, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(async (file?: File) => {
    setLocalError(null);
    if (!file) {
      onChange(undefined);
      setPreview(null);
      return;
    }
    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      setLocalError("Invalid file type. Use JPEG, PNG, WebP, or PDF.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setLocalError("File exceeds 10MB limit.");
      return;
    }
    if (file.type.startsWith("image/")) {
      const blurry = await isBlurry(file);
      if (blurry) setLocalError("Image appears blurry. Please upload a clearer photo.");
    }
    onChange(file);
    if (file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [onChange]);

  const displayError = error || localError;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}{required && " *"}
        </label>
        {value && (
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleFile(undefined)}>
            <X className="h-3 w-3 mr-1" /> Remove
          </Button>
        )}
      </div>
      <div
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === "Enter" && inputRef.current?.click()}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors hover:border-primary/50 ${displayError ? "border-destructive/50" : "border-border"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FILE_TYPES.join(",")}
          className="hidden"
          onChange={e => handleFile(e.target.files?.[0])}
        />
        {preview ? (
          <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-lg object-contain" />
        ) : value ? (
          <div className="flex items-center justify-center gap-2 text-sm">
            <FileText className="h-5 w-5 text-primary" />
            <span>{value.name}</span>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Click to upload or drag & drop</p>
            <p className="text-xs text-muted-foreground mt-1">Max 10MB · JPEG, PNG, WebP, PDF</p>
          </>
        )}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {displayError && (
        <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{displayError}</p>
      )}
    </div>
  );
}
