import { useListManagerTransactions, Transaction } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { financeQueryOptions } from "@/lib/invalidate-finance-queries";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";
import { TxnStatusBadge } from "@/lib/table-display-helpers";

type TxRow = Transaction & { userName?: string; userEmail?: string; userId?: number };

const transactionColumns: ResponsiveColumn<TxRow>[] = [
  {
    key: "client",
    header: "Client",
    mobileTitle: true,
    cell: (tx) => (
      <>
        <p className="font-medium text-foreground">{tx.userName || "Unknown Client"}</p>
        <p className="text-xs text-muted-foreground">{tx.userEmail}</p>
      </>
    ),
  },
  {
    key: "type",
    header: "Type",
    cell: (tx) => (
      <div className="flex items-center gap-2">
        {tx.type === "deposit" ? (
          <ArrowDownLeft className="h-4 w-4 text-green-500" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        )}
        <span className="capitalize text-muted-foreground">{tx.type}</span>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    cell: (tx) => (
      <span className="font-medium text-foreground">
        {tx.currency} {tx.amount.toLocaleString()}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (tx) => <TxnStatusBadge status={tx.status} />,
  },
  {
    key: "date",
    header: "Date",
    cell: (tx) => (
      <span className="text-muted-foreground">
        {tx.createdAt ? format(new Date(tx.createdAt), "MMM d, HH:mm") : "N/A"}
      </span>
    ),
  },
  {
    key: "actions",
    header: "Actions",
    headerClassName: "text-right",
    cellClassName: "text-right",
    hideOnMobile: true,
    cell: (tx) =>
      tx.userId ? (
        <Link href={`/manager/clients/${tx.userId}`}>
          <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
            View Client
          </span>
        </Link>
      ) : (
        <span className="text-xs font-mono text-muted-foreground">#{String(tx.id).padStart(6, "0")}</span>
      ),
  },
];

export default function ManagerTransactions() {
  const { data: transactions, isLoading } = useListManagerTransactions({
    query: financeQueryOptions as any,
  });
  const rows = (transactions as TxRow[]) ?? [];

  return (
    <div className={STAFF_PAGE_STACK}>
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-primary">Client Transactions</h1>
          <p className="page-subtitle">Deposit and withdrawal activity from your assigned clients only. Open a client profile for full finance details.</p>
        </div>

        <Card className={STAFF_CARD}>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : transactions?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions from your clients yet.
              </div>
            ) : (
              <ResponsiveDataView
                className={STAFF_TABLE_WRAP}
                columns={transactionColumns}
                data={rows}
                rowKey={(tx) => tx.id}
                rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 transition-colors"
                mobileFooter={(tx) => (
                  <div className="mt-3 pt-3 border-t border-border/80 dark:border-white/10">
                    {tx.userId ? (
                      <Link href={`/manager/clients/${tx.userId}`}>
                        <span className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 cursor-pointer text-sm font-medium transition-colors">
                          View Client
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs font-mono text-muted-foreground">#{String(tx.id).padStart(6, "0")}</span>
                    )}
                  </div>
                )}
              />
            )}
          </CardContent>
        </Card>
      </div>
);
}
