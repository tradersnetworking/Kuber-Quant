import { useMemo } from "react";
import { Link } from "wouter";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { UserQrUploadButton } from "@/components/wallet/UserQrUploadButton";
import { PayoutAccountDetailsCard } from "@/components/wallet/PayoutAccountDetailsCard";
import {
  resolveDepositQrSrc,
  resolvePayoutQrSrc,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { networksMatch, formatCryptoLabel } from "@/components/wallet/crypto-networks";
import type { PaymentAccount } from "@/components/wallet/payout-account-types";
import { exchangeChainDisplay } from "@/lib/exchange-display";
import { CryptoIcon } from "@/components/exchange/CryptoIcon";
import { Wallet, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinanceFieldLabel, financeInputClass, PaymentMethodSelect } from "@/components/wallet/PaymentMethodField";

export type ReceiveMode = "platform" | "personal";

type Props = {
  symbol: string;
  network: string;
  cryptoAccounts: PaymentAccount[];
  receiveMode: ReceiveMode;
  onReceiveModeChange: (mode: ReceiveMode) => void;
  selectedAccountId: number | null;
  onSelectAccount: (id: number | null) => void;
  walletAddress: string;
  onWalletAddressChange: (v: string) => void;
  walletQrUrl: string;
  onWalletQrUrlChange: (v: string) => void;
  useCustomWallet: boolean;
  onUseCustomWalletChange: (v: boolean) => void;
  receiveConfirmed: boolean;
  onReceiveConfirmedChange: (v: boolean) => void;
  submitting?: boolean;
};

function matchingCryptoAccounts(accounts: PaymentAccount[], symbol: string, network: string) {
  return accounts.filter(a =>
    a.accountType === "crypto"
    && (a.cryptoSymbol || "").toUpperCase() === symbol.toUpperCase()
    && networksMatch(a.cryptoNetwork, network),
  );
}

function quotePreview(symbol: string, network: string, address: string) {
  return `${symbol.toUpperCase()} on ${exchangeChainDisplay(symbol, network)} will be sent to ${address.slice(0, 10)}…${address.slice(-6)} after fiat payment is verified.`;
}

export function ReceiveCryptoWalletPanel({
  symbol,
  network,
  cryptoAccounts,
  receiveMode,
  onReceiveModeChange,
  selectedAccountId,
  onSelectAccount,
  walletAddress,
  onWalletAddressChange,
  walletQrUrl,
  onWalletQrUrlChange,
  useCustomWallet,
  onUseCustomWalletChange,
  receiveConfirmed,
  onReceiveConfirmedChange,
  submitting = false,
}: Props) {
  const matching = useMemo(
    () => matchingCryptoAccounts(cryptoAccounts, symbol, network),
    [cryptoAccounts, symbol, network],
  );

  const selectedAccount = matching.find(a => a.id === selectedAccountId) ?? null;
  const trimmedAddress = walletAddress.trim();
  const displayAddress = useCustomWallet
    ? trimmedAddress
    : (selectedAccount?.walletAddress?.trim() || trimmedAddress);

  const needsManualWallet = receiveMode === "personal" && (
    useCustomWallet
    || matching.length === 0
    || !selectedAccount?.walletAddress?.trim()
  );

  const setPlatformOn = (on: boolean) => {
    if (on) {
      onReceiveModeChange("platform");
      onReceiveConfirmedChange(false);
    } else if (receiveMode === "platform") {
      onReceiveModeChange("personal");
      onReceiveConfirmedChange(false);
    }
  };

  const setPersonalOn = (on: boolean) => {
    if (on) {
      onReceiveModeChange("personal");
      onReceiveConfirmedChange(false);
      if (!selectedAccountId && matching[0]) {
        onSelectAccount(matching[0].id);
        onWalletAddressChange(matching[0].walletAddress || "");
        onWalletQrUrlChange(matching[0].walletQrUrl || "");
        onUseCustomWalletChange(false);
      }
    } else if (receiveMode === "personal") {
      onReceiveModeChange("platform");
      onReceiveConfirmedChange(false);
    }
  };

  const handleSelectAccount = (id: number) => {
    const acc = matching.find(a => a.id === id);
    onSelectAccount(id);
    onUseCustomWalletChange(false);
    onWalletAddressChange(acc?.walletAddress || "");
    onWalletQrUrlChange(acc?.walletQrUrl || "");
    onReceiveConfirmedChange(false);
  };

  const confirmationNote = receiveMode === "platform"
    ? `${symbol.toUpperCase()} on ${exchangeChainDisplay(symbol, network)} will be credited to your platform wallet after fiat payment is verified.`
    : displayAddress
      ? quotePreview(symbol, network, displayAddress)
      : `Select or enter your personal ${formatCryptoLabel(symbol, network)} wallet to receive crypto.`;

  const canConfirm = receiveMode === "platform"
    || (needsManualWallet ? trimmedAddress.length > 0 : Boolean(displayAddress));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4">
        <div className="flex items-center gap-3">
          <CryptoIcon symbol={symbol} network={network} size="sm" />
          <div>
            <p className="text-sm font-medium text-emerald-200/90">Receiving crypto wallet</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose where {symbol.toUpperCase()} on {exchangeChainDisplay(symbol, network)} will be sent after payment.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Credit to platform wallet</p>
              <p className="text-[11px] text-muted-foreground">Crypto stays in your Kuber wallet balance</p>
            </div>
          </div>
          <Switch checked={receiveMode === "platform"} onCheckedChange={setPlatformOn} />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] px-3 py-2.5">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium">Personal wallet</p>
              <p className="text-[11px] text-muted-foreground">Send to your external wallet address</p>
            </div>
          </div>
          <Switch checked={receiveMode === "personal"} onCheckedChange={setPersonalOn} />
        </div>
      </div>

      {receiveMode === "personal" && (
        <div className="space-y-3">
          {matching.length > 0 && !useCustomWallet && (
            <div className="space-y-2">
            <PaymentMethodSelect
              tone="crypto"
              label="Select your saved wallet"
              value={selectedAccountId ? String(selectedAccountId) : ""}
              onValueChange={v => handleSelectAccount(Number(v))}
              placeholder="Choose personal crypto wallet"
              options={matching.map(a => ({
                value: String(a.id),
                label: `${a.label} — ${a.walletAddress?.slice(0, 14)}…`,
              }))}
            />
            </div>
          )}

          {matching.length === 0 && !useCustomWallet && (
            <p className="text-xs text-amber-300/90 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2">
              No saved {formatCryptoLabel(symbol, network)} wallet found. Enter your wallet address and QR below, or add one in{" "}
              <Link href="/account?tab=payout&type=crypto" className="text-amber-600 dark:text-amber-400 underline">My Account → Payout Accounts</Link>.
            </p>
          )}

          {selectedAccount && !useCustomWallet && selectedAccount.walletAddress?.trim() && (
            <div className="space-y-2">
              <FinanceFieldLabel tone="crypto">Receiving wallet</FinanceFieldLabel>
              <PayoutAccountDetailsCard account={selectedAccount} />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full border-border dark:border-white/15 text-xs"
                onClick={() => {
                  onUseCustomWalletChange(true);
                  onWalletAddressChange(selectedAccount.walletAddress || "");
                  onWalletQrUrlChange(selectedAccount.walletQrUrl || "");
                  onReceiveConfirmedChange(false);
                }}
              >
                Change wallet address
              </Button>
            </div>
          )}

          {(needsManualWallet || (useCustomWallet && matching.length > 0)) && (
            <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {matching.length === 0 ? "Enter receiving wallet" : "Custom wallet address"}
                </p>
                {useCustomWallet && matching.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 text-muted-foreground"
                    onClick={() => {
                      onUseCustomWalletChange(false);
                      if (selectedAccount) {
                        onWalletAddressChange(selectedAccount.walletAddress || "");
                        onWalletQrUrlChange(selectedAccount.walletQrUrl || "");
                      }
                      onReceiveConfirmedChange(false);
                    }}
                  >
                    Use saved wallet
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <FinanceFieldLabel tone="crypto">Wallet address *</FinanceFieldLabel>
                <Input
                  value={walletAddress}
                  onChange={e => {
                    onWalletAddressChange(e.target.value);
                    onReceiveConfirmedChange(false);
                  }}
                  placeholder={`Paste ${symbol.toUpperCase()} address (${exchangeChainDisplay(symbol, network)})`}
                  className={financeInputClass("font-mono text-xs h-10")}
                />
              </div>

              <div className="space-y-2">
                <FinanceFieldLabel tone="crypto">Wallet QR code (upload if address has no saved QR)</FinanceFieldLabel>
                <div className="flex flex-wrap items-center gap-2">
                  <UserQrUploadButton
                    label="Upload wallet QR"
                    uploadPath="/wallet/payment-accounts/upload/wallet-qr"
                    onUploaded={url => {
                      onWalletQrUrlChange(url);
                      onReceiveConfirmedChange(false);
                    }}
                    disabled={submitting}
                  />
                  {walletQrUrl && (
                    <QrImage
                      src={resolvePayoutQrSrc({ accountType: "crypto", walletAddress: trimmedAddress, walletQrUrl })}
                      fallbackSrc={trimmedAddress ? resolvePayoutQrSrc({ accountType: "crypto", walletAddress: trimmedAddress }) : undefined}
                      alt="Wallet QR"
                      className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                    />
                  )}
                </div>
                {!walletQrUrl && trimmedAddress && (
                  <QrImage
                    src={resolveDepositQrSrc({ walletAddress: trimmedAddress })}
                    alt="Generated wallet QR"
                    className="mx-auto max-h-36 rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                )}
              </div>

              {trimmedAddress && (
                <>
                  <CredentialRow label="Network" value={exchangeChainDisplay(symbol, network)} copyable={false} />
                  <CredentialRow label="Address" value={trimmedAddress} mono />
                  <p className="text-[11px] text-amber-400/80 bg-amber-500/5 rounded-lg px-3 py-2">
                    Double-check the address and network. Wrong address or chain may result in lost funds.
                  </p>
                </>
              )}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground text-center">
            Manage wallets in{" "}
            <Link href="/account?tab=payout&type=crypto" className="text-amber-600 dark:text-amber-400 hover:underline">My Account → Payout Accounts</Link>
          </p>
        </div>
      )}

      <div className={cn(
        "rounded-xl border p-4 space-y-3",
        receiveConfirmed ? "border-emerald-500/30 bg-emerald-500/5" : "border-emerald-500/25 bg-emerald-500/5",
      )}>
        <p className="text-xs text-muted-foreground leading-relaxed">{confirmationNote}</p>
        <div className="flex items-start gap-3">
          <Checkbox
            id="receive-confirm"
            checked={receiveConfirmed}
            disabled={!canConfirm}
            onCheckedChange={v => onReceiveConfirmedChange(v === true)}
            className="mt-0.5 border-emerald-500/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
          />
          <Label htmlFor="receive-confirm" className="text-sm font-normal leading-snug cursor-pointer">
            I confirm the receiving wallet and transaction details are correct. I understand crypto will be sent to{" "}
            {receiveMode === "platform" ? (
              <strong className="text-emerald-300/90">my platform wallet</strong>
            ) : (
              <strong className="text-emerald-300/90">my personal wallet</strong>
            )}{" "}
            on <strong className="text-emerald-300/90">{exchangeChainDisplay(symbol, network)}</strong> after admin verifies my fiat payment.
          </Label>
        </div>
      </div>
    </div>
  );
}
