import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, ShieldCheck, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type PublicPlatformStats = {
  investorCount: number;
  activeInvestments: number;
  activeInvestmentVolumeUsd: number;
  totalDepositsProcessedUsd: number;
  totalProfitPaidUsd: number;
  verifiedUsers: number;
  updatedAt: string;
};

import { publicFetchJson } from "@/lib/api-fetch";

async function fetchPublicStats(): Promise<PublicPlatformStats> {
  return publicFetchJson<PublicPlatformStats>("/public-stats");
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M+`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K+`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function fmtCount(n: number): string {
  if (n >= 10_000) return `${Math.floor(n / 1000)}K+`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K+`;
  return n.toLocaleString();
}

const STAT_CONFIG = [
  { key: "investorCount" as const, label: "Registered Investors", icon: Users, format: fmtCount },
  { key: "totalDepositsProcessedUsd" as const, label: "Deposits Processed", icon: Wallet, format: fmtUsd },
  { key: "totalProfitPaidUsd" as const, label: "Profit Paid Out", icon: TrendingUp, format: fmtUsd },
  { key: "verifiedUsers" as const, label: "KYC Verified Users", icon: ShieldCheck, format: fmtCount },
];

/** Public trust metrics strip for landing page — fetches live sanitized stats. */
export function LandingPublicStatsSection({ className }: { className?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-stats"],
    queryFn: fetchPublicStats,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isError) return null;

  return (
    <section
      className={cn(
        "w-full border-y py-8 sm:py-10 px-4 sm:px-6",
        "border-amber-500/15 dark:border-amber-500/10",
        "bg-gradient-to-r from-slate-50 via-white to-slate-50",
        "dark:from-[#0a1220] dark:via-[#0d1525] dark:to-[#0a1220]",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto min-w-0">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400/90 mb-6">
          Platform transparency
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {STAT_CONFIG.map(({ key, label, icon: Icon, format }) => (
            <div
              key={key}
              className="rounded-xl border border-amber-500/15 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-sm px-4 py-5 text-center"
            >
              <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Icon className="h-4 w-4" strokeWidth={2.25} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
                {isLoading ? "—" : data ? format(data[key] as number) : "—"}
              </p>
              <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground leading-snug">{label}</p>
            </div>
          ))}
        </div>
        {data?.updatedAt && !isLoading && (
          <p className="mt-4 text-center text-[10px] text-muted-foreground/70">
            Updated {new Date(data.updatedAt).toLocaleString()}
          </p>
        )}
      </div>
    </section>
  );
}
