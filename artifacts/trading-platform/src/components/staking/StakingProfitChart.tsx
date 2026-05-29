import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export type StakingProjectionPoint = {
  day: number;
  label: string;
  rewards: number;
  total: number;
};

type Props = {
  series: StakingProjectionPoint[];
  currency: string;
  className?: string;
};

export function StakingProfitChart({ series, currency, className }: Props) {
  if (!series.length) return null;

  return (
    <div className={cn("h-56 sm:h-64 w-full min-w-0", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="stakingRewardFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16 185 129)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(16 185 129)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="stakingTotalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59 130 246)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="rgb(59 130 246)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            width={48}
            className="text-muted-foreground"
            tickFormatter={(v) => (Number(v) >= 1000 ? `${(Number(v) / 1000).toFixed(1)}k` : String(v))}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "0.5rem",
              fontSize: "12px",
            }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`,
              name === "total" ? "Total value" : "Rewards",
            ]}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="total"
            stroke="rgb(59 130 246)"
            fill="url(#stakingTotalFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="rewards"
            name="rewards"
            stroke="rgb(16 185 129)"
            fill="url(#stakingRewardFill)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
