import { useEffect } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { OnlineGatewayCheckoutPanel } from "@/components/wallet/OnlineGatewayCheckoutPanel";
import {
  enrichDepositAccount,
  resolveDepositQrSrc,
  buildUpiPayUri,
  buildDigitalRupeePayUri,
  getOnlineGatewayLabel,
  type DepositAccountsResponse,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { Building2, CreditCard, Smartphone, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatUpiLimitInr, formatDigitalRupeeLimitInr } from "@/lib/payment-limits";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  PaymentMethodSelect,
  PaymentMethodTabsList,
  PaymentMethodTabsTrigger,
} from "@/components/wallet/PaymentMethodField";

export type FiatPaymentOption = "upi" | "digital_rupee" | "bank" | "gateway";

type Props = {
  depositAccounts?: DepositAccountsResponse;
  paymentOption: FiatPaymentOption | "";
  onPaymentOptionChange: (v: FiatPaymentOption) => void;
  accountId: string;
  onAccountIdChange: (id: string) => void;
  /** Optional amount for dynamic UPI / Digital Rupee QR */
  amountHint?: string;
};

export function FiatDepositFlowPanel({
  depositAccounts,
  paymentOption,
  onPaymentOptionChange,
  accountId,
  onAccountIdChange,
  amountHint,
}: Props) {
  const upi = (depositAccounts?.upi || []).map(enrichDepositAccount);
  const digitalRupee = (depositAccounts?.digitalRupee || []).map(enrichDepositAccount);
  const bank = (depositAccounts?.bank || []).map(enrichDepositAccount);
  const online = (depositAccounts?.online || []).map(enrichDepositAccount);

  const amount = amountHint ? Number(amountHint) : undefined;

  useEffect(() => {
    if (!paymentOption || accountId) return;
    if (paymentOption === "upi" && upi.length) onAccountIdChange(String(upi[0].id));
    if (paymentOption === "digital_rupee" && digitalRupee.length) onAccountIdChange(String(digitalRupee[0].id));
    if (paymentOption === "bank" && bank.length) onAccountIdChange(String(bank[0].id));
    if (paymentOption === "gateway" && online.length) onAccountIdChange(String(online[0].id));
  }, [paymentOption, upi, digitalRupee, bank, online, accountId, onAccountIdChange]);

  const activeUpi = upi.find(a => String(a.id) === accountId);
  const activeDigitalRupee = digitalRupee.find(a => String(a.id) === accountId);
  const activeBank = bank.find(a => String(a.id) === accountId);
  const activeGateway = online.find(g => String(g.id) === accountId);

  const hasAny = upi.length > 0 || digitalRupee.length > 0 || bank.length > 0 || online.length > 0;

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-border dark:border-white/15 bg-muted/40 dark:bg-white/[0.02] p-6 text-center text-sm text-muted-foreground">
        No fiat deposit methods configured. Contact support.
      </div>
    );
  }

  const defaultTab: FiatPaymentOption =
    upi.length ? "upi" : digitalRupee.length ? "digital_rupee" : bank.length ? "bank" : "gateway";

  const tab = paymentOption || defaultTab;

  useEffect(() => {
    if (!paymentOption && defaultTab) {
      onPaymentOptionChange(defaultTab);
    }
  }, [paymentOption, defaultTab, onPaymentOptionChange]);

  return (
    <div className="space-y-4 min-w-0 overflow-x-clip">
      <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent p-4">
        <p className="text-sm font-medium text-emerald-300/90">Deposit fiat to buy crypto</p>
        <p className="text-xs text-muted-foreground mt-1">
          Choose UPI, Digital Rupee, bank transfer, or payment gateway — same options as wallet deposit for investments.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={v => {
          onPaymentOptionChange(v as FiatPaymentOption);
          onAccountIdChange("");
        }}
      >
        <PaymentMethodTabsList>
          {upi.length > 0 && (
            <PaymentMethodTabsTrigger value="upi" tone="upi">
              <Smartphone className="h-3.5 w-3.5 shrink-0" />
              UPI
            </PaymentMethodTabsTrigger>
          )}
          {digitalRupee.length > 0 && (
            <PaymentMethodTabsTrigger value="digital_rupee" tone="digital_rupee">
              <IndianRupee className="h-3.5 w-3.5 shrink-0" />
              Digital Rupee
            </PaymentMethodTabsTrigger>
          )}
          {bank.length > 0 && (
            <PaymentMethodTabsTrigger value="bank" tone="bank">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              Bank
            </PaymentMethodTabsTrigger>
          )}
          {online.length > 0 && (
            <PaymentMethodTabsTrigger value="gateway" tone="gateway">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              Gateway
            </PaymentMethodTabsTrigger>
          )}
        </PaymentMethodTabsList>

        {upi.length > 0 && (
          <TabsContent value="upi" className="space-y-3 mt-3">
            <PaymentMethodSelect
              tone="upi"
              label="Select UPI account"
              value={accountId}
              onValueChange={onAccountIdChange}
              placeholder="Choose UPI ID"
              options={upi.map(a => ({ value: String(a.id), label: a.name }))}
            />
            <p className="text-[11px] text-sky-700 dark:text-sky-400/90">
              UPI payments are limited to ₹{formatUpiLimitInr()} per transaction.
            </p>
            {activeUpi && (
              <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3">
                <p className="text-sm font-medium text-center">{activeUpi.name}</p>
                {(activeUpi.qrCodeUrl || activeUpi.upiId) && (
                  <QrImage
                    src={resolveDepositQrSrc({
                      qrCodeUrl: activeUpi.qrCodeUrl,
                      upiId: activeUpi.upiId,
                      payeeName: activeUpi.name,
                      amount,
                    })}
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
                      className={cn("flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors", DEPOSIT_BUTTON_CLASS)}
                    >
                      Open UPI app
                    </a>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {digitalRupee.length > 0 && (
          <TabsContent value="digital_rupee" className="space-y-3 mt-3">
            <PaymentMethodSelect
              tone="digital_rupee"
              label="Select Digital Rupee account"
              value={accountId}
              onValueChange={onAccountIdChange}
              placeholder="Choose e-Rupee wallet"
              options={digitalRupee.map(a => ({ value: String(a.id), label: a.name }))}
            />
            <p className="text-[11px] text-teal-700 dark:text-teal-400/90">
              Digital Rupee payments are limited to ₹{formatDigitalRupeeLimitInr()} per transaction.
            </p>
            {activeDigitalRupee && (
              <div className="rounded-xl border border-border dark:border-white/10 bg-muted dark:bg-black/25 p-4 space-y-3">
                <p className="text-sm font-medium text-center">{activeDigitalRupee.name}</p>
                {(activeDigitalRupee.qrCodeUrl || activeDigitalRupee.digitalRupeeId) && (
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
                      className={cn("flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition-colors", DEPOSIT_BUTTON_CLASS)}
                    >
                      Open e-Rupee / CBDC wallet
                    </a>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        )}

        {bank.length > 0 && (
          <TabsContent value="bank" className="space-y-3 mt-3">
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
          </TabsContent>
        )}

        {online.length > 0 && (
          <TabsContent value="gateway" className="space-y-3 mt-3">
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
              <OnlineGatewayCheckoutPanel compact initialGatewayId={accountId} />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
