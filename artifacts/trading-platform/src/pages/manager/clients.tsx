import { useListManagerClients, User } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { KycStatusBadge, fmtUsd } from "@/lib/table-display-helpers";

type ClientRow = User & {
  totalDeposits?: number;
  totalWithdrawals?: number;
  totalProfit?: number;
  balanceFiat?: number;
};

const clientColumns: ResponsiveColumn<ClientRow>[] = [
  {
    key: "client",
    header: "Client",
    mobileTitle: true,
    cell: (client) => (
      <>
        <p className="font-medium text-foreground">{client.fullName}</p>
        <p className="text-xs text-muted-foreground">{client.email}</p>
      </>
    ),
  },
  {
    key: "balance",
    header: "Balance",
    cell: (client) => (
      <span className="text-emerald-600 dark:text-emerald-400 font-medium">{fmtUsd(client.balanceFiat)}</span>
    ),
  },
  {
    key: "deposits",
    header: "Deposits",
    cell: (client) => (
      <span className="text-green-700 dark:text-green-400">{fmtUsd(client.totalDeposits)}</span>
    ),
  },
  {
    key: "withdrawals",
    header: "Withdrawals",
    cell: (client) => (
      <span className="text-red-400">{fmtUsd(client.totalWithdrawals)}</span>
    ),
  },
  {
    key: "profit",
    header: "Profit",
    cell: (client) => (
      <span className="text-amber-600 dark:text-amber-400">{fmtUsd(client.totalProfit)}</span>
    ),
  },
  {
    key: "kyc",
    header: "KYC",
    cell: (client) => <KycStatusBadge status={client.kycStatus} />,
  },
  {
    key: "actions",
    header: "Actions",
    headerClassName: "text-right",
    cellClassName: "text-right",
    hideOnMobile: true,
    cell: (client) => (
      <Link href={`/manager/clients/${client.id}`}>
        <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
          View Details
        </span>
      </Link>
    ),
  },
];

export default function ManagerClients() {
  const { data: clients, isLoading } = useListManagerClients();
  const rows = (clients as ClientRow[]) ?? [];

  return (
    <div className={STAFF_PAGE_STACK}>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">My Clients</h1>
          <p className="page-subtitle">Monitor earnings, deposits, withdrawals, and KYC for your assigned clients.</p>
        </div>

        <Card className={STAFF_CARD}>
          <CardHeader>
            <CardTitle>Client List</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : clients?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No clients assigned to you yet.
              </div>
            ) : (
              <ResponsiveDataView
                className={STAFF_TABLE_WRAP}
                columns={clientColumns}
                data={rows}
                rowKey={(client) => client.id}
                rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5 transition-colors"
                mobileFooter={(client) => (
                  <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                    <Link href={`/manager/clients/${client.id}`}>
                      <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                        View Details
                      </span>
                    </Link>
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>
);
}
