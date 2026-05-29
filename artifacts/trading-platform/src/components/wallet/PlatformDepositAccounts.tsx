import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { authFetchJson } from "@/lib/token-store";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { DepositDialog } from "@/components/wallet/DepositDialog";
import { OnlineGatewayCheckoutPanel } from "@/components/wallet/OnlineGatewayCheckoutPanel";
import {
  enrichDepositAccount,
  buildUpiPayUri,
  buildDigitalRupeePayUri,
  resolveDepositQrSrc,
  type DepositAccountsResponse,
  type DepositAccount,
} from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import {
  resolveCryptoDepositTabs,
  findCryptoDepositAccount,
} from "@/components/wallet/crypto-networks";
import { formatCryptoAssetLabel } from "@/components/wallet/crypto-asset-catalog";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import { Building2, QrCode, Wallet, Globe, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileCardHeader, paymentMethodSubTabsList } from "@/lib/mobile-ui";
import { DEPOSIT_BUTTON_CLASS } from "@/lib/wallet-action-styles";
import {
  PaymentMethodSelect,
  PaymentMethodTabsList,
  PaymentMethodTabsTrigger,
} from "@/components/wallet/PaymentMethodField";

function UpiAccountCard({ account }: { account: DepositAccount }) {
  const a = enrichDepositAccount(account);
  return (
    <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{a.name}</CardTitle>
          {a.badge && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">{a.badge}</Badge>}
        </div>
        <CardDescription>Scan the QR code or copy the UPI ID to pay</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(a.qrCodeUrl || a.upiId) && (
          <div className="text-center">
            <QrImage
              src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, upiId: a.upiId, payeeName: a.name })}
              fallbackSrc={a.upiId ? resolveDepositQrSrc({ upiId: a.upiId, payeeName: a.name }) : undefined}
              alt="UPI QR"
              className="mx-auto max-h-44 rounded border border-border dark:border-white/10"
            />
          </div>
        )}
        {a.upiId && (
          <>
            <CredentialRow label="UPI ID" value={a.upiId} mono />
            <a
              href={buildUpiPayUri(a.upiId, a.name)}
              className={cn("inline-flex text-sm px-4 py-2 rounded-md", DEPOSIT_BUTTON_CLASS)}
            >
              Pay Now
            </a>
          </>
        )}
        {a.note && <p className="text-xs text-muted-foreground italic">{a.note}</p>}
      </CardContent>
    </Card>
  );
}

function DigitalRupeeAccountCard({ account }: { account: DepositAccount }) {
  const a = enrichDepositAccount(account);
  return (
    <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{a.name}</CardTitle>
          {a.badge && <Badge variant="outline" className="border-teal-500/40 text-teal-600 dark:text-teal-400">{a.badge}</Badge>}
        </div>
        <CardDescription>Scan the QR code or copy the Digital Rupee ID to pay via e-Rupee / CBDC</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(a.qrCodeUrl || a.digitalRupeeId) && (
          <div className="text-center">
            <QrImage
              src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, digitalRupeeId: a.digitalRupeeId, payeeName: a.name })}
              fallbackSrc={a.digitalRupeeId ? resolveDepositQrSrc({ digitalRupeeId: a.digitalRupeeId, payeeName: a.name }) : undefined}
              alt="Digital Rupee QR"
              className="mx-auto max-h-44 rounded border border-border dark:border-white/10"
            />
          </div>
        )}
        {a.digitalRupeeId && (
          <>
            <CredentialRow label="Digital Rupee ID" value={a.digitalRupeeId} mono />
            <a
              href={buildDigitalRupeePayUri(a.digitalRupeeId, a.name)}
              className={cn("inline-flex text-sm px-4 py-2 rounded-md", DEPOSIT_BUTTON_CLASS)}
            >
              Pay Now
            </a>
          </>
        )}
        {a.note && <p className="text-xs text-muted-foreground italic">{a.note}</p>}
      </CardContent>
    </Card>
  );
}

function BankAccountCard({ account }: { account: DepositAccount }) {
  const a = enrichDepositAccount(account);
  return (
    <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{a.name}</CardTitle>
          {a.badge && <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">{a.badge}</Badge>}
        </div>
        <CardDescription>Wire Transfer, RTGS, NEFT, IMPS &amp; UPI</CardDescription>
      </CardHeader>
      <CardContent className="rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20 p-3">
        <CredentialRow label="Account Holder" value={a.accountHolderName} />
        <CredentialRow label="Bank" value={a.bankName} copyable={false} />
        <CredentialRow label="Account No." value={a.accountNumber} mono />
        <CredentialRow label="IFSC" value={a.ifscCode} mono />
        <CredentialRow label="MICR" value={a.micrCode} mono />
        <CredentialRow label="SWIFT" value={a.swiftCode} mono />
        <CredentialRow label="Branch" value={a.branchName} copyable={false} />
        <CredentialRow label="Account Type" value={a.accountType} copyable={false} />
        {a.note && <p className="text-xs text-muted-foreground italic pt-2">{a.note}</p>}
      </CardContent>
    </Card>
  );
}

function CryptoAccountCard({ account, tabLabel }: { account: DepositAccount; tabLabel: string }) {
  const a = enrichDepositAccount(account);
  return (
    <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CryptoAssetIcon symbol={a.symbol} network={a.network} coinName={a.extraConfig?.coinName} size="md" />
          <div>
            <CardTitle className="text-base">{tabLabel}</CardTitle>
            <CardDescription>{formatCryptoAssetLabel(a.symbol, a.network, a.extraConfig?.coinName)}</CardDescription>
          </div>
        </div>
        <CardDescription className="pt-1">Scan the QR code or copy the wallet address to deposit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(a.qrCodeUrl || a.walletAddress) && (
          <div className="text-center">
            <QrImage
              src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, walletAddress: a.walletAddress })}
              fallbackSrc={a.walletAddress ? resolveDepositQrSrc({ walletAddress: a.walletAddress }) : undefined}
              alt="Wallet QR"
              className="mx-auto max-h-44 rounded border border-border dark:border-white/10"
            />
          </div>
        )}
        <div className="rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20 p-3">
          <CredentialRow label="Coin" value={formatCryptoAssetLabel(a.symbol, a.network, a.extraConfig?.coinName)} copyable={false} />
          <CredentialRow label="Address" value={a.walletAddress} mono />
        </div>
        {a.note && <p className="text-xs text-muted-foreground italic">{a.note}</p>}
      </CardContent>
    </Card>
  );
}


export function PlatformDepositAccounts({
  initialSection,
  initialGatewayId,
}: {
  initialSection?: "upi" | "digital_rupee" | "bank" | "crypto" | "online";
  initialGatewayId?: string;
} = {}) {
  const [tab, setTab] = useState<"upi" | "digital_rupee" | "bank" | "crypto" | "online">(initialSection || "upi");
  const [selectedUpi, setSelectedUpi] = useState("");
  const [selectedDigitalRupee, setSelectedDigitalRupee] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [cryptoTab, setCryptoTab] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<DepositAccountsResponse>("/payments/deposit-accounts"),
  });

  const upi = (data?.upi || []).map(enrichDepositAccount);
  const digitalRupee = (data?.digitalRupee || []).map(enrichDepositAccount);
  const bank = (data?.bank || []).map(enrichDepositAccount);
  const crypto = (data?.crypto || []).map(enrichDepositAccount);
  const cryptoTabs = useMemo(() => resolveCryptoDepositTabs(crypto), [crypto]);
  const configuredCryptoTabs = useMemo(
    () => cryptoTabs.filter(t => findCryptoDepositAccount(crypto, t)),
    [cryptoTabs, crypto],
  );
  const onlineCount = (data?.online || []).length;

  useEffect(() => {
    if (initialSection) setTab(initialSection);
    if (initialSection === "online") {
      requestAnimationFrame(() => {
        document.getElementById("deposit-online-payments")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [initialSection]);

  useEffect(() => {
    if (upi.length && !selectedUpi) setSelectedUpi(String(upi[0].id));
    if (digitalRupee.length && !selectedDigitalRupee) setSelectedDigitalRupee(String(digitalRupee[0].id));
    if (bank.length && !selectedBank) setSelectedBank(String(bank[0].id));
  }, [upi, digitalRupee, bank, selectedUpi, selectedDigitalRupee, selectedBank]);

  useEffect(() => {
    const first = configuredCryptoTabs[0];
    if (first) setCryptoTab(first.key);
  }, [configuredCryptoTabs]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  const activeUpi = upi.find(a => String(a.id) === selectedUpi);
  const activeDigitalRupee = digitalRupee.find(a => String(a.id) === selectedDigitalRupee);
  const activeBank = bank.find(a => String(a.id) === selectedBank);

  return (
    <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
      <CardHeader className={mobileCardHeader}>
        <div className="min-w-0">
          <CardTitle>Deposit Accounts</CardTitle>
          <CardDescription>UPI, Digital Rupee, bank, crypto, or payment gateway — copy details or pay online</CardDescription>
        </div>
        <DepositDialog trigger={
          <button type="button" className="text-xs text-amber-600 dark:text-amber-400 hover:underline shrink-0 self-start sm:self-auto">Quick deposit →</button>
        } />
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
          <PaymentMethodTabsList className="mb-4">
            {upi.length > 0 && (
              <PaymentMethodTabsTrigger value="upi" tone="upi" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">UPI ({upi.length})</span>
              </PaymentMethodTabsTrigger>
            )}
            {digitalRupee.length > 0 && (
              <PaymentMethodTabsTrigger value="digital_rupee" tone="digital_rupee" className="gap-1.5">
                <IndianRupee className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Digital Rupee ({digitalRupee.length})</span>
              </PaymentMethodTabsTrigger>
            )}
            {bank.length > 0 && (
              <PaymentMethodTabsTrigger value="bank" tone="bank" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">Bank ({bank.length})</span>
              </PaymentMethodTabsTrigger>
            )}
            <PaymentMethodTabsTrigger value="crypto" tone="crypto" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Crypto{configuredCryptoTabs.length > 0 ? ` (${configuredCryptoTabs.length})` : ""}</span>
            </PaymentMethodTabsTrigger>
            <PaymentMethodTabsTrigger value="online" tone="gateway" className="gap-1.5">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Online{onlineCount > 0 ? ` (${onlineCount})` : ""}</span>
            </PaymentMethodTabsTrigger>
          </PaymentMethodTabsList>

          {upi.length > 0 && (
            <TabsContent value="upi" className="space-y-3 mt-0">
              {upi.length > 1 && (
                <>
                  <PaymentMethodSelect
                    tone="upi"
                    label="Select UPI / QR account"
                    value={selectedUpi}
                    onValueChange={setSelectedUpi}
                    placeholder="-- Select UPI ID --"
                    options={upi.map(a => ({ value: String(a.id), label: a.name }))}
                  />
                  <Tabs value={selectedUpi} onValueChange={setSelectedUpi}>
                    <PaymentMethodTabsList className={paymentMethodSubTabsList}>
                      {upi.map(a => (
                        <PaymentMethodTabsTrigger key={a.id} value={String(a.id)} tone="upi" className="text-xs">
                          <span className="truncate">{a.name}</span>
                        </PaymentMethodTabsTrigger>
                      ))}
                    </PaymentMethodTabsList>
                  </Tabs>
                </>
              )}
              {activeUpi && <UpiAccountCard account={activeUpi} />}
            </TabsContent>
          )}

          {digitalRupee.length > 0 && (
            <TabsContent value="digital_rupee" className="space-y-3 mt-0">
              {digitalRupee.length > 1 && (
                <>
                  <PaymentMethodSelect
                    tone="digital_rupee"
                    label="Select Digital Rupee account"
                    value={selectedDigitalRupee}
                    onValueChange={setSelectedDigitalRupee}
                    placeholder="-- Select e-Rupee wallet --"
                    options={digitalRupee.map(a => ({ value: String(a.id), label: a.name }))}
                  />
                  <Tabs value={selectedDigitalRupee} onValueChange={setSelectedDigitalRupee}>
                    <PaymentMethodTabsList className={paymentMethodSubTabsList}>
                      {digitalRupee.map(a => (
                        <PaymentMethodTabsTrigger key={a.id} value={String(a.id)} tone="digital_rupee" className="text-xs">
                          <span className="truncate">{a.name}</span>
                        </PaymentMethodTabsTrigger>
                      ))}
                    </PaymentMethodTabsList>
                  </Tabs>
                </>
              )}
              {activeDigitalRupee && <DigitalRupeeAccountCard account={activeDigitalRupee} />}
            </TabsContent>
          )}

          {bank.length > 0 && (
            <TabsContent value="bank" className="space-y-3 mt-0">
              <Tabs value={selectedBank} onValueChange={setSelectedBank}>
                <PaymentMethodTabsList className={paymentMethodSubTabsList}>
                  {bank.map(a => (
                    <PaymentMethodTabsTrigger key={a.id} value={String(a.id)} tone="bank" className="text-xs">
                      <span className="truncate">{a.name}</span>
                    </PaymentMethodTabsTrigger>
                  ))}
                </PaymentMethodTabsList>
              </Tabs>
              {activeBank && <BankAccountCard account={activeBank} />}
            </TabsContent>
          )}

          <TabsContent value="crypto" className="space-y-3 mt-0">
            {configuredCryptoTabs.length === 0 ? (
              <Card className="bg-muted/80 dark:bg-black/20 border-border dark:border-white/10 border-dashed">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  No crypto deposit wallets configured. Ask admin to add them in Super Admin → Deposit & Withdrawal Payment Accounts.
                </CardContent>
              </Card>
            ) : (
            <Tabs value={cryptoTab} onValueChange={setCryptoTab}>
              <PaymentMethodTabsList className={paymentMethodSubTabsList}>
                {configuredCryptoTabs.map(t => (
                  <PaymentMethodTabsTrigger key={t.key} value={t.key} tone="crypto" className="text-xs gap-1.5">
                    <CryptoAssetIcon symbol={t.symbol} network={t.network} coinName={t.coinName} size="xs" />
                    <span className="truncate">{t.label}</span>
                  </PaymentMethodTabsTrigger>
                ))}
              </PaymentMethodTabsList>
              {configuredCryptoTabs.map(t => {
                const account = findCryptoDepositAccount(crypto, t);
                return (
                  <TabsContent key={t.key} value={t.key} className="mt-3">
                    {account ? (
                      <CryptoAccountCard account={account} tabLabel={t.label} />
                    ) : null}
                  </TabsContent>
                );
              })}
            </Tabs>
            )}
          </TabsContent>

          <TabsContent value="online" className="space-y-3 mt-0" id="deposit-online-payments">
            <OnlineGatewayCheckoutPanel initialGatewayId={initialGatewayId} />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground mt-4">
          Manual UPI/Digital Rupee/bank/crypto: submit proof via the <span className="text-amber-600 dark:text-amber-400">Deposit</span> button. Payment gateways credit instantly after successful checkout.
        </p>
      </CardContent>
    </Card>
  );
}
