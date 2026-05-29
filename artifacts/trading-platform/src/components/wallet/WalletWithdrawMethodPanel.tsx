import { useEffect, useMemo } from "react";
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
import { Building2, CreditCard, Smartphone, Coins, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  PaymentMethodFieldLabel,
  PaymentMethodSelect,
  PaymentMethodTabsList,
  PaymentMethodTabsTrigger,
  financeInputClass,
} from "@/components/wallet/PaymentMethodField";
import {
  PaymentMethodCategoryStrip,
} from "@/components/wallet/PaymentMethodsShowcase";
import { DepositWithdrawalMethodsBanner } from "@/components/finance/DepositWithdrawalMethodsBanner";
import { mobileBtnWrap } from "@/lib/mobile-ui";

export type WalletWithdrawMethod = "upi" | "bank" | "gateway" | "crypto";

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

const TAB_META: { value: WalletWithdrawMethod; label: string; icon: typeof Smartphone }[] = [
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "bank", label: "Bank", icon: Building2 },
  { value: "gateway", label: "Gateway", icon: CreditCard },
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
          Withdraw to your saved UPI, bank, or crypto wallet — same payout options as Sell Crypto on the exchange.
        </p>
      </div>

      <Tabs value={method} onValueChange={v => handleTabChange(v as WalletWithdrawMethod)}>
        <PaymentMethodTabsList>
          {TAB_META.map(({ value, label, icon: Icon }) => (
            <PaymentMethodTabsTrigger key={value} value={value} tone={value}>
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </PaymentMethodTabsTrigger>
          ))}
        </PaymentMethodTabsList>

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

        <TabsContent value="bank" className="mt-3 min-w-0 space-y-3">
          <PaymentMethodCategoryStrip category="bank" label="Bank transfer rails" />
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

        <TabsContent value="gateway" className="mt-3 space-y-3 min-w-0">
          <PaymentMethodCategoryStrip category="gateway" label="Cards & payment gateways" />
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 sm:p-4 space-y-3 min-w-0">
            <p className="text-sm font-medium text-violet-800 dark:text-violet-200/90">Payment gateway withdrawals</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instant online gateway payouts are not available for wallet withdrawals. Funds are sent manually to your verified{" "}
              <strong className="text-foreground">UPI</strong> or <strong className="text-foreground">bank</strong> account after admin approval.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button type="button" size="wrap" variant="outline" className={cn("border-amber-500/30 text-amber-700 dark:text-amber-400", mobileBtnWrap)} onClick={() => handleTabChange("upi")}>
                Use UPI
              </Button>
              <Button type="button" size="wrap" variant="outline" className={cn("border-amber-500/30 text-amber-700 dark:text-amber-400", mobileBtnWrap)} onClick={() => handleTabChange("bank")}>
                Use Bank transfer
              </Button>
            </div>
          </div>
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
