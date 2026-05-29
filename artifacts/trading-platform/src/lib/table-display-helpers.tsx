import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function kycStatusBadgeClass(status?: string | null) {
  if (status === "verified") return "bg-green-500/10 text-green-500 border-green-500/20";
  if (status === "pending" || status === "submitted") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export function KycStatusBadge({ status }: { status?: string | null }) {
  return (
    <Badge variant="outline" className={cn("capitalize", kycStatusBadgeClass(status))}>
      {(status || "unsubmitted").toUpperCase()}
    </Badge>
  );
}

export function txnStatusBadgeClass(status?: string) {
  if (status === "approved") return "bg-green-500/10 text-green-500 border-green-500/20";
  if (status === "pending") return "bg-amber-500/10 text-amber-500 border-amber-500/20";
  return "bg-red-500/10 text-red-500 border-red-500/20";
}

export function TxnStatusBadge({ status }: { status?: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize", txnStatusBadgeClass(status))}>
      {(status || "unknown").toUpperCase()}
    </Badge>
  );
}

export const fmtUsd = (n?: number) =>
  n != null ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 0 })}` : "—";
