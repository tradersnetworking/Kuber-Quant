import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { authFetchJson } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import type { ServiceKey } from "@/lib/service-catalog";
import {
  TrendingUp, Coins, Users, LineChart, History, Cpu, Bot, LogIn, LogOut, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MyService = {
  key: ServiceKey;
  label: string;
  optedIn: boolean;
  activeCount: number;
  summary: string;
  optInHref: string;
  continueHref: string;
  canOptOut: boolean;
  optOutHint?: string;
};

const ICONS: Record<ServiceKey, typeof TrendingUp> = {
  investment_plans: TrendingUp,
  staking: Coins,
  copy_trading: Users,
  account_handling: LineChart,
  link_accounts: History,
  algo_trading: Cpu,
  ea_strategies: Bot,
};

export function MyServicesPanel({ className }: { className?: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [services, setServices] = useState<MyService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [optingOut, setOptingOut] = useState<ServiceKey | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetchJson<{ services: MyService[] }>("/dashboard/my-services");
      setServices(data.services ?? []);
    } catch (e: any) {
      setServices([]);
      toast({
        title: "Could not load your services",
        description: e?.message || "Try the Refresh button above.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const optOut = async (key: ServiceKey) => {
    setOptingOut(key);
    try {
      const res = await authFetchJson<{ message: string }>(`/dashboard/my-services/${key}/opt-out`, {
        method: "POST",
      });
      toast({ title: "Opted out", description: res.message });
      await load();
      void qc.invalidateQueries();
    } catch (e: any) {
      toast({
        title: "Opt-out not available",
        description: e?.message || "Manage this service from its page.",
        variant: "destructive",
      });
    } finally {
      setOptingOut(null);
    }
  };

  const optedIn = services?.filter(s => s.optedIn) ?? [];
  const available = services?.filter(s => !s.optedIn) ?? [];

  return (
    <Card className={cn("bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-w-0", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">My Services</CardTitle>
        <p className="text-xs text-muted-foreground">
          Services you have joined and others you can opt into.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 min-w-0">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : (
          <>
            {optedIn.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Active</p>
                {optedIn.map(s => {
                  const Icon = ICONS[s.key];
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border border-border dark:border-white/10 p-3 bg-background/40 dark:bg-white/[0.02] space-y-2"
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold truncate">{s.label}</p>
                            <Badge className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                              Opted in
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.summary}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link href={s.continueHref}>
                          <Button size="sm" variant="default" className="h-8 text-xs">
                            <ArrowRight className="h-3.5 w-3.5 mr-1" /> Continue
                          </Button>
                        </Link>
                        {s.canOptOut ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs border-red-500/30 text-red-600 dark:text-red-400"
                            disabled={optingOut === s.key}
                            onClick={() => void optOut(s.key)}
                          >
                            <LogOut className="h-3.5 w-3.5 mr-1" />
                            {optingOut === s.key ? "Opting out…" : "Opt out"}
                          </Button>
                        ) : s.optOutHint ? (
                          <p className="text-[10px] text-muted-foreground self-center">{s.optOutHint}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {available.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {optedIn.length > 0 ? "Available to join" : "Platform services"}
                </p>
                {available.map(s => {
                  const Icon = ICONS[s.key];
                  return (
                    <div
                      key={s.key}
                      className="flex items-center gap-2 rounded-xl border border-border dark:border-white/10 p-3 min-w-0"
                    >
                      <div className="h-9 w-9 rounded-lg bg-muted dark:bg-white/5 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{s.label}</p>
                        <p className="text-[11px] text-muted-foreground">{s.summary}</p>
                      </div>
                      <Link href={s.optInHref}>
                        <Button size="sm" variant="outline" className="h-8 text-xs shrink-0">
                          <LogIn className="h-3.5 w-3.5 mr-1" /> Opt in
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}

            {services?.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No services are currently available.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
