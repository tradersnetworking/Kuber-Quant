import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { FiatPayoutAccountPanel } from "@/components/exchange/FiatPayoutAccountPanel";
import { PayoutAccountDetailsCard } from "@/components/wallet/PayoutAccountDetailsCard";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import {
  CRYPTO_SYMBOLS,
  defaultNetworkForSymbol,
  formatCryptoLabel,
  networksForSymbol,
  networksMatch,
} from "@/components/wallet/crypto-networks";
import { Building2, Smartphone, Coins, Plus, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  PaymentMethodCategorySelect,
  PaymentMethodFieldLabel,
  PaymentMethodSelect,
  financeInputClass,
} from "@/components/wallet/PaymentMethodField";
import { DepositWithdrawalMethodsBanner } from "@/components/finance/DepositWithdrawalMethodsBanner";
import { fetchPaymentMethodVisibility, ALL_ENABLED } from "@/lib/payment-method-visibility";

export type WalletWithdrawMethod = "upi" | "digital_rupee" | "bank" | "gateway" | "crypto";

type Props = {
  accounts: PaymentAccount[];
  method: WalletWithdrawMethod;
  onMethodChange: (v: WalletWithdrawMethod) => void;
  selectedAccountId: number | null;
  onSelectAccount: (id: number | null) => void;
  onAccountsUpdated: () => void;
  payoutConfirmed: boolean;
  onPayoutConfirmedChange: (v: boolean) => void;
  submitting?: boolean;
  cryptoSymbol: string;
  onCryptoSymbolChange: (v: string) => void;
  cryptoChain: string;
  onCryptoChainChange: (v: string) => void;
};

// Gateway is intentionally excluded — online gateways are deposit-only; payouts go to
// saved UPI / Digital Rupee / bank / crypto destinations after admin approval.
const TAB_META: { value: WalletWithdrawMethod; label: string; icon: typeof Smartphone }[] = [
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "digital_rupee", label: "Digital Rupee", icon: IndianRupee },
  { value: "bank", label: "Bank", icon: Building2 },
  { value: "crypto", label: "Crypto", icon: Coins },
];

export function WalletWithdrawMethodPanel({
  accounts,
  method,
  onMethodChange,
  selectedAccountId,
  onSelectAccount,
  onAccountsUpdated,
  payoutConfirmed,
  onPayoutConfirmedChange,
  submitting,
  cryptoSymbol,
  onCryptoSymbolChange,
  cryptoChain,
  onCryptoChainChange,
}: Props) {
  const { data: visibility } = useQuery({
    queryKey: ["/api/payments/method-visibility"],
    queryFn: fetchPaymentMethodVisibility,
    staleTime: 60_000,
  });
  const enabled = visibility?.withdrawal ?? ALL_ENABLED;
  const visibleTabs = TAB_META.filter(t => enabled[t.value] !== false);

  const cryptoAccounts = useMemo(
    () => accounts.filter(a =>
      a.accountType === "crypto" &&
      (a.cryptoSymbol || "USDT").toUpperCase() === cryptoSymbol.toUpperCase() &&
      networksMatch(a.cryptoNetwork, cryptoChain),
    ),
    [accounts, cryptoSymbol, cryptoChain],
  );

  const selectedCrypto = cryptoAccounts.find(a => a.id === selectedAccountId) ?? null;

  useEffect(() => {
    if (method !== "crypto") return;
    onCryptoChainChange(defaultNetworkForSymbol(cryptoSymbol));
  }, [cryptoSymbol, method, onCryptoChainChange]);

  useEffect(() => {
    if (method !== "crypto") return;
    if (cryptoAccounts.length === 0) {
      onSelectAccount(null);
      return;
    }
    const stillValid = cryptoAccounts.some(a => a.id === selectedAccountId);
    if (!stillValid) {
      const def = cryptoAccounts.find(a => a.isDefault) || cryptoAccounts[0];
      onSelectAccount(def.id);
    }
  }, [method, cryptoAccounts, selectedAccountId, onSelectAccount]);

  const handleTabChange = (v: WalletWithdrawMethod) => {
    onMethodChange(v);
    onPayoutConfirmedChange(false);
    if (v === "crypto") {
      const first = cryptoAccounts[0];
      onSelectAccount(first?.id ?? null);
    } else if (v !== "gateway") {
      const filtered = accounts.filter(a => a.accountType === v);
      const def = filtered.find(a => a.isDefault) || filtered[0];
      onSelectAccount(def?.id ?? null);
    } else {
      onSelectAccount(null);
    }
  };

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      <DepositWithdrawalMethodsBanner />

      <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent p-3 sm:p-4 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200/90">Step 1 — Choose withdrawal method</p>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Withdraw to your saved UPI, Digital Rupee, bank, or crypto wallet — same payout options as Sell Crypto on the exchange.
        </p>
      </div>

      <Tabs value={method} onValueChange={v => handleTabChange(v as WalletWithdrawMethod)}>
        <PaymentMethodCategorySelect
          label="Step 1 — Choose withdrawal method"
          value={method}
          onValueChange={v => handleTabChange(v as WalletWithdrawMethod)}
          options={visibleTabs.map(({ value, label, icon }) => ({ value, label, icon }))}
        />

        <TabsContent value="upi" className="mt-3 min-w-0 space-y-3">
          <FiatPayoutAccountPanel
            accounts={accounts}
            selectedId={selectedAccountId}
            onSelect={onSelectAccount}
            onAccountsUpdated={onAccountsUpdated}
            payoutConfirmed={payoutConfirmed}
            onPayoutConfirmedChange={onPayoutConfirmedChange}
            submitting={submitting}
            fixedMethod="upi"
            context="wallet"
          />
        </TabsContent>

        <TabsContent value="digital_rupee" className="mt-3 min-w-0 space-y-3">
          <FiatPayoutAccountPanel
            accounts={accounts}
            selectedId={selectedAccountId}
            onSelect={onSelectAccount}
            onAccountsUpdated={onAccountsUpdated}
            payoutConfirmed={payoutConfirmed}
            onPayoutConfirmedChange={onPayoutConfirmedChange}
            submitting={submitting}
            fixedMethod="digital_rupee"
            context="wallet"
          />
        </TabsContent>

        <TabsContent value="bank" className="mt-3 min-w-0 space-y-3">
          <FiatPayoutAccountPanel
            accounts={accounts}
            selectedId={selectedAccountId}
            onSelect={onSelectAccount}
            onAccountsUpdated={onAccountsUpdated}
            payoutConfirmed={payoutConfirmed}
            onPayoutConfirmedChange={onPayoutConfirmedChange}
            submitting={submitting}
            fixedMethod="bank"
            context="wallet"
          />
        </TabsContent>

        <TabsContent value="crypto" className="mt-3 space-y-4 min-w-0">
          <div className="space-y-3 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
            <p className="text-xs font-semibold text-orange-700 dark:text-orange-300">Select asset & chain</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <PaymentMethodFieldLabel tone="crypto">Asset</PaymentMethodFieldLabel>
                <Select value={cryptoSymbol} onValueChange={onCryptoSymbolChange}>
                  <SelectTrigger className={financeInputClass("h-9 font-medium")}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {CRYPTO_SYMBOLS.map(s => (
                      <SelectItem key={s} value={s} className="focus:bg-orange-500/15 dark:focus:text-orange-200">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <PaymentMethodFieldLabel tone="crypto">Chain</PaymentMethodFieldLabel>
                <Select value={cryptoChain} onValueChange={onCryptoChainChange}>
                  <SelectTrigger className={financeInputClass("h-9 font-medium")}><SelectValue /></SelectTrigger>
                  <SelectContent className="border-border bg-popover">
                    {networksForSymbol(cryptoSymbol).map(n => (
                      <SelectItem key={n.value} value={n.value} className="focus:bg-orange-500/15 dark:focus:text-orange-200">{n.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {cryptoAccounts.length === 0 ? (
              <div className="p-3 rounded-lg border border-orange-500/25 bg-orange-500/5 text-sm text-muted-foreground space-y-2">
                <PaymentMethodFieldLabel tone="crypto" className="block mb-1">
                  Select saved crypto wallet
                </PaymentMethodFieldLabel>
                <p>No saved {formatCryptoLabel(cryptoSymbol, cryptoChain)} wallet yet.</p>
                <Link href="/account?tab=payout&type=crypto">
                  <Button type="button" size="sm" variant="outline" className="border-orange-500/30 text-orange-700 dark:text-orange-300">
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add crypto wallet
                  </Button>
                </Link>
              </div>
            ) : (
              <PaymentMethodSelect
                tone="crypto"
                label="Select saved crypto wallet"
                value={selectedAccountId ? String(selectedAccountId) : ""}
                onValueChange={v => {
                  onSelectAccount(Number(v));
                  onPayoutConfirmedChange(false);
                }}
                placeholder="Choose wallet"
                options={cryptoAccounts.map(a => ({
                  value: String(a.id),
                  label: `${a.label} — ${formatCryptoLabel(a.cryptoSymbol, a.cryptoNetwork)}${a.isDefault ? " (default)" : ""}`,
                }))}
              />
            )}
          </div>

          {selectedCrypto && (
            <div className="space-y-2">
              <PaymentMethodFieldLabel tone="crypto">Wallet details</PaymentMethodFieldLabel>
              <PayoutAccountDetailsCard account={selectedCrypto} />
            </div>
          )}

          <div className={cn(
            "rounded-xl border p-4 space-y-3",
            payoutConfirmed ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5",
          )}>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {selectedCrypto
                ? `${cryptoSymbol} on ${cryptoChain} will be sent to wallet ${selectedCrypto.walletAddress?.slice(0, 8)}… after admin approval.`
                : `Select a saved ${formatCryptoLabel(cryptoSymbol, cryptoChain)} wallet or add one in My Accounts.`}
            </p>
            <div className="flex items-start gap-3">
              <Checkbox
                id="crypto-withdraw-confirm"
                checked={payoutConfirmed}
                disabled={!selectedCrypto}
                onCheckedChange={v => onPayoutConfirmedChange(v === true)}
                className="mt-0.5 border-amber-500/40 data-[state=checked]:bg-amber-500"
              />
              <Label htmlFor="crypto-withdraw-confirm" className="text-sm font-normal leading-snug cursor-pointer">
                I confirm the crypto wallet address and network are correct. Wrong network may result in lost funds.
              </Label>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
