import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Users2, Eye, ShieldAlert } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { StaffReportDialog } from "@/components/staff/StaffReportDialog";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { KycStatusBadge, fmtUsd } from "@/lib/table-display-helpers";

type ManagerRow = {
  id: number;
  fullName: string;
  email: string;
  kycStatus: string;
  createdAt: string;
  clientCount: number;
};

type ClientRow = {
  id: number;
  fullName: string;
  email: string;
  kycStatus: string;
  balanceFiat: number;
  totalDeposits?: number;
  totalWithdrawals?: number;
};

export default function SupportManagersPage() {
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(null);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: managers, isLoading } = useQuery({
    queryKey: ["/api/support-team/managers"],
    queryFn: () => staffFetch<ManagerRow[]>("/support-team/managers"),
  });

  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["/api/support-team/managers/clients", selectedManagerId],
    queryFn: () => staffFetch<ClientRow[]>(`/support-team/managers/${selectedManagerId}/clients`),
    enabled: !!selectedManagerId,
  });

  const selectedManager = managers?.find(m => m.id === selectedManagerId);
  const managerRows = managers ?? [];
  const clientRows = clients ?? [];

  const openDetails = (userId: number) => {
    setDetailUserId(userId);
    setDetailOpen(true);
  };

  const managerColumns: ResponsiveColumn<ManagerRow>[] = [
    {
      key: "manager",
      header: "Manager",
      mobileTitle: true,
      cell: (m) => (
        <>
          <p className="font-medium">{m.fullName}</p>
          <p className="text-xs text-muted-foreground">{m.email}</p>
        </>
      ),
    },
    {
      key: "clients",
      header: "Clients",
      cell: (m) => <Badge variant="outline">{m.clientCount} clients</Badge>,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (m) => (
        <span className="text-sm text-muted-foreground">{format(new Date(m.createdAt), "MMM d, yyyy")}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (m) => (
        <div className="space-x-1">
          <Button size="sm" variant="outline" onClick={() => setSelectedManagerId(m.id)}>View clients</Button>
          <Button size="sm" variant="ghost" onClick={() => openDetails(m.id)}>
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const clientColumns: ResponsiveColumn<ClientRow>[] = [
    {
      key: "client",
      header: "Client",
      mobileTitle: true,
      cell: (c) => (
        <>
          <p className="font-medium">{c.fullName}</p>
          <p className="text-xs text-muted-foreground">{c.email}</p>
        </>
      ),
    },
    {
      key: "balance",
      header: "Balance",
      cell: (c) => (
        <span className="text-emerald-600 dark:text-emerald-400">{fmtUsd(c.balanceFiat)}</span>
      ),
    },
    {
      key: "deposits",
      header: "Deposits",
      cell: (c) => fmtUsd(c.totalDeposits),
    },
    {
      key: "withdrawals",
      header: "Withdrawals",
      cell: (c) => fmtUsd(c.totalWithdrawals),
    },
    {
      key: "kyc",
      header: "KYC",
      cell: (c) => <KycStatusBadge status={c.kycStatus} />,
    },
    {
      key: "details",
      header: "Details",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (c) => (
        <Button size="sm" variant="outline" onClick={() => openDetails(c.id)}>
          <Eye className="h-4 w-4 mr-1" />View
        </Button>
      ),
    },
  ];

  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Users2 className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-600 dark:text-cyan-400 shrink-0" />
          Managers
        </h1>
        <p className="page-subtitle">
          View all platform managers and their assigned clients — KYC, wallet balances, and account details (read-only).
        </p>
      </div>

      <Card className="border-amber-500/25 bg-amber-500/5">
        <CardContent className="pt-4 text-sm text-muted-foreground flex items-start gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p>Support can view manager and client data only. Use <strong className="text-foreground">Report to Super Admin</strong> for account changes.</p>
        </CardContent>
      </Card>

      <Card className={STAFF_CARD}>
        <CardHeader><CardTitle className="text-base">All Managers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : managerRows.length ? (
            <ResponsiveDataView
              className={STAFF_TABLE_WRAP}
              columns={managerColumns}
              data={managerRows}
              rowKey={(m) => m.id}
              mobileFooter={(m) => (
                <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="flex-1 sm:flex-none" onClick={() => setSelectedManagerId(m.id)}>
                    View clients
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openDetails(m.id)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              )}
            />
          ) : (
            <div className="text-center text-muted-foreground py-8">No managers found.</div>
          )}
        </CardContent>
      </Card>

      {selectedManagerId && selectedManager && (
        <Card className={STAFF_CARD}>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="text-base">Clients of {selectedManager.fullName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setSelectedManagerId(null)}>Close</Button>
          </CardHeader>
          <CardContent>
            {clientsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : !clientRows.length ? (
              <p className="text-sm text-muted-foreground">No clients assigned to this manager.</p>
            ) : (
              <ResponsiveDataView
                className={STAFF_TABLE_WRAP}
                columns={clientColumns}
                data={clientRows}
                rowKey={(c) => c.id}
                mobileFooter={(c) => (
                  <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openDetails(c.id)}>
                      <Eye className="h-4 w-4 mr-1" />View
                    </Button>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      )}

      {detailUserId && (
        <div className="flex justify-end">
          <StaffReportDialog
            role="support"
            subjectUserId={detailUserId}
            subjectUserName={selectedManager?.fullName}
          />
        </div>
      )}

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
