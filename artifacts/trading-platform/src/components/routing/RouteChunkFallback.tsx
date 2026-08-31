import { Loader2 } from "lucide-react";

/** Minimal fallback while lazy route chunks load (dashboard pages only). */
export function RouteChunkFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-label="Loading" />
    </div>
  );
}
