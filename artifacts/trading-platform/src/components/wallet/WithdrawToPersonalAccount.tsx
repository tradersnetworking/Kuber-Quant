import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetWallet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { Link } from "wouter";
import { ArrowUpRight, Landmark, Loader2, Plus, Shield, Eye, EyeOff } from "lucide-react";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import { WalletWithdrawMethodPanel, type WalletWithdrawMethod } from "@/components/wallet/WalletWithdrawMethodPanel";
import { walletBalanceForCurrency, withdrawAmountErrorMessage, formatWithdrawLimit, withdrawAmountExceedsAvailable, maxWithdrawAmountBeforeFee } from "./payout-utils";
import { WITHDRAW_FIAT_CURRENCIES } from "@/lib/wallet-currency-options";
import { formatWalletFiatDisplay } from "@/lib/format-money";
import { FinanceFieldLabel, financeInputClass } from "@/components/wallet/PaymentMethodField";
import { DEPOSIT_BUTTON_CLASS, WITHDRAW_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  networksMatch,
} from "./crypto-networks";
import { cn } from "@/lib/utils";
import { mobileBtnWrap } from "@/lib/mobile-ui";
import { useWithdrawalBlock } from "@/hooks/use-withdrawal-block";
import { WithdrawalBlockedAlert } from "@/components/wallet/WithdrawalBlockedAlert";
import { WithdrawalBlockedBanner } from "@/components/wallet/WithdrawalBlockedBanner";
import { useAuth } from "@/hooks/use-auth";
import { ProfitShareDialog } from "@/components/profit/ProfitShareDialog";
import type { ProfitSharePayload } from "@/lib/profit-share";
import { getShareUserDisplayName } from "@/lib/user-display-name";

type FormProps = {
  onSuccess?: () => void;
  compact?: boolean;
};

export function WithdrawToPersonalAccountForm({ onSuccess, compact }: FormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const referralCode = (user as { referralCode?: string } | null)?.referralCode;
  const userName = getShareUserDisplayName(user);
  const avatarUrl = user?.avatarUrl;
  const { blocked } = useWithdrawalBlock();
  const qc = useQueryClient();
  const { data: wallet, refetch: refetchWallet } = useGetWallet();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState<number | null>(null);
  const [method, setMethod] = useState<WalletWithdrawMethod>("upi");
  const [payoutConfirmed, setPayoutConfirmed] = useState(false);
  const [fiatCurrency, setFiatCurrency] = useState<string>("INR");
  const [cryptoSymbol, setCryptoSymbol] = useState("USDT");
  const [cryptoChain, setCryptoChain] = useState("TRC20");
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<ProfitSharePayload | null>(null);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [securityStep, setSecurityStep] = useState<"auth" | "email">("auth");
  const [withdrawPassword, setWithdrawPassword] = useState("");
  const [withdrawTotp, setWithdrawTotp] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [confirmationToken, setConfirmationToken] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [showWithdrawPassword, setShowWithdrawPassword] = useState(false);

  function payoutLabel(account: PaymentAccount): string {
    if (account.accountType === "upi") return `${account.label} · UPI ${account.upiId || ""}`.trim();
    if (account.accountType === "bank") {
      return `${account.label} · ${account.bankName || "Bank"} ****${String(account.accountNumber || "").slice(-4)}`;
    }
    if (account.accountType === "crypto") {
      return `${account.label} · ${account.cryptoSymbol || ""} ${account.cryptoNetwork || ""} ${account.walletAddress?.slice(0, 10) || ""}…`.trim();
    }
    return account.label;
  }

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<PaymentAccount[]>("/wallet/payment-accounts"),
  });

  const selected = accounts.find(a => a.id === paymentAccountId) ?? null;
  const isCrypto = method === "crypto";
  const isGateway = method === "gateway";

  const currency = isCrypto
    ? (cryptoSymbol as "BTC" | "ETH" | "USDT")
    : (fiatCurrency as "INR" | "USD" | "EUR");
  const available = walletBalanceForCurrency(currency, wallet as any);
  const maxWithdraw = maxWithdrawAmountBeforeFee(available);
  const parsedAmount = Number(amount);
  const amountExceedsBalance = withdrawAmountExceedsAvailable(parsedAmount, available);
  const amountError = amount.trim() !== "" && !Number.isNaN(parsedAmount)
    ? withdrawAmountErrorMessage(parsedAmount, available, currency)
    : null;
  const fiatDual = formatWalletFiatDisplay(wallet);

  useEffect(() => {
    setPayoutConfirmed(false);
  }, [method, paymentAccountId]);

  useEffect(() => {
    if (paymentAccountId !== null || method === "gateway") return;
    if (method === "crypto") {
      const filtered = accounts.filter(a =>
        a.accountType === "crypto" &&
        (a.cryptoSymbol || "USDT").toUpperCase() === cryptoSymbol.toUpperCase() &&
        networksMatch(a.cryptoNetwork, cryptoChain),
      );
      const def = filtered.find(a => a.isDefault) || filtered[0];
      if (def) setPaymentAccountId(def.id);
    } else {
      const filtered = accounts.filter(a => a.accountType === method);
      const def = filtered.find(a => a.isDefault) || filtered[0];
      if (def) setPaymentAccountId(def.id);
    }
  }, [accounts, method, paymentAccountId, cryptoSymbol, cryptoChain]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isGateway) {
      toast({ title: "Use UPI or Bank", description: "Gateway withdrawals are not supported. Choose UPI or Bank transfer.", variant: "destructive" });
      return;
    }
    if (!selected) {
      toast({ title: "Select a personal account", variant: "destructive" });
      return;
    }
    if (!payoutConfirmed) {
      toast({ title: "Confirm payout details", description: "Check the confirmation box before submitting.", variant: "destructive" });
      return;
    }
    if (isCrypto && selected.accountType === "crypto" && !networksMatch(selected.cryptoNetwork, cryptoChain)) {
      toast({ title: "Chain mismatch", description: `Selected account must use ${cryptoChain} network.`, variant: "destructive" });
      return;
    }

    const numAmount = Number(amount);
    if (numAmount <= 0 || Number.isNaN(numAmount)) {
      toast({ title: "Invalid amount", description: "Enter a valid withdrawal amount.", variant: "destructive" });
      return;
    }
    if (withdrawAmountExceedsAvailable(numAmount, available)) {
      toast({
        title: "Amount too high",
        description: withdrawAmountErrorMessage(numAmount, available, currency) || `Enter an amount less than or equal to ${formatWithdrawLimit(maxWithdraw, currency)}.`,
        variant: "destructive",
      });
      return;
    }

    setSecurityStep("auth");
    setWithdrawPassword("");
    setWithdrawTotp("");
    setEmailOtp("");
    setConfirmationToken(null);
    setSecurityOpen(true);
  }

  async function initiateWithdrawalSecurity() {
    if (!selected) return;
    const numAmount = Number(amount);
    setLoading(true);
    try {
      const data = await authFetchJson<any>("/wallet/payment-accounts/withdraw", {
        method: "POST",
        body: JSON.stringify({
          paymentAccountId: selected.id,
          amount: numAmount,
          currency,
          cryptoNetwork: isCrypto ? cryptoChain : undefined,
          password: withdrawPassword,
          totpCode: withdrawTotp,
        }),
      });
      if (data.requiresEmailConfirmation) {
        setConfirmationToken(data.confirmationToken);
        setMaskedEmail(data.maskedEmail || "");
        setSecurityStep("email");
        toast({ title: "Email confirmation sent", description: data.message || "Check your email for the confirmation code." });
        return;
      }
      finishWithdrawalSuccess(numAmount);
      setSecurityOpen(false);
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function confirmWithdrawalEmail() {
    if (!selected || !confirmationToken) return;
    const numAmount = Number(amount);
    setLoading(true);
    try {
      await authFetchJson("/wallet/payment-accounts/withdraw", {
        method: "POST",
        body: JSON.stringify({
          confirmationToken,
          emailOtp,
        }),
      });
      finishWithdrawalSuccess(numAmount);
      setSecurityOpen(false);
    } catch (err: any) {
      toast({ title: "Confirmation failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  function finishWithdrawalSuccess(numAmount: number) {
    if (!selected) return;
    toast({
      title: "Withdrawal submitted",
      description: isCrypto
        ? `${numAmount} ${cryptoSymbol} (${cryptoChain}) will be sent after approval.`
        : `Funds will be sent to your ${selected.accountType} account after approval.`,
    });
    setSharePayload({
      service: "withdrawal",
      profitAmount: numAmount,
      currency,
      detailLabel: payoutLabel(selected),
      userName,
      referralCode,
      avatarUrl,
      withdrawalPhase: "submitted",
    });
    setShareOpen(true);
    setAmount("");
    refetchWallet();
    qc.invalidateQueries({ queryKey: ["/api/wallet/payment-accounts"] });
    qc.invalidateQueries({ queryKey: ["/api/wallet/history"] });
    onSuccess?.();
  }

  if (blocked) {
    return <WithdrawalBlockedBanner />;
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading your accounts…</p>;
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-6 space-y-4">
        <p className="text-sm text-muted-foreground">
          Add a personal bank, UPI, or crypto account to withdraw from your portal wallet.
        </p>
        <Link href="/account?tab=payout">
          <Button className={WITHDRAW_BUTTON_CLASS}>
            <Plus className="h-4 w-4 mr-2" /> Add Personal Account
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-5">
      {!compact && (
        <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 min-w-0">
          <div className="p-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02]">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Fiat Wallet</p>
            <p className="text-lg font-bold">{fiatDual.primary}</p>
            {fiatDual.secondary && (
              <p className="text-xs text-muted-foreground mt-0.5">{fiatDual.secondary}</p>
            )}
          </div>
          <div className="p-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02]">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Crypto Wallet</p>
            <p className="text-lg font-bold">{(wallet?.cryptoBalance || 0).toLocaleString()} USDT</p>
          </div>
        </div>
      )}

      <WalletWithdrawMethodPanel
        accounts={accounts}
        method={method}
        onMethodChange={setMethod}
        selectedAccountId={paymentAccountId}
        onSelectAccount={setPaymentAccountId}
        onAccountsUpdated={() => qc.invalidateQueries({ queryKey: ["/api/wallet/payment-accounts"] })}
        payoutConfirmed={payoutConfirmed}
        onPayoutConfirmedChange={setPayoutConfirmed}
        submitting={loading}
        cryptoSymbol={cryptoSymbol}
        onCryptoSymbolChange={setCryptoSymbol}
        cryptoChain={cryptoChain}
        onCryptoChainChange={setCryptoChain}
      />

      {!isGateway && (
        <div className="space-y-4 pt-2 border-t border-border dark:border-white/10">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Step 2 — Withdrawal amount</p>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the amount to withdraw from your portal wallet balance.
            </p>
          </div>

          {!isCrypto && (
            <div className="space-y-2">
              <FinanceFieldLabel tone="currency">Payout currency</FinanceFieldLabel>
              <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
                <SelectTrigger className={financeInputClass()}><SelectValue /></SelectTrigger>
                <SelectContent className="border-border bg-popover">
                  {WITHDRAW_FIAT_CURRENCIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">
                Available balance: {formatWithdrawLimit(available, fiatCurrency)}
                {fiatCurrency !== "USD" && fiatDual.secondary ? ` (${fiatDual.primary} USD wallet)` : ""}
              </p>
            </div>
          )}

          {isCrypto && (
            <p className="text-[10px] text-muted-foreground">
              Available balance: {formatWithdrawLimit(available, cryptoSymbol)}
            </p>
          )}

          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 min-w-0">
              <FinanceFieldLabel tone="amount">Amount ({currency})</FinanceFieldLabel>
              <button
                type="button"
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 max-w-full truncate"
                onClick={() => setAmount(String(maxWithdraw))}
              >
                Max: {formatWithdrawLimit(maxWithdraw, currency)}
              </button>
            </div>
            <Input
              type="number"
              required
              min={0.01}
              max={maxWithdraw > 0 ? maxWithdraw : undefined}
              step="any"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className={financeInputClass(amountError ? "border-red-500/70 focus-visible:ring-red-500/40" : undefined)}
              aria-invalid={Boolean(amountError)}
            />
            {amountError ? (
              <p className="text-xs text-red-400">{amountError}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Max withdrawable (after fee): {formatWithdrawLimit(maxWithdraw, currency)}. Processing fee may apply.
              </p>
            )}
          </div>

          <Button
            type="submit"
            size="wrap"
            disabled={loading || !selected || !payoutConfirmed || amountExceedsBalance || !amount.trim() || parsedAmount <= 0}
            className={cn("w-full font-bold", WITHDRAW_BUTTON_CLASS, mobileBtnWrap)}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <ArrowUpRight className="h-4 w-4 shrink-0" />}
            <span>Submit withdrawal request</span>
          </Button>
        </div>
      )}

      {!compact && (
        <p className="text-xs text-muted-foreground text-center">
          Need another account? <Link href="/account?tab=payout" className="text-amber-600 dark:text-amber-400 hover:underline">Manage personal accounts</Link>
        </p>
      )}
    </form>
    <Dialog open={securityOpen} onOpenChange={setSecurityOpen}>
      <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            {securityStep === "auth" ? "Withdrawal Security" : "Email Confirmation"}
          </DialogTitle>
          <DialogDescription>
            {securityStep === "auth"
              ? "Enter your password and Google Authenticator code to authorize this withdrawal."
              : `Enter the 6-digit code sent to ${maskedEmail || "your email"}.`}
          </DialogDescription>
        </DialogHeader>
        {securityStep === "auth" ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Account Password</Label>
              <div className="relative">
                <Input type={showWithdrawPassword ? "text" : "password"} value={withdrawPassword}
                  onChange={e => setWithdrawPassword(e.target.value)} className="pr-10" />
                <button type="button" className="absolute right-3 top-2.5 text-muted-foreground"
                  onClick={() => setShowWithdrawPassword(v => !v)}>
                  {showWithdrawPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Authenticator Code</Label>
              <Input inputMode="numeric" maxLength={6} placeholder="000000" value={withdrawTotp}
                onChange={e => setWithdrawTotp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-xl tracking-[0.4em] font-mono" />
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              disabled={loading || !withdrawPassword || withdrawTotp.length !== 6}
              onClick={initiateWithdrawalSecurity}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Continue — Send Email Confirmation"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <Input inputMode="numeric" maxLength={6} placeholder="000000" value={emailOtp}
              onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ""))}
              className="text-center text-2xl tracking-[0.5em] font-mono h-14" autoFocus />
            <Button className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              disabled={loading || emailOtp.length !== 6} onClick={confirmWithdrawalEmail}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Withdrawal"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
    <ProfitShareDialog open={shareOpen} onOpenChange={setShareOpen} payload={sharePayload} />
    </>
  );
}

type DialogProps = FormProps & {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function WithdrawToPersonalAccountDialog({ onSuccess, trigger, open, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [blockAlertOpen, setBlockAlertOpen] = useState(false);
  const { blocked } = useWithdrawalBlock();
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  const defaultTrigger = (
    <Button className={WITHDRAW_BUTTON_CLASS}>
      <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
    </Button>
  );

  const triggerNode = trigger ?? defaultTrigger;

  if (blocked) {
    return (
      <>
        <span
          className="inline-flex w-full"
          onClick={() => setBlockAlertOpen(true)}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") setBlockAlertOpen(true); }}
          role="button"
          tabIndex={0}
        >
          {triggerNode}
        </span>
        <WithdrawalBlockedAlert open={blockAlertOpen} onOpenChange={setBlockAlertOpen} />
      </>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className={WITHDRAW_BUTTON_CLASS}>
              <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="dialog-scroll-content bg-background border-border dark:border-white/10 max-w-xl w-[calc(100vw-2rem)] overflow-x-hidden p-0 gap-0">
        <DialogHeader className="px-4 pt-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" /> Wallet → Personal Account
          </DialogTitle>
          <DialogDescription>
            UPI, bank transfer, or crypto — same payout options as Sell Crypto on the exchange.
          </DialogDescription>
        </DialogHeader>
        <div className="dialog-form-inner px-4 pb-4 sm:px-6 sm:pb-6 min-w-0">
          <WithdrawToPersonalAccountForm
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
