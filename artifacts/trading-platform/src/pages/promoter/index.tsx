import { useState } from "react";
import { WITHDRAW_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { Copy, QrCode, Users, DollarSign, TrendingUp, Wallet, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatActivityTime } from "@/lib/format-activity-time";
import { APP_CARD, APP_CHART_GRID, APP_PAGE_STACK, APP_STAT_GRID } from "@/lib/ui-system";
import { AppPage } from "@/components/layout/AppPage";

export default function PromoterDashboard() {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["/api/promoter/dashboard"],
    queryFn: () => authFetchJson<any>("/promoter/dashboard"),
  });

  const copyLink = () => {
    if (data?.referralLink) {
      navigator.clipboard.writeText(data.referralLink);
      toast({ title: "Referral link copied" });
    }
  };

  const handleWithdraw = async () => {
    try {
      await authFetchJson("/promoter/commission-withdraw", {
        method: "POST",
        body: JSON.stringify({ amount: Number(withdrawAmount), currency: "USD" }),
      });
      toast({ title: "Withdrawal requested" });
      setWithdrawAmount("");
      refetch();
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className={APP_PAGE_STACK}>
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Failed to load promoter dashboard";
    const forbidden = message.includes("(403)");
    return (
      <Card className="border-red-500/30 bg-red-500/10 max-w-lg min-w-0">
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {forbidden
              ? "Promoter access is not enabled on your account. Contact support if you believe this is an error."
              : message}
          </p>
          {!forbidden && (
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const stats = [
    { label: "Total Referrals", value: data?.totalReferrals ?? 0, icon: Users, iconClass: "text-blue-600 dark:text-blue-400" },
    { label: "Active Investors", value: data?.activeInvestors ?? 0, icon: TrendingUp, iconClass: "text-green-700 dark:text-green-400" },
    { label: "Commission Earned", value: `$${(data?.commissionEarned ?? 0).toLocaleString()}`, icon: DollarSign, iconClass: "text-amber-600 dark:text-amber-400" },
    { label: "Pending", value: `$${(data?.pendingCommissions ?? 0).toLocaleString()}`, icon: Wallet, iconClass: "text-orange-600 dark:text-orange-400" },
  ];

  const team = data?.team ?? [];

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title={
        <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
          Promoter Dashboard
        </h1>
      }
      subtitle={`Affiliate program · ${data?.commissionType?.replace("_", " ") || "Revenue share"} commission`}
    >
      <div className={APP_STAT_GRID}>
        {stats.map(s => (
          <KpiStatCard
            key={s.label}
            label={s.label}
            value={s.value}
            icon={<s.icon className="h-4 w-4" />}
            iconClassName={s.iconClass}
            compact
          />
        ))}
      </div>

      <div className={APP_CHART_GRID}>
        <Card className="border-amber-500/20 bg-amber-500/5 min-w-0">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              Referral Link
            </CardTitle>
            <CardDescription>Share with investors to earn commissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col xs:flex-row gap-2 min-w-0">
              <Input readOnly value={data?.referralLink || ""} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 text-sm min-w-0" />
              <Button onClick={copyLink} variant="outline" className="shrink-0 xs:w-auto w-full touch-target">
                <Copy className="h-4 w-4" />
                <span className="xs:sr-only">Copy</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground break-words">
              Code: <span className="font-mono text-amber-600 dark:text-amber-400">{data?.referralCode}</span>
            </p>
            <p className="text-xs text-muted-foreground">Conversion rate: {data?.conversionRate ?? 0}%</p>
          </CardContent>
        </Card>

        <Card className={cn(APP_CARD, "min-w-0")}>
          <CardHeader><CardTitle className="text-base">Commission Withdrawal</CardTitle></CardHeader>
          <CardContent className="flex flex-col xs:flex-row gap-2 min-w-0">
            <Input
              type="number"
              placeholder="Amount"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-w-0"
            />
            <Button onClick={handleWithdraw} className={cn("shrink-0 xs:w-auto w-full touch-target", WITHDRAW_BUTTON_CLASS)}>
              Withdraw
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className={cn(APP_CARD)}>
        <CardHeader>
          <CardTitle className="text-base">Team / Downline ({team.length})</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {!team.length ? (
            <p className="text-center py-8 text-muted-foreground text-sm">No referrals yet — share your link to grow your team.</p>
          ) : (
            <ResponsiveDataView
              caption="Promoter downline"
              data={team}
              rowKey={(m: any) => m.id}
              columns={[
                {
                  key: "name",
                  header: "Name",
                  mobileTitle: true,
                  cell: (m: any) => <span className="font-medium">{m.fullName}</span>,
                },
                {
                  key: "email",
                  header: "Email",
                  hideOnMobile: true,
                  cell: (m: any) => <span className="text-muted-foreground">{m.email}</span>,
                },
                {
                  key: "balance",
                  header: "Balance",
                  headerClassName: "text-right",
                  cellClassName: "text-right text-emerald-600 dark:text-emerald-400 tabular-nums",
                  cell: (m: any) => `$${m.balanceFiat}`,
                },
                {
                  key: "kyc",
                  header: "KYC",
                  cell: (m: any) => <Badge variant="outline" className="capitalize text-[10px]">{m.kycStatus}</Badge>,
                },
                {
                  key: "joined",
                  header: "Joined",
                  cell: (m: any) => (
                    <span className="text-muted-foreground text-xs">
                      {m.joinedAt ? formatActivityTime(m.joinedAt) || format(new Date(m.joinedAt), "MMM d, yyyy") : "—"}
                    </span>
                  ),
                },
              ]}
              mobileHeader={(m: any) => (
                <div className="flex items-start justify-between gap-2 min-w-0 mb-2">
                  <p className="text-sm font-semibold truncate min-w-0">{m.fullName}</p>
                  <Badge variant="outline" className="text-[10px] shrink-0 capitalize">{m.kycStatus}</Badge>
                </div>
              )}
            />
          )}
        </CardContent>
      </Card>
    </AppPage>
  );
}
