import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShieldCheck, Eye, ShieldAlert } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";

type KycRow = {
  id: number;
  userId: number;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  idType?: string;
  idNumber?: string;
  country?: string;
  status: string;
  createdAt: string;
};

export default function SupportKycPage() {
  const [status, setStatus] = useState("all");
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: records, isLoading } = useQuery({
    queryKey: ["/api/support-team/kyc", status],
    queryFn: () => staffFetch<KycRow[]>(`/support-team/kyc?status=${encodeURIComponent(status)}`),
  });

  const rows = records ?? [];

  const openDetails = (userId: number) => {
    setDetailUserId(userId);
    setDetailOpen(true);
  };

  const kycColumns: ResponsiveColumn<KycRow>[] = [
    {
      key: "user",
      header: "User",
      mobileTitle: true,
      cell: (r) => (
        <>
          <p className="font-medium">{r.userName || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{r.userEmail}</p>
        </>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (r) => (
        <Badge variant="outline" className="capitalize">{r.userRole || "user"}</Badge>
      ),
    },
    {
      key: "idType",
      header: "ID Type",
      cell: (r) => (
        <span className="capitalize text-sm">{(r.idType || "—").replace("_", " ")}</span>
      ),
    },
    {
      key: "country",
      header: "Country",
      cell: (r) => r.country || "—",
    },
    {
      key: "submitted",
      header: "Submitted",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {r.createdAt ? format(new Date(r.createdAt), "MMM d, yyyy") : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className="capitalize">{r.status}</Badge>
      ),
    },
    {
      key: "view",
      header: "View",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (r) =>
        r.userId ? (
          <Button size="sm" variant="outline" onClick={() => openDetails(r.userId)}>
            <Eye className="h-4 w-4 mr-1" />Details
          </Button>
        ) : null,
    },
  ];

  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="page-title flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 dark:text-teal-400 shrink-0" />
          KYC Records
        </h1>
        <p className="page-subtitle">
          Read-only view of investor and manager KYC submissions, identity documents, and verification status.
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>Support cannot approve or reject KYC. Open full details to review documents, then escalate to Super Admin if action is needed.</p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3 max-w-xs">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-muted/60 dark:bg-white/5">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className={STAFF_CARD}>
        <CardHeader><CardTitle className="text-base">KYC Queue</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : rows.length ? (
            <ResponsiveDataView
              className={STAFF_TABLE_WRAP}
              columns={kycColumns}
              data={rows}
              rowKey={(r) => r.id}
              mobileFooter={(r) =>
                r.userId ? (
                  <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => openDetails(r.userId)}
                    >
                      <Eye className="h-4 w-4 mr-1" />Details
                    </Button>
                  </div>
                ) : null
              }
            />
          ) : (
            <div className="text-center text-muted-foreground py-8">No KYC records found.</div>
          )}
        </CardContent>
      </Card>

      <UserFullDetailSheet
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        apiBase="/support-team"
        readOnly
      />
    </div>
  );
}
