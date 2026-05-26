import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function CopyCredentialButton({ text, className }: { text: string; className?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ title: "Copied", description: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy failed", variant: "destructive" });
    }
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={`h-7 w-7 shrink-0 ${className || ""}`}
      onClick={copy}
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
