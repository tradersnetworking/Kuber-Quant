import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  size?: "sm" | "default" | "icon";
  variant?: "outline" | "ghost" | "default";
  label?: string;
  compact?: boolean;
};

/** Refreshes all React Query caches and reloads if the page appears stuck. */
export function PageRefreshButton({
  className,
  size = "sm",
  variant = "outline",
  label = "Refresh",
  compact = false,
}: Props) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
      toast({ title: "Page refreshed", description: "Latest data loaded." });
    } catch {
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn("shrink-0", className)}
      onClick={() => void refresh()}
      disabled={busy}
      title={label}
      aria-label={label}
    >
      <RefreshCw className={cn("h-4 w-4", busy && "animate-spin", !compact && "mr-1.5")} />
      {!compact && size !== "icon" && (busy ? "Refreshing…" : label)}
    </Button>
  );
}
