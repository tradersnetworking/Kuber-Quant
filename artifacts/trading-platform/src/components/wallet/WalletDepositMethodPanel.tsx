import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { fetchPaymentMethodVisibility, ALL_ENABLED } from "@/lib/payment-method-visibility";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { OnlineGatewayCheckoutPanel } from "@/components/wallet/OnlineGatewayCheckoutPanel";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import {
  enrichDepositAccount,
  resolveDepositQrSrc,
  buildUpiPayUri,
  buildDigitalRupeePayUri,
  getOnlineGatewayLabel,
  isLiveCheckoutGateway,
  type DepositAccountsResponse,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { resolveCryptoDepositTabs, findCryptoDepositAccount } from "@/components/wallet/crypto-networks";
import { Building2, CreditCard, Smartphone, Coins, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUpiLimitInr, formatDigitalRupeeLimitInr } from "@/lib/payment-limits";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  PaymentMethodCategorySelect,
  PaymentMethodSelect,
} from "@/components/wallet/PaymentMethodField";
import { DepositWithdrawalMethodsBanner } from "@/components/finance/DepositWithdrawalMethodsBanner";

export type WalletDepositMethod = "upi" | "digital_rupee" | "bank" | "gateway" | "crypto";

type Props = {
  depositAccounts?: DepositAccountsResponse;
  method: WalletDepositMethod | "";
  onMethodChange: (v: WalletDepositMethod) => void;
  accountId: string;
  onAccountIdChange: (id: string) => void;
  amountHint?: string;
  onGatewaySuccess?: () => void;
};

const TAB_META: { value: WalletDepositMethod; label: string; icon: typeof Smartphone }[] = [
  { value: "upi", label: "UPI", icon: Smartphone },
  { value: "digital_rupee", label: "Digital Rupee", icon: IndianRupee },
  { value: "bank", label: "Bank", icon: Building2 },
  { value: "gateway", label: "Gateway", icon: CreditCard },
  { value: "crypto", label: "Crypto", icon: Coins },
];

export function WalletDepositMethodPanel({
  depositAccounts,
  method,
  onMethodChange,
  accountId,
  onAccountIdChange,
  amountHint,
  onGatewaySuccess,
}: Props) {
  const upi = (depositAccounts?.upi || []).map(enrichDepositAccount);
  const digitalRupee = (depositAccounts?.digitalRupee || []).map(enrichDepositAccount);
  const bank = (depositAccounts?.bank || []).map(enrichDepositAccount);
  const online = (depositAccounts?.online || [])
    .map(enrichDepositAccount)
    .filter(g => isLiveCheckoutGateway(g.type));
  const crypto = (depositAccounts?.crypto || []).map(enrichDepositAccount);
  const cryptoTabs = resolveCryptoDepositTabs(crypto);
  const configuredCryptoTabs = cryptoTabs.filter(t => findCryptoDepositAccount(crypto, t));

  const { data: visibility } = useQuery({
    queryKey: ["/api/payments/method-visibility"],
    queryFn: fetchPaymentMethodVisibility,
    staleTime: 60_000,
  });
  const enabled = visibility?.deposit ?? ALL_ENABLED;
  const visibleTabs = TAB_META.filter(t => enabled[t.value] !== false);

  const amount = amountHint ? Number(amountHint) : undefined;
  const firstEnabled = (visibleTabs[0]?.value ?? "upi") as WalletDepositMethod;
  const tab = method || firstEnabled;

  const activeUpi = upi.find(a => String(a.id) === accountId);
  const activeDigitalRupee = digitalRupee.find(a => String(a.id) === accountId);
  const activeBank = bank.find(a => String(a.id) === accountId);
  const activeCryptoTab = configuredCryptoTabs.find(t => t.key === accountId);
  const activeCrypto = activeCryptoTab ? findCryptoDepositAccount(crypto, activeCryptoTab) : undefined;

  useEffect(() => {
    if (method) return;
    onMethodChange(firstEnabled);
  }, [method, firstEnabled, onMethodChange]);

  useEffect(() => {
    if (!method || accountId) return;
    if (method === "upi" && upi.length) onAccountIdChange(String(upi[0].id));
    if (method === "digital_rupee" && digitalRupee.length) onAccountIdChange(String(digitalRupee[0].id));
    if (method === "bank" && bank.length) onAccountIdChange(String(bank[0].id));
    if (method === "gateway" && online.length) onAccountIdChange(String(online[0].id));
    if (method === "crypto" && configuredCryptoTabs.length) onAccountIdChange(configuredCryptoTabs[0].key);
  }, [method, upi, digitalRupee, bank, online, configuredCryptoTabs, accountId, onAccountIdChange]);

  return (
    <div className="space-y-4">
      <DepositWithdrawalMethodsBanner />

      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4">
        <p className="text-sm font-medium text-emerald-300/90">Step 1 — Choose deposit method</p>
        <p className="text-xs text-muted-foreground mt-1">
          Pay via UPI, Digital Rupee (e-Rupee), bank transfer, payment gateway, or send crypto — same options as Buy Crypto on the exchange.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={v => {
          onMethodChange(v as WalletDepositMethod);
          onAccountIdChange("");
        }}
      >
        <PaymentMethodCategorySelect
          label="Step 1 — Choose deposit method"
          value={tab}
          onValueChange={v => {
            onMethodChange(v as WalletDepositMethod);
            onAccountIdChange("");
          }}
          options={visibleTabs.map(({ value, label, icon }) => ({ value, label, icon }))}
        />

        <TabsContent value="upi" className="space-y-3 mt-3 min-w-0">
          {upi.length === 0 ? (
            <EmptyMethod message="No UPI accounts configured. Contact support or try another method." />
          ) : (
            <>
              <PaymentMethodSelect
                tone="upi"
                label="Select UPI account"
                value={accountId}
                onValueChange={onAccountIdChange}
                placeholder="Choose UPI ID"
                options={upi.map(a => ({ value: String(a.id), label: a.name }))}
              />
              <p className="text-[11px] text-sky-700 dark:text-sky-400/90">
                UPI deposits are limited to ₹{formatUpiLimitInr()} per transaction.
              </p>
              {activeUpi && (
                <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3">
                  <p className="text-sm font-medium text-center">{activeUpi.name}</p>
                  {resolveDepositQrSrc({ qrCodeUrl: activeUpi.qrCodeUrl, upiId: activeUpi.upiId, payeeName: activeUpi.name, amount }) && (
                    <QrImage
                      src={resolveDepositQrSrc({ qrCodeUrl: activeUpi.qrCodeUrl, upiId: activeUpi.upiId, payeeName: activeUpi.name, amount })}
                      fallbackSrc={activeUpi.upiId ? resolveDepositQrSrc({ upiId: activeUpi.upiId, payeeName: activeUpi.name, amount }) : undefined}
                      alt="UPI QR code"
                      className="mx-auto max-h-44 rounded-lg border border-border dark:border-white/10 shadow-lg"
                    />
                  )}
                  {activeUpi.upiId && (
                    <>
                      <CredentialRow label="UPI ID" value={activeUpi.upiId} mono />
                      <a
                        href={buildUpiPayUri(activeUpi.upiId, activeUpi.name, amount)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-xs sm:text-sm text-center leading-tight whitespace-normal min-h-10",
                          DEPOSIT_BUTTON_CLASS,
                        )}
                      >
                        Open GPay / PhonePe / Paytm / BHIM
                      </a>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="digital_rupee" className="space-y-3 mt-3 min-w-0">
          {digitalRupee.length === 0 ? (
            <EmptyMethod message="No Digital Rupee accounts configured. Contact support or try another method." />
          ) : (
            <>
              <PaymentMethodSelect
                tone="digital_rupee"
                label="Select Digital Rupee account"
                value={accountId}
                onValueChange={onAccountIdChange}
                placeholder="Choose e-Rupee wallet"
                options={digitalRupee.map(a => ({ value: String(a.id), label: a.name }))}
              />
              <p className="text-[11px] text-teal-700 dark:text-teal-400/90">
                Digital Rupee deposits are limited to ₹{formatDigitalRupeeLimitInr()} per transaction.
              </p>
              {activeDigitalRupee && (
                <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3">
                  <p className="text-sm font-medium text-center">{activeDigitalRupee.name}</p>
                  {resolveDepositQrSrc({
                    qrCodeUrl: activeDigitalRupee.qrCodeUrl,
                    digitalRupeeId: activeDigitalRupee.digitalRupeeId,
                    payeeName: activeDigitalRupee.name,
                    amount,
                  }) && (
                    <QrImage
                      src={resolveDepositQrSrc({
                        qrCodeUrl: activeDigitalRupee.qrCodeUrl,
                        digitalRupeeId: activeDigitalRupee.digitalRupeeId,
                        payeeName: activeDigitalRupee.name,
                        amount,
                      })}
                      fallbackSrc={activeDigitalRupee.digitalRupeeId
                        ? resolveDepositQrSrc({ digitalRupeeId: activeDigitalRupee.digitalRupeeId, payeeName: activeDigitalRupee.name, amount })
                        : undefined}
                      alt="Digital Rupee QR code"
                      className="mx-auto max-h-44 rounded-lg border border-border dark:border-white/10 shadow-lg"
                    />
                  )}
                  {activeDigitalRupee.digitalRupeeId && (
                    <>
                      <CredentialRow label="Digital Rupee ID" value={activeDigitalRupee.digitalRupeeId} mono />
                      <a
                        href={buildDigitalRupeePayUri(activeDigitalRupee.digitalRupeeId, activeDigitalRupee.name, amount)}
                        className={cn(
                          "flex w-full items-center justify-center rounded-lg px-3 py-2.5 text-xs sm:text-sm text-center leading-tight whitespace-normal min-h-10",
                          DEPOSIT_BUTTON_CLASS,
                        )}
                      >
                        Open e-Rupee / CBDC wallet app
                      </a>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="bank" className="space-y-3 mt-3">
          {bank.length === 0 ? (
            <EmptyMethod message="No bank accounts configured. Contact support or try another method." />
          ) : (
            <>
              <PaymentMethodSelect
                tone="bank"
                label="Select bank account"
                value={accountId}
                onValueChange={onAccountIdChange}
                placeholder="Choose bank account"
                options={bank.map(a => ({ value: String(a.id), label: a.name }))}
              />
              {activeBank && (
                <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-0">
                  <p className="text-sm font-medium mb-2">{activeBank.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">IMPS · NEFT · RTGS</p>
                  <CredentialRow label="Account holder" value={activeBank.accountHolderName} />
                  <CredentialRow label="Bank" value={activeBank.bankName} copyable={false} />
                  <CredentialRow label="Account no." value={activeBank.accountNumber} mono />
                  <CredentialRow label="IFSC" value={activeBank.ifscCode} mono />
                  {activeBank.qrCodeUrl && (
                    <QrImage
                      src={resolveDepositQrSrc({ qrCodeUrl: activeBank.qrCodeUrl })}
                      alt="Bank QR"
                      className="mt-3 max-h-36 rounded-lg border border-border dark:border-white/10 mx-auto"
                    />
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="gateway" className="space-y-3 mt-3">
          {online.length === 0 ? (
            <EmptyMethod message="No payment gateways enabled. Contact admin or use UPI/bank transfer." />
          ) : (
            <>
              <PaymentMethodSelect
                tone="gateway"
                label="Select payment gateway"
                value={accountId}
                onValueChange={onAccountIdChange}
                placeholder="Choose gateway"
                options={online.map(g => ({
                  value: String(g.id),
                  label: g.name || getOnlineGatewayLabel(g.type),
                }))}
              />
              {accountId && (
                <OnlineGatewayCheckoutPanel compact initialGatewayId={accountId} onSuccess={onGatewaySuccess} />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="crypto" className="space-y-3 mt-3 min-w-0">
          {configuredCryptoTabs.length === 0 ? (
            <EmptyMethod message="No crypto deposit wallets configured. Contact support." />
          ) : (
            <>
              <PaymentMethodSelect
                tone="crypto"
                label="Select coin / network"
                value={accountId}
                onValueChange={onAccountIdChange}
                placeholder="Choose crypto asset"
                options={configuredCryptoTabs.map(t => ({
                  value: t.key,
                  label: (
                    <span className="flex items-center gap-2">
                      <CryptoAssetIcon symbol={t.symbol} network={t.network} coinName={t.coinName} size="xs" />
                      {t.label}
                    </span>
                  ),
                }))}
              />
              {activeCryptoTab && activeCrypto && (
                <div className="rounded-xl border border-amber-500/20 bg-muted dark:bg-black/25 p-4 space-y-3">
                  <p className="text-sm font-medium">{activeCryptoTab.label}</p>
                  {resolveDepositQrSrc({ qrCodeUrl: activeCrypto.qrCodeUrl, walletAddress: activeCrypto.walletAddress }) && (
                    <QrImage
                      src={resolveDepositQrSrc({ qrCodeUrl: activeCrypto.qrCodeUrl, walletAddress: activeCrypto.walletAddress })}
                      fallbackSrc={activeCrypto.walletAddress ? resolveDepositQrSrc({ walletAddress: activeCrypto.walletAddress }) : undefined}
                      alt="Wallet QR"
                      className="mx-auto max-h-44 rounded-lg border border-border dark:border-white/10 bg-white p-2"
                    />
                  )}
                  <CredentialRow label="Coin" value={`${activeCrypto.symbol} (${activeCrypto.network})`} copyable={false} />
                  <CredentialRow label="Address" value={activeCrypto.walletAddress} mono />
                </div>
              )}
              {activeCryptoTab && !activeCrypto && (
                <p className="text-xs text-amber-400/80">Wallet not configured for {activeCryptoTab.label}.</p>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyMethod({ message }: { message: string }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border dark:border-white/15 bg-muted/40 dark:bg-white/[0.02] p-5 text-center text-sm text-muted-foreground")}>
      {message}
    </div>
  );
}
