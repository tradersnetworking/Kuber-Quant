import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap, mobileChipRow } from "@/lib/mobile-ui";
import { FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";

type Props = {
  mode: "buy" | "sell";
  utr: string;
  onUtrChange: (v: string) => void;
  txHash: string;
  onTxHashChange: (v: string) => void;
  proofFile: File | null;
  onProofFileChange: (f: File | null) => void;
  disabled?: boolean;
};

export function ExchangeDepositProofPanel({
  mode,
  utr,
  onUtrChange,
  txHash,
  onTxHashChange,
  proofFile,
  onProofFileChange,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isBuy = mode === "buy";

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/25 bg-amber-500/5 dark:bg-amber-500/5 p-4" data-allow-screenshot>
      <div>
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
          {isBuy ? "Upload payment proof" : "Upload crypto transfer proof"}
        </p>
        <p className="text-xs text-muted-foreground mt-1 text-wrap break-words">
          {isBuy
            ? "After paying via UPI/bank/gateway above, upload a screenshot or PDF of the payment and enter UTR/reference if available."
            : "After sending crypto to our wallet above, enter the blockchain transaction hash and optionally upload a screenshot of the transfer."}
        </p>
      </div>

      {isBuy && (
        <div className="space-y-1.5">
          <FinanceFieldLabel tone="proof">UTR / payment reference</FinanceFieldLabel>
          <Input
            value={utr}
            onChange={e => onUtrChange(e.target.value)}
            placeholder="e.g. UTR number or bank reference"
            className={financeInputClass("h-10")}
            disabled={disabled}
          />
        </div>
      )}

      {!isBuy && (
        <div className="space-y-1.5">
          <FinanceFieldLabel tone="proof">Transaction hash *</FinanceFieldLabel>
          <Input
            value={txHash}
            onChange={e => onTxHashChange(e.target.value)}
            placeholder="Paste blockchain TX hash"
            className={financeInputClass("h-10 font-mono text-xs")}
            disabled={disabled}
          />
        </div>
      )}

      <div className="space-y-2">
        <FinanceFieldLabel tone="proof">
          {isBuy ? "Payment proof screenshot / PDF *" : "Transfer screenshot (optional)"}
        </FinanceFieldLabel>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="wrap"
            disabled={disabled}
            className={cn(
              "border-amber-500/40 text-amber-700 hover:bg-amber-500/10 dark:border-amber-500/30 dark:text-amber-400 max-w-full",
              mobileBtnWrap,
            )}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span className="min-w-0">{proofFile ? "Change file" : "Upload proof"}</span>
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            disabled={disabled}
            onChange={e => onProofFileChange(e.target.files?.[0] || null)}
          />
          {proofFile && (
            <div className={cn(mobileChipRow, "rounded-lg border border-border bg-muted/40 dark:bg-muted/80 dark:bg-black/20 px-2.5 py-1.5 text-xs")}>
              <FileCheck className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{proofFile.name}</span>
              <button
                type="button"
                className="text-red-500 hover:text-red-400 dark:text-red-400 shrink-0"
                onClick={() => {
                  onProofFileChange(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <p className={cn("text-[11px]", isBuy ? "text-amber-700/90 dark:text-amber-400/80" : "text-muted-foreground")}>
          {isBuy
            ? "Required: upload proof or enter UTR/reference above."
            : "TX hash is required. Screenshot helps admin verify faster."}
        </p>
      </div>
    </div>
  );
}

export function isExchangeProofReady(mode: "buy" | "sell", utr: string, txHash: string, proofFile: File | null) {
  if (mode === "buy") return Boolean(proofFile || utr.trim());
  return Boolean(txHash.trim());
}
