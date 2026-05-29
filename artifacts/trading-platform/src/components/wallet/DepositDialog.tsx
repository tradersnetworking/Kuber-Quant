import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authFetch, authFetchJson, apiPath } from "@/lib/api-fetch";
import { ArrowDownLeft, Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import {
  enrichDepositAccount,
  type DepositAccountsResponse,
} from "@/components/wallet/deposit-account-utils";
import { resolveCryptoDepositTabs, findCryptoDepositAccount } from "@/components/wallet/crypto-networks";
import { WalletDepositMethodPanel, type WalletDepositMethod } from "@/components/wallet/WalletDepositMethodPanel";
import { ExchangeDepositProofPanel, isExchangeProofReady } from "@/components/exchange/ExchangeDepositProofPanel";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import { DEPOSIT_FIAT_CURRENCIES } from "@/lib/wallet-currency-options";
import {
  upiDepositExceedsLimit,
  upiLimitErrorMessage,
  formatUpiLimitInr,
  UPI_MAX_INR_PER_TRANSACTION,
} from "@/lib/payment-limits";
import { FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";

type FormProps = {
  onSuccess?: () => void;
  compact?: boolean;
};

export function WalletDepositForm({ onSuccess, compact }: FormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<WalletDepositMethod | "">("");
  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [utr, setUtr] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);

  const { data: depositAccounts } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<DepositAccountsResponse>("/payments/deposit-accounts"),
  });

  const crypto = (depositAccounts?.crypto || []).map(enrichDepositAccount);
  const cryptoTabs = resolveCryptoDepositTabs(crypto);
  const activeCryptoTab = cryptoTabs.find(t => t.key === accountId);
  const activeCrypto = activeCryptoTab ? findCryptoDepositAccount(crypto, activeCryptoTab) : undefined;
  const activeUpi = (depositAccounts?.upi || []).map(enrichDepositAccount).find(a => String(a.id) === accountId);
  const activeBank = (depositAccounts?.bank || []).map(enrichDepositAccount).find(a => String(a.id) === accountId);

  const isCrypto = method === "crypto";
  const isGateway = method === "gateway";
  const isUpi = method === "upi";
  const parsedAmount = Number(amount);
  const usdInrRate = (depositAccounts as any)?.exchangeRates?.USD_INR;
  const upiOverLimit = isUpi && amount.trim() !== "" && !Number.isNaN(parsedAmount)
    && upiDepositExceedsLimit(parsedAmount, currency, usdInrRate);
  const proofMode = isCrypto ? "sell" : "buy";
  const proofReady = isGateway || isExchangeProofReady(proofMode, utr, utr, proofFile);

  useEffect(() => {
    setAccountId("");
    setUtr("");
    setProofFile(null);
  }, [method]);

  async function validatePromo() {
    if (!promoCode.trim()) { setPromoDiscount(null); return; }
    setPromoValidating(true);
    try {
      const res = await authFetchJson<{ valid: boolean; discount: number }>("/promo-codes/validate", {
        method: "POST",
        body: JSON.stringify({ code: promoCode.trim(), amount: Number(amount) || 0, appliesTo: "deposit" }),
      });
      setPromoDiscount(res.discount);
      toast({ title: "Promo applied", description: `Discount: ${res.discount}` });
    } catch (err: any) {
      setPromoDiscount(null);
      toast({ title: "Invalid promo", description: err.message, variant: "destructive" });
    } finally {
      setPromoValidating(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isGateway) return;
    if (!method || !accountId) {
      toast({ title: "Select deposit method", variant: "destructive" });
      return;
    }
    if (isUpi && upiDepositExceedsLimit(Number(amount), currency, usdInrRate)) {
      toast({ title: "UPI limit exceeded", description: upiLimitErrorMessage(), variant: "destructive" });
      return;
    }
    if (!proofReady) {
      toast({
        title: "Proof required",
        description: isCrypto ? "Enter the blockchain transaction hash." : "Upload proof or enter UTR/reference.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (isCrypto) {
        await authFetchJson("/payments/crypto/deposit", {
          method: "POST",
          body: JSON.stringify({
            amount: Number(amount),
            currency: activeCryptoTab?.symbol || "USDT",
            txHash: utr.trim(),
            gatewayId: activeCrypto?.id,
          }),
        });
        toast({ title: "Crypto deposit submitted", description: "Pending verification." });
      } else {
        const active = method === "upi" ? activeUpi : activeBank;
        const fd = new FormData();
        fd.append("amount", amount);
        fd.append("currency", currency);
        fd.append("paymentMethod", active?.name || method);
        fd.append("depositMethodType", method);
        if (utr.trim()) fd.append("utrReference", utr.trim());
        if (promoCode.trim()) fd.append("promoCode", promoCode.trim().toUpperCase());
        if (active) fd.append("notes", `Deposit to ${active.name} (ID ${active.id})`);
        if (proofFile) fd.append("proof", proofFile);

        const res = await authFetch(apiPath("/transactions/manual-deposit"), {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Deposit failed");
        toast({ title: "Deposit submitted", description: "Pending admin verification." });
      }
      setAmount("");
      setUtr("");
      setProofFile(null);
      setPromoCode("");
      setPromoDiscount(null);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <WalletDepositMethodPanel
        depositAccounts={depositAccounts}
        method={method}
        onMethodChange={setMethod}
        accountId={accountId}
        onAccountIdChange={setAccountId}
        amountHint={amount}
        onGatewaySuccess={onSuccess}
      />

      {method && !isGateway && (
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-border dark:border-white/10">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Step 2 — Amount & proof</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the amount you paid/sent, then upload proof for admin verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <FinanceFieldLabel tone="amount">Amount</FinanceFieldLabel>
              <Input
                type="number"
                required
                min={1}
                max={isUpi && currency === "INR" ? UPI_MAX_INR_PER_TRANSACTION : undefined}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className={financeInputClass(upiOverLimit ? "border-red-500/50" : undefined)}
              />
              {isUpi && (
                <p className={cn("text-[11px]", upiOverLimit ? "text-red-400" : "text-sky-600 dark:text-sky-400/90")}>
                  UPI max ₹{formatUpiLimitInr()} per transaction
                </p>
              )}
            </div>
            {!isCrypto && (
              <div className="space-y-1">
                <FinanceFieldLabel tone="currency">Currency</FinanceFieldLabel>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className={financeInputClass()}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {DEPOSIT_FIAT_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {!isCrypto && (
            <div className="space-y-1">
              <FinanceFieldLabel tone="proof">Promo code (optional)</FinanceFieldLabel>
              <div className="flex flex-wrap gap-2">
                <Input
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="SAVE20"
                  className={cn(financeInputClass("uppercase"), "min-w-0 flex-1")}
                />
                <Button type="button" variant="outline" className="shrink-0" onClick={validatePromo} disabled={promoValidating || !promoCode.trim()}>
                  Apply
                </Button>
              </div>
              {promoDiscount != null && (
                <p className="text-xs text-green-700 dark:text-green-400">Discount: {promoDiscount} {currency}</p>
              )}
            </div>
          )}

          <ExchangeDepositProofPanel
            mode={proofMode}
            utr={utr}
            onUtrChange={setUtr}
            txHash={utr}
            onTxHashChange={setUtr}
            proofFile={proofFile}
            onProofFileChange={setProofFile}
            disabled={loading}
          />

          <Button
            type="submit"
            size="wrap"
            disabled={loading || !accountId || !proofReady || upiOverLimit}
            className={cn("w-full font-bold", DEPOSIT_BUTTON_CLASS, mobileBtnWrap)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Upload className="h-4 w-4 shrink-0" />}
            <span>Submit deposit for verification</span>
          </Button>
        </form>
      )}
    </div>
  );
}

type DialogProps = FormProps & {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** @deprecated alias — use WalletDepositForm */
export const DepositDialogForm = WalletDepositForm;

export function DepositDialog({ onSuccess, trigger, open, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className={DEPOSIT_BUTTON_CLASS}>
              <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="dialog-scroll-content bg-background border-border dark:border-white/10 max-w-xl w-[calc(100vw-2rem)] overflow-x-hidden p-0 gap-0">
        <DialogHeader className="px-4 pt-4 sm:px-6">
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>UPI, bank transfer, payment gateway, or crypto — same flow as Buy Crypto.</DialogDescription>
        </DialogHeader>
        <div className="dialog-form-inner px-4 pb-4 sm:px-6 sm:pb-6 min-w-0">
          <WalletDepositForm
            compact
            onSuccess={() => {
              setDialogOpen(false);
              onSuccess?.();
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
