import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useGetWallet } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { Link } from "wouter";
import { ArrowUpRight, Building2, QrCode, Wallet, Plus, Landmark } from "lucide-react";
import { PersonalPaymentAccounts, type PaymentAccount } from "./PersonalPaymentAccounts";
import {
  formatPayoutAccount,
  methodLabelForAccount,
  walletBalanceForCurrency,
} from "./payout-utils";
import { WITHDRAW_FIAT_CURRENCIES } from "@/lib/wallet-currency-options";
import { formatCurrencyAmount, formatUsdWithInr } from "@/lib/format-money";
import {
  CRYPTO_SYMBOLS,
  defaultNetworkForSymbol,
  formatCryptoLabel,
  networksForSymbol,
  networksMatch,
} from "./crypto-networks";

const TYPE_ICON = { bank: Building2, upi: QrCode, crypto: Wallet };

type FormProps = {
  onSuccess?: () => void;
  compact?: boolean;
};

export function WithdrawToPersonalAccountForm({ onSuccess, compact }: FormProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: wallet, refetch: refetchWallet } = useGetWallet();
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [payoutMode, setPayoutMode] = useState<"fiat" | "crypto">("fiat");
  const [fiatCurrency, setFiatCurrency] = useState<string>("INR");
  const [cryptoSymbol, setCryptoSymbol] = useState("USDT");
  const [cryptoChain, setCryptoChain] = useState("TRC20");

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<PaymentAccount[]>("/wallet/payment-accounts"),
  });

  const cryptoAccounts = accounts.filter(a => a.accountType === "crypto");
  const fiatAccounts = accounts.filter(a => a.accountType !== "crypto");

  const filteredAccounts = payoutMode === "crypto"
    ? cryptoAccounts.filter(a =>
        (a.cryptoSymbol || "USDT").toUpperCase() === cryptoSymbol.toUpperCase() &&
        networksMatch(a.cryptoNetwork, cryptoChain),
      )
    : fiatAccounts;

  const selected = filteredAccounts.find(a => String(a.id) === paymentAccountId)
    ?? accounts.find(a => String(a.id) === paymentAccountId);
  const currency = payoutMode === "crypto"
    ? (cryptoSymbol as "BTC" | "ETH" | "USDT")
    : (fiatCurrency as "INR" | "USD" | "EUR");
  const available = walletBalanceForCurrency(currency, wallet as any);
  const fiatUsd = wallet?.fiatBalance || 0;
  const fiatDual = formatUsdWithInr(fiatUsd, (wallet as any)?.fiatBalanceInr ?? (wallet as any)?.inrBalance);

  useEffect(() => {
    if (cryptoAccounts.length > 0 && payoutMode === "fiat" && fiatAccounts.length === 0) {
      setPayoutMode("crypto");
    }
  }, [cryptoAccounts.length, fiatAccounts.length, payoutMode]);

  useEffect(() => {
    if (payoutMode !== "crypto") return;
    setCryptoChain(defaultNetworkForSymbol(cryptoSymbol));
  }, [cryptoSymbol, payoutMode]);

  useEffect(() => {
    if (filteredAccounts.length === 0) {
      setPaymentAccountId("");
      return;
    }
    const stillValid = filteredAccounts.some(a => String(a.id) === paymentAccountId);
    if (!stillValid) {
      const def = filteredAccounts.find(a => a.isDefault) || filteredAccounts[0];
      setPaymentAccountId(String(def.id));
    }
  }, [filteredAccounts, paymentAccountId, payoutMode, cryptoSymbol, cryptoChain]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      const hint = payoutMode === "crypto"
        ? `Add a ${formatCryptoLabel(cryptoSymbol, cryptoChain)} wallet in My Accounts.`
        : "Add a bank or UPI account first.";
      toast({ title: "Select a personal account", description: hint, variant: "destructive" });
      return;
    }
    if (payoutMode === "crypto" && selected.accountType === "crypto") {
      if (!networksMatch(selected.cryptoNetwork, cryptoChain)) {
        toast({
          title: "Chain mismatch",
          description: `Selected account must use ${cryptoChain} network.`,
          variant: "destructive",
        });
        return;
      }
    }
    const numAmount = Number(amount);
    if (numAmount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }
    if (numAmount > available) {
      toast({
        title: "Insufficient balance",
        description: `Available: ${formatCurrencyAmount(available, currency)}`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await authFetchJson("/wallet/payment-accounts/withdraw", {
        method: "POST",
        body: JSON.stringify({
          paymentAccountId: selected.id,
          amount: numAmount,
          currency,
          cryptoNetwork: payoutMode === "crypto" ? cryptoChain : undefined,
        }),
      });
      toast({
        title: "Withdrawal submitted",
        description: payoutMode === "crypto"
          ? `${numAmount} ${cryptoSymbol} (${cryptoChain}) will be sent after approval.`
          : `Funds will be sent to your ${selected.accountType} account after approval.`,
      });
      setAmount("");
      refetchWallet();
      qc.invalidateQueries({ queryKey: ["/api/wallet/payment-accounts"] });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Withdrawal failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
        <Link href="/wallet?tab=accounts">
          <Button className="bg-amber-500 text-black">
            <Plus className="h-4 w-4 mr-2" /> Add Personal Account
          </Button>
        </Link>
      </div>
    );
  }

  const Icon = selected ? TYPE_ICON[selected.accountType] : Wallet;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!compact && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Fiat Wallet</p>
            <p className="text-lg font-bold">{fiatDual.primary}</p>
            {fiatDual.secondary && (
              <p className="text-xs text-muted-foreground mt-0.5">{fiatDual.secondary}</p>
            )}
          </div>
          <div className="p-3 rounded-lg border border-white/10 bg-white/[0.02]">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Crypto Wallet</p>
            <p className="text-lg font-bold">{(wallet?.cryptoBalance || 0).toLocaleString()} USDT</p>
          </div>
        </div>
      )}

      {payoutMode === "fiat" && (
        <div className="space-y-2">
          <Label>Payout currency</Label>
          <Select value={fiatCurrency} onValueChange={setFiatCurrency}>
            <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
            <SelectContent>
              {WITHDRAW_FIAT_CURRENCIES.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Available: {formatCurrencyAmount(available, fiatCurrency)}
            {fiatCurrency !== "USD" && fiatDual.secondary ? ` (${fiatDual.primary} USD wallet)` : ""}
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label>Withdrawal type</Label>
        <Select value={payoutMode} onValueChange={v => setPayoutMode(v as "fiat" | "crypto")}>
          <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="fiat">Bank / UPI (Fiat)</SelectItem>
            <SelectItem value="crypto">Crypto Wallet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {payoutMode === "crypto" && (
        <div className="space-y-3 p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
          <p className="text-xs font-semibold text-orange-300">Select asset & chain</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Asset</Label>
              <Select value={cryptoSymbol} onValueChange={setCryptoSymbol}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CRYPTO_SYMBOLS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Chain</Label>
              <Select value={cryptoChain} onValueChange={setCryptoChain}>
                <SelectTrigger className="bg-white/5 border-white/10 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {networksForSymbol(cryptoSymbol).map(n => (
                    <SelectItem key={n.value} value={n.value}>
                      {n.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {cryptoSymbol === "USDT" && (
            <p className="text-[11px] text-muted-foreground">
              USDT supports <strong className="text-foreground">TRC20</strong> (Tron), <strong className="text-foreground">ERC20</strong> (Ethereum), and <strong className="text-foreground">BEP20</strong> (BNB Chain). Pick the chain that matches your wallet address.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Withdraw to personal account</Label>
        {filteredAccounts.length === 0 ? (
          <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-sm text-muted-foreground space-y-2">
            <p>
              {payoutMode === "crypto"
                ? `No saved ${formatCryptoLabel(cryptoSymbol, cryptoChain)} wallet yet.`
                : "No bank or UPI account saved yet."}
            </p>
            <Link href={`/wallet?tab=accounts${payoutMode === "crypto" ? "&type=crypto" : ""}`}>
              <Button type="button" size="sm" variant="outline" className="border-white/10">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add account
              </Button>
            </Link>
          </div>
        ) : (
          <Select value={paymentAccountId} onValueChange={setPaymentAccountId}>
            <SelectTrigger className="bg-white/5 border-white/10">
              <SelectValue placeholder="Choose account" />
            </SelectTrigger>
            <SelectContent>
              {filteredAccounts.map(acc => (
                <SelectItem key={acc.id} value={String(acc.id)}>
                  {acc.label}
                  {acc.accountType === "crypto"
                    ? ` — ${formatCryptoLabel(acc.cryptoSymbol, acc.cryptoNetwork)}`
                    : ` — ${acc.accountType.toUpperCase()}`}
                  {acc.isDefault ? " (default)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {selected && (
        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex gap-3">
          <div className="p-2 rounded-lg bg-primary/10 h-fit"><Icon className="h-4 w-4 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <p className="font-medium text-sm">{selected.label}</p>
              <Badge variant="outline" className="text-[10px] capitalize">{selected.accountType}</Badge>
              {selected.accountType === "crypto" && selected.cryptoNetwork && (
                <Badge className="text-[10px] bg-orange-500/20 text-orange-300 border-orange-500/30">
                  {selected.cryptoNetwork.toUpperCase()}
                </Badge>
              )}
              <Badge variant="outline" className="text-[10px]">{methodLabelForAccount(selected)}</Badge>
            </div>
            <p className="text-xs text-muted-foreground break-all">{formatPayoutAccount(selected)}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Amount ({currency})</Label>
          <button
            type="button"
            className="text-xs text-amber-400 hover:underline"
            onClick={() => setAmount(String(available))}
          >
            Max: {available.toLocaleString()}
          </button>
        </div>
        <Input
          type="number"
          required
          min={0.01}
          step="any"
          placeholder="0.00"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="bg-white/5 border-white/10"
        />
        <p className="text-[11px] text-muted-foreground">
          Deducted from your {["BTC", "ETH", "USDT"].includes(currency) ? "crypto" : "fiat"} wallet. Processing fee may apply.
        </p>
      </div>

      <Button type="submit" disabled={loading || !selected} className="w-full bg-amber-500 text-black font-semibold">
        {loading ? "Submitting…" : <><ArrowUpRight className="h-4 w-4 mr-2" />Withdraw to Personal Account</>}
      </Button>

      {!compact && (
        <p className="text-xs text-muted-foreground text-center">
          Need another account? <Link href="/wallet?tab=accounts" className="text-amber-400 hover:underline">Manage personal accounts</Link>
        </p>
      )}
    </form>
  );
}

type DialogProps = FormProps & {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function WithdrawToPersonalAccountDialog({ onSuccess, trigger, open, onOpenChange }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;
  const setDialogOpen = isControlled ? onOpenChange! : setInternalOpen;

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button className="bg-white/10 hover:bg-white/15 text-white font-semibold">
              <ArrowUpRight className="mr-2 h-4 w-4" /> Withdraw
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="bg-[#050A14] border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-amber-400" /> Wallet → Personal Account
          </DialogTitle>
          <DialogDescription>
            Transfer funds from your portal wallet balance to your saved bank, UPI, or crypto account.
          </DialogDescription>
        </DialogHeader>
        <WithdrawToPersonalAccountForm
          compact
          onSuccess={() => {
            setDialogOpen(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}