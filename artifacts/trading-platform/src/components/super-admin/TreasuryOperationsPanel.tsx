import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KpiStatCard } from "@/components/ui/KpiStatCard";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { RefreshCw, Shield, Wallet, AlertTriangle } from "lucide-react";
import { authFetchJson, getStoredUser } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import { STAFF_CARD, STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_STAT_GRID } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

type TreasurySnapshot = {
  userLiabilities: { fiat: number; crypto: number; investorCount: number };
  pendingOperations: {
    deposits: number;
    withdrawals: number;
    depositAmount: number;
    withdrawalAmount: number;
  };
  ledgerProfitPaid: number;
  snapshotAt: string;
};

type ReconciliationReport = {
  scanned: number;
  driftCount: number;
  fixed: number;
  drifts: Array<{ userId: number; email: string; fiatDrift: number; cryptoDrift: number }>;
  ranAt: string;
};

function treasuryApiBase(): string {
  const role = getStoredUser()?.role as string | undefined;
  return role === "admin" ? "/admin" : "/super-admin";
}

function formatApiError(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  return "Unexpected error — check API server logs and try again.";
}

export function TreasuryOperationsPanel() {
  const { toast } = useToast();
  const [treasury, setTreasury] = useState<TreasurySnapshot | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadTreasury = useCallback(async () => {
    const base = treasuryApiBase();
    return authFetchJson<TreasurySnapshot>(`${base}/treasury`);
  }, []);

  const loadReconciliation = useCallback(async () => {
    const base = treasuryApiBase();
    return authFetchJson<ReconciliationReport>(`${base}/reconciliation`);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const [treasuryResult, reconciliationResult] = await Promise.allSettled([
      loadTreasury(),
      loadReconciliation(),
    ]);

    const errors: string[] = [];

    if (treasuryResult.status === "fulfilled") {
      setTreasury(treasuryResult.value);
    } else {
      errors.push(formatApiError(treasuryResult.reason));
    }

    if (reconciliationResult.status === "fulfilled") {
      setReconciliation(reconciliationResult.value);
    } else {
      errors.push(formatApiError(reconciliationResult.reason));
    }

    if (errors.length > 0) {
      const message = errors.join(" · ");
      setLoadError(message);
      if (errors.length === 2) {
        toast({
          title: "Failed to load treasury data",
          description: message,
          variant: "destructive",
        });
      }
    }

    setLoading(false);
  }, [loadReconciliation, loadTreasury, toast]);

  useEffect(() => { void load(); }, [load]);

  const runReconcile = async (autoFix: boolean) => {
    setRunning(true);
    const base = treasuryApiBase();
    try {
      const report = await authFetchJson<ReconciliationReport>(`${base}/reconciliation/run`, {
        method: "POST",
        body: JSON.stringify({ autoFix }),
      });
      setReconciliation(report);
      toast({
        title: autoFix ? "Reconciliation complete" : "Reconciliation scan complete",
        description: `${report.driftCount} drift(s) found${autoFix ? `, ${report.fixed} fixed` : ""} across ${report.scanned} account(s).`,
      });
      try {
        const refreshedTreasury = await loadTreasury();
        setTreasury(refreshedTreasury);
      } catch (refreshErr) {
        toast({
          title: "Treasury refresh failed",
          description: `${formatApiError(refreshErr)} Scan results are still shown above.`,
          variant: "destructive",
        });
      }
    } catch (err) {
      toast({
        title: "Reconciliation failed",
        description: formatApiError(err),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  if (loading && !treasury && !reconciliation) {
    return <div className="text-sm text-muted-foreground p-4">Loading treasury…</div>;
  }

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-500 shrink-0" />
            Treasury & Ledger Integrity
          </h3>
          <p className="text-sm text-muted-foreground">
            Compare cached account balances to the immutable wallet ledger. Scan detects drift; auto-fix aligns accounts to ledger truth.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading || running} className="shrink-0">
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {loadError}
        </div>
      )}

      {treasury && (
        <div className={STAFF_STAT_GRID}>
          <KpiStatCard
            label="Fiat liabilities"
            value={`$${treasury.userLiabilities.fiat.toLocaleString()}`}
            sub="Ledger-audited investor fiat available"
            icon={<Wallet className="h-4 w-4" />}
            iconClassName="text-emerald-600 dark:text-emerald-400"
            compact
          />
          <KpiStatCard
            label="Crypto liabilities"
            value={treasury.userLiabilities.crypto.toFixed(4)}
            sub="Ledger-audited investor crypto available"
            icon={<Shield className="h-4 w-4" />}
            iconClassName="text-violet-600 dark:text-violet-400"
            compact
          />
          <KpiStatCard
            label="Pending deposits"
            value={treasury.pendingOperations.deposits}
            sub={`$${treasury.pendingOperations.depositAmount.toLocaleString()}`}
            compact
          />
          <KpiStatCard
            label="Pending withdrawals"
            value={treasury.pendingOperations.withdrawals}
            sub={`$${treasury.pendingOperations.withdrawalAmount.toLocaleString()}`}
            compact
          />
        </div>
      )}

      <Card className={cn(STAFF_CARD)}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Ledger reconciliation
          </CardTitle>
          <CardDescription>
            Compares each user&apos;s <code className="text-xs">balance_fiat</code> / <code className="text-xs">balance_crypto</code> against the latest wallet ledger snapshot.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {reconciliation && (
            <div className="flex flex-wrap gap-2 text-sm items-center">
              <Badge variant={reconciliation.driftCount === 0 ? "default" : "destructive"}>
                {reconciliation.driftCount === 0 ? "Balanced" : `${reconciliation.driftCount} drift(s)`}
              </Badge>
              <span className="text-muted-foreground">Scanned {reconciliation.scanned} users</span>
              {reconciliation.ranAt && (
                <span className="text-muted-foreground">· Last run {new Date(reconciliation.ranAt).toLocaleString()}</span>
              )}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={running || loading} onClick={() => void runReconcile(false)}>
              {running ? "Running…" : "Scan only"}
            </Button>
            <Button size="sm" disabled={running || loading} onClick={() => void runReconcile(true)}>
              {running ? "Running…" : "Scan & auto-fix"}
            </Button>
          </div>
          {reconciliation && reconciliation.drifts.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-3">
              <p className="text-sm font-medium flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                Balance drift detected
              </p>
              <ResponsiveDataView
                caption="Ledger balance drift"
                data={reconciliation.drifts.slice(0, 10)}
                rowKey={d => d.userId}
                columns={[
                  {
                    key: "email",
                    header: "User",
                    mobileTitle: true,
                    cell: d => <span className="font-medium text-sm truncate">{d.email}</span>,
                  },
                  {
                    key: "fiat",
                    header: "Fiat drift",
                    headerClassName: "text-right",
                    cellClassName: "text-right tabular-nums text-xs",
                    cell: d => d.fiatDrift.toFixed(2),
                  },
                  {
                    key: "crypto",
                    header: "Crypto drift",
                    headerClassName: "text-right",
                    cellClassName: "text-right tabular-nums text-xs",
                    cell: d => d.cryptoDrift.toFixed(6),
                  },
                ]}
              />
              {reconciliation.drifts.length > 10 && (
                <p className="text-xs text-muted-foreground">+ {reconciliation.drifts.length - 10} more</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
