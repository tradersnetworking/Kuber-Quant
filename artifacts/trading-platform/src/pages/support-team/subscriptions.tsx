import { useQuery } from "@tanstack/react-query";
import { Cpu, Bot } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PlatformAlgoTradingPanel } from "@/components/super-admin/PlatformAlgoTradingPanel";
import { SupportReadOnlyBanner } from "@/components/support/SupportReadOnlyBanner";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { STAFF_PAGE_STACK, STAFF_CARD, STAFF_TABLE_WRAP } from "@/lib/staff-dashboard-ui";
import { TAB_LIST_MOBILE_SCROLL } from "@/lib/tab-tones";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";

type EaSub = {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: string;
  strategyName: string;
  mtAccountNumber: string;
  mtPlatform: string;
  plan: string;
  profitSharingPercent: number | null;
  amount: number | null;
  currency: string | null;
  status: string;
  expiresAt: string;
  createdAt: string;
};

const eaSubColumns: ResponsiveColumn<EaSub>[] = [
  {
    key: "user",
    header: "User",
    mobileTitle: true,
    cell: (s) => (
      <>
        <p className="font-medium text-sm">{s.userName}</p>
        <p className="text-xs text-muted-foreground">{s.userEmail}</p>
      </>
    ),
  },
  {
    key: "strategy",
    header: "Strategy",
    cell: (s) => s.strategyName,
  },
  {
    key: "mtAccount",
    header: "MT Account",
    cell: (s) => (
      <span className="text-sm">#{s.mtAccountNumber} ({s.mtPlatform.toUpperCase()})</span>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    cell: (s) => <span className="capitalize">{s.plan}</span>,
  },
  {
    key: "profit",
    header: "Profit %",
    cell: (s) => (s.profitSharingPercent != null ? `${s.profitSharingPercent}%` : "—"),
  },
  {
    key: "status",
    header: "Status",
    cell: (s) => <Badge variant="outline" className="capitalize">{s.status}</Badge>,
  },
  {
    key: "expires",
    header: "Expires",
    cell: (s) => (
      <span className="text-sm text-muted-foreground">{format(new Date(s.expiresAt), "MMM d, yyyy")}</span>
    ),
  },
];

export default function SupportSubscriptionsPage() {
  const { data: eaSubs, isLoading } = useQuery({
    queryKey: ["/api/support-team/ea-subscriptions"],
    queryFn: () => staffFetch<EaSub[]>("/support-team/ea-subscriptions"),
  });

  const rows = eaSubs ?? [];

  return (
    <div className={STAFF_PAGE_STACK}>
      <div>
        <h1 className="page-title flex items-center gap-2">
          <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
          Subscriptions
        </h1>
        <p className="page-subtitle">
          Algo trading and EA strategy subscriptions for investors and managers.
        </p>
      </div>

      <SupportReadOnlyBanner>
        View subscription status and linked MT accounts. Support cannot activate or cancel subscriptions.
      </SupportReadOnlyBanner>

      <Tabs defaultValue="algo">
        <TabsList className={TAB_LIST_MOBILE_SCROLL}>
          <TabsTrigger value="algo">Algo Trading</TabsTrigger>
          <TabsTrigger value="ea">EA Strategies</TabsTrigger>
        </TabsList>
        <TabsContent value="algo" className="mt-4">
          <PlatformAlgoTradingPanel apiBase="/support-team" readOnly />
        </TabsContent>
        <TabsContent value="ea" className="mt-4">
          <Card className={STAFF_CARD}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                EA Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : rows.length ? (
                <ResponsiveDataView
                  className={STAFF_TABLE_WRAP}
                  columns={eaSubColumns}
                  data={rows}
                  rowKey={(s) => s.id}
                />
              ) : (
                <div className="text-center text-muted-foreground py-8">No EA subscriptions found.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
