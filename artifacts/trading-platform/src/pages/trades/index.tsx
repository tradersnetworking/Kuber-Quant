import { useListTrades, useGetTradeStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function TradesPage() {
  const { data: trades, isLoading: tradesLoading } = useListTrades();
  const { data: stats, isLoading: statsLoading } = useGetTradeStats();

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trade History</h1>
          <p className="text-muted-foreground">Overview of your trading activity and statistics.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Trades" value={stats?.totalTrades} isLoading={statsLoading} />
          <StatCard title="Win Rate" value={stats?.winRate} isLoading={statsLoading} suffix="%" />
          <StatCard title="Total P&L" value={stats?.totalProfitLoss} isLoading={statsLoading} prefix="$" isProfit />
          <StatCard title="Open Trades" value={stats?.openTrades} isLoading={statsLoading} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : trades?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Entry / Exit</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map(trade => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-bold">{trade.symbol}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === "buy" ? "default" : "destructive"}>
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.amount}</TableCell>
                      <TableCell>${trade.entryPrice} {trade.exitPrice ? `/ $${trade.exitPrice}` : ""}</TableCell>
                      <TableCell className={trade.profitLoss && trade.profitLoss > 0 ? "text-green-500 font-bold" : trade.profitLoss && trade.profitLoss < 0 ? "text-red-500 font-bold" : ""}>
                        {trade.profitLoss ? (trade.profitLoss > 0 ? `+$${trade.profitLoss}` : `-$${Math.abs(trade.profitLoss)}`) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{trade.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No trades found.</div>
            )}
          </CardContent>
        </Card>
      </div>
);
}

function StatCard({ title, value, isLoading, prefix = "", suffix = "", isProfit = false }: any) {
  const formattedValue = value !== undefined 
    ? `${prefix}${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}${suffix}` 
    : "—";
    
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className={`text-2xl font-bold ${isProfit && value && value > 0 ? "text-green-500" : isProfit && value && value < 0 ? "text-red-500" : ""}`}>
            {formattedValue}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
