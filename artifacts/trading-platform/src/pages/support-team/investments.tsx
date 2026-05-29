import { useQuery } from "@tanstack/react-query";
import { Briefcase, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformInvestmentsPanel } from "@/components/super-admin/PlatformInvestmentsPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { TAB_LIST_MOBILE_SCROLL } from "@/lib/tab-tones";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";

type RoiPayout = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  investmentId: number;
  amount: number;
  roiPercent: number;
  status: string;
  planName: string | null;
  createdAt: string;
};

const roiPayoutColumns: ResponsiveColumn<RoiPayout>[] = [
  {
    key: "user",
    header: "User",
    mobileTitle: true,
    cell: (p) => (
      <>
        <p className="font-medium text-sm">{p.userName}</p>
        <p className="text-xs text-muted-foreground">{p.userEmail}</p>
      </>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    cell: (p) => p.planName || `#${p.investmentId}`,
  },
  {
    key: "amount",
    header: "Amount",
    headerClassName: "text-right",
    cellClassName: "text-right font-medium",
    cell: (p) => `$${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
  },
  {
    key: "roi",
    header: "ROI %",
    cell: (p) => `${p.roiPercent}%`,
  },
  {
    key: "status",
    header: "Status",
    cell: (p) => <Badge variant="outline" className="capitalize">{p.status}</Badge>,
  },
  {
    key: "date",
    header: "Date",
    cell: (p) => (
      <span className="text-sm text-muted-foreground">{format(new Date(p.createdAt), "MMM d, yyyy")}</span>
    ),
  },
];

export default function SupportInvestmentsPage() {
  const { data: payouts, isLoading } = useQuery({
    queryKey: ["/api/support-team/roi/payouts"],
    queryFn: () => staffFetch<RoiPayout[]>("/support-team/roi/payouts"),
  });

  const rows = payouts ?? [];

  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 dark:text-amber-400 shrink-0" />
          Investments &amp; Profit
        </h1>
        <p className="page-subtitle">
          Investment plans held by users and managers, plus ROI profit-sharing payouts.
        </p>
      </div>
      <SupportReadOnlyBanner>
        View-only finance data for support investigations. No edits or payouts can be triggered from this portal.
      </SupportReadOnlyBanner>

      <Tabs defaultValue="investments">
        <TabsList className={TAB_LIST_MOBILE_SCROLL}>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="roi">ROI Payouts</TabsTrigger>
        </TabsList>
        <TabsContent value="investments" className="mt-4">
          <PlatformInvestmentsPanel apiBase="/support-team" />
        </TabsContent>
        <TabsContent value="roi" className="mt-4">
          <Card className={STAFF_CARD}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                ROI Profit Payouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : rows.length ? (
                <ResponsiveDataView
                  className={STAFF_TABLE_WRAP}
                  columns={roiPayoutColumns}
                  data={rows}
                  rowKey={(p) => p.id}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">No ROI payouts found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
