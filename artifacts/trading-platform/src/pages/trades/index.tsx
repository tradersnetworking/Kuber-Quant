import { useListTrades, useGetTradeStats } from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { AppPage } from "@/components/layout/AppPage";
import { cn } from "@/lib/utils";
import { APP_CARD, APP_PAGE_STACK, APP_STAT_GRID } from "@/lib/ui-system";
import { TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareButton } from "@/components/profit/ProfitShareButton";
import { calculateTradeProfitPercent } from "@/lib/profit-share";
import { ResponsiveDataView, type ResponsiveColumn } from "@/components/ui/responsive-data-view";

function formatPrice(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPnL(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  const num = Number(value);
  if (Number.isNaN(num)) return "—";
  if (num > 0) return `+$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (num < 0) return `-$${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return "$0.00";
}

function pnlClass(value: number | null | undefined) {
  if (value === null || value === undefined) return "text-muted-foreground";
  const num = Number(value);
  if (num > 0) return "text-green-600 dark:text-green-400";
  if (num < 0) return "text-red-500";
  return "text-muted-foreground";
}

function statusBadgeClass(status: string) {
  switch (status) {
    case "open":
      return "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10";
    case "closed":
      return "border-green-500/30 text-green-700 dark:text-green-400 bg-green-500/10";
    case "cancelled":
      return "border-red-500/30 text-red-500 bg-red-500/10";
    default:
      return "";
  }
}

function TradeTypeBadge({ type }: { type: string }) {
  const isBuy = type === "buy";
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] uppercase shrink-0",
        isBuy
          ? "border-green-500/40 text-green-700 dark:text-green-400 bg-green-500/10"
          : "border-red-500/40 text-red-500 bg-red-500/10",
      )}
    >
      {isBuy ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
      {type}
    </Badge>
  );
}

function TradeShareButton({ trade, userName, referralCode }: { trade: Trade; userName: string; referralCode?: string }) {
  const pnl = trade.profitLoss != null ? Number(trade.profitLoss) : null;
  if (pnl == null || pnl <= 0) return null;

  const profitPercent = calculateTradeProfitPercent(trade);
  const detailParts = [trade.symbol, trade.strategy].filter(Boolean);

  return (
    <ProfitShareButton
      userName={userName}
      referralCode={referralCode}
      className="w-full sm:w-auto"
      label={profitPercent != null ? `Share +${profitPercent.toFixed(1)}%` : "Share Profit"}
      payload={{
        service: "trade_history",
        profitAmount: pnl,
        currency: "USD",
        profitPercent: profitPercent ?? undefined,
        detailLabel: detailParts.join(" · "),
      }}
    />
  );
}

function buildTradeColumns(userName: string, referralCode?: string): ResponsiveColumn<Trade>[] {
  return [
    {
      key: "symbol",
      header: "Symbol",
      mobileTitle: true,
      cell: (trade) => (
        <div>
          <span className="font-bold">{trade.symbol}</span>
          {trade.strategy && (
            <p className="text-[11px] text-muted-foreground font-normal mt-0.5">{trade.strategy}</p>
          )}
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      cell: (trade) => <TradeTypeBadge type={trade.type} />,
    },
    {
      key: "amount",
      header: "Amount",
      cell: (trade) => trade.amount,
    },
    {
      key: "entryExit",
      header: "Entry / Exit",
      mobileLabel: "Entry / Exit",
      cell: (trade) => (
        <span className="whitespace-nowrap">
          {formatPrice(trade.entryPrice)}
          {trade.exitPrice != null
            ? ` / ${formatPrice(trade.exitPrice)}`
            : trade.status === "open"
              ? " / Open"
              : ""}
        </span>
      ),
    },
    {
      key: "pnl",
      header: "P&L",
      cell: (trade) => {
        const pnl = trade.profitLoss != null ? Number(trade.profitLoss) : null;
        return (
          <span className={cn("font-bold", pnlClass(pnl))}>{formatPnL(pnl)}</span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      cell: (trade) => (
        <Badge variant="outline" className={cn("capitalize", statusBadgeClass(trade.status))}>
          {trade.status}
        </Badge>
      ),
    },
    {
      key: "share",
      header: "Share",
      headerClassName: "text-right",
      cellClassName: "text-right",
      hideOnMobile: true,
      cell: (trade) => (
        <TradeShareButton trade={trade} userName={userName} referralCode={referralCode} />
      ),
    },
  ];
}

function fmtStat(value?: number, prefix = "", suffix = "") {
  if (value === undefined) return "—";
  return `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${suffix}`;
}

export default function TradesPage() {
  const { data: trades, isLoading: tradesLoading } = useListTrades();
  const { data: stats, isLoading: statsLoading } = useGetTradeStats();
  const { user } = useAuth();
  const referralCode = (user as { referralCode?: string } | null)?.referralCode;
  const userName = user?.fullName || "Trader";
  const tradeRows = trades ?? [];
  const tradeColumns = buildTradeColumns(userName, referralCode);
  const totalPnl = stats?.totalProfitLoss;

  return (
    <AppPage
      stackClassName={APP_PAGE_STACK}
      title="Trade History"
      subtitle="Overview of your trading activity and statistics."
    >
      <div className={APP_STAT_GRID}>
        <KpiStatCard label="Total Trades" value={fmtStat(stats?.totalTrades)} loading={statsLoading} compact />
        <KpiStatCard label="Win Rate" value={fmtStat(stats?.winRate, "", "%")} loading={statsLoading} compact />
        <KpiStatCard
          label="Total P&L"
          value={fmtStat(totalPnl, "$")}
          loading={statsLoading}
          iconClassName={totalPnl != null && totalPnl > 0 ? "text-green-600 dark:text-green-400" : totalPnl != null && totalPnl < 0 ? "text-red-500" : undefined}
          compact
        />
        <KpiStatCard label="Open Trades" value={fmtStat(stats?.openTrades)} loading={statsLoading} compact />
      </div>

      <Card className={cn(APP_CARD, "min-w-0")}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent className="min-w-0">
          {tradesLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-10 w-full hidden md:block" />
            </div>
          ) : tradeRows.length ? (
            <ResponsiveDataView
              caption="Trade history"
              columns={tradeColumns}
              data={tradeRows}
              rowKey={(trade) => trade.id}
              rowClassName="border-border/80 dark:border-white/5"
              mobileFooter={(trade) => (
                <div className="mt-3 pt-3 border-t border-border/60 dark:border-white/5">
                  <TradeShareButton trade={trade} userName={userName} referralCode={referralCode} />
                </div>
              )}
            />
          ) : (
            <div className="text-center py-10 text-muted-foreground text-sm">No trades found.</div>
          )}
        </CardContent>
      </Card>
    </AppPage>
  );
}
