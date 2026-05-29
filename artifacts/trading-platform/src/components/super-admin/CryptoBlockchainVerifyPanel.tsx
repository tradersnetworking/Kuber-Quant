import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link2, Loader2 } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";

export type BlockchainVerification = {
  verified: boolean;
  status: string;
  network: string;
  symbol: string;
  txHash: string;
  confirmations: number;
  requiredConfirmations: number;
  onChainAmount: number | null;
  onChainSymbol: string | null;
  recipientAddress: string | null;
  expectedAddress: string | null;
  addressMatch: boolean;
  amountMatch: boolean;
  explorerUrl: string | null;
  message: string;
};

export function isCryptoTransaction(tx: {
  gatewayProvider?: string | null;
  currency?: string;
  txHash?: string | null;
  paymentMethod?: string | null;
}) {
  if (tx.gatewayProvider === "crypto") return true;
  if (tx.txHash && ["BTC", "ETH", "USDT"].includes(String(tx.currency || "").toUpperCase())) return true;
  if ((tx.paymentMethod || "").toLowerCase().includes("crypto")) return true;
  return false;
}

const statusColor: Record<string, string> = {
  confirmed: "bg-green-500/20 text-green-700 dark:text-green-400",
  pending: "bg-orange-500/20 text-orange-600 dark:text-orange-400",
  mismatch: "bg-red-500/20 text-red-400",
  duplicate: "bg-red-500/20 text-red-400",
  not_found: "bg-red-500/20 text-red-400",
  unsupported: "bg-muted text-muted-foreground",
};

export function CryptoBlockchainVerifyPanel({
  transactionId,
  txHash,
  onVerifiedChange,
}: {
  transactionId: number;
  txHash?: string | null;
  onVerifiedChange?: (verified: boolean) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BlockchainVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await staffFetch<BlockchainVerification>(`/admin/transactions/${transactionId}/blockchain-verify`);
      setResult(data);
      onVerifiedChange?.(data.verified);
    } catch (e: any) {
      setError(e.message || "Verification failed");
      setResult(null);
      onVerifiedChange?.(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Link2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            Blockchain Verification
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Confirm this crypto deposit on-chain before approval (address, amount, confirmations).
          </p>
        </div>
        <Button size="sm" variant="outline" className="shrink-0" onClick={verify} disabled={loading || !txHash}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Verify on Chain"}
        </Button>
      </div>

      {txHash && (
        <p className="text-[11px] font-mono text-muted-foreground break-all">TX: {txHash}</p>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      {result && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColor[result.status] || "bg-muted text-muted-foreground"}>{result.status}</Badge>
            <span className="text-muted-foreground">{result.network} · {result.symbol}</span>
          </div>
          <p className={result.verified ? "text-green-700 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>{result.message}</p>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
            <span>Confirmations</span>
            <span className="text-right text-foreground">{result.confirmations} / {result.requiredConfirmations}</span>
            <span>On-chain amount</span>
            <span className="text-right text-foreground">
              {result.onChainAmount != null ? `${result.onChainAmount} ${result.onChainSymbol || ""}` : "—"}
            </span>
            <span>Address match</span>
            <span className={`text-right ${result.addressMatch ? "text-green-700 dark:text-green-400" : "text-red-400"}`}>
              {result.addressMatch ? "Yes" : "No"}
            </span>
            <span>Amount match</span>
            <span className={`text-right ${result.amountMatch ? "text-green-700 dark:text-green-400" : "text-red-400"}`}>
              {result.amountMatch ? "Yes" : "No"}
            </span>
          </div>
          {result.explorerUrl && (
            <Button size="sm" variant="link" className="h-auto p-0 text-cyan-600 dark:text-cyan-400" asChild>
              <a href={result.explorerUrl} target="_blank" rel="noopener noreferrer">
                View on explorer <ExternalLink className="h-3 w-3 ml-1 inline" />
              </a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
