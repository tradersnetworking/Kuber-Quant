import { useListManagerKyc, KycRecord } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { KycStatusBadge } from "@/lib/table-display-helpers";

type KycRow = KycRecord & { userName?: string; userEmail?: string; userId?: number };

const kycColumns: ResponsiveColumn<KycRow>[] = [
  {
    key: "client",
    header: "Client",
    mobileTitle: true,
    cell: (record) => (
      <>
        <p className="font-medium text-foreground">{record.userName || "Unknown Client"}</p>
        <p className="text-xs text-muted-foreground">{record.userEmail}</p>
      </>
    ),
  },
  {
    key: "idType",
    header: "ID Type",
    cell: (record) => (
      <span className="capitalize text-muted-foreground">{(record.idType ?? "").replace("_", " ") || "N/A"}</span>
    ),
  },
  {
    key: "idNumber",
    header: "ID Number",
    cell: (record) => (
      <span className="text-muted-foreground font-mono text-sm">{record.idNumber || "—"}</span>
    ),
  },
  {
    key: "country",
    header: "Country",
    cell: (record) => (
      <span className="text-muted-foreground">{(record as KycRow & { country?: string }).country || "—"}</span>
    ),
  },
  {
    key: "submittedAt",
    header: "Submitted At",
    cell: (record) => (
      <span className="text-muted-foreground">
        {record.createdAt ? format(new Date(record.createdAt), "MMM d, yyyy") : "N/A"}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (record) => <KycStatusBadge status={record.status} />,
  },
  {
    key: "actions",
    header: "Actions",
    headerClassName: "text-right",
    cellClassName: "text-right",
    hideOnMobile: true,
    cell: (record) =>
      record.userId ? (
        <Link href={`/manager/clients/${record.userId}`}>
          <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
            View Details
          </span>
        </Link>
      ) : (
        "—"
      ),
  },
];

export default function ManagerKyc() {
  const { data: kycRecords, isLoading } = useListManagerKyc();
  const rows = (kycRecords as KycRow[]) ?? [];

  return (
    <div className={STAFF_PAGE_STACK}>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">KYC Queue</h1>
          <p className="page-subtitle">View KYC applications and identity documents for your assigned clients (read-only). Report approval issues to Super Admin.</p>
        </div>

        <Card className={STAFF_CARD}>
          <CardHeader>
            <CardTitle>Client KYC Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : kycRecords?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No KYC applications from your clients.
              </div>
            ) : (
              <ResponsiveDataView
                className={STAFF_TABLE_WRAP}
                columns={kycColumns}
                data={rows}
                rowKey={(record) => record.id}
                rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 transition-colors"
                mobileFooter={(record) =>
                  record.userId ? (
                    <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                      <Link href={`/manager/clients/${record.userId}`}>
                        <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                          View Details
                        </span>
                      </Link>
                    </div>
                  ) : null
                }
              />
            )}
          </CardContent>
        </Card>
      </div>
);
}
