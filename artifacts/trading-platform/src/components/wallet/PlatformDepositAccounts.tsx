import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { authFetchJson } from "@/lib/token-store";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { DepositDialog } from "@/components/wallet/DepositDialog";
import { OnlineGatewayCheckoutPanel } from "@/components/wallet/OnlineGatewayCheckoutPanel";
import {
  enrichDepositAccount,
  buildUpiPayUri,
  upiQrImageUrl,
  cryptoQrImageUrl,
  type DepositAccountsResponse,
  type DepositAccount,
} from "@/components/wallet/deposit-account-utils";
import {
  CRYPTO_DEPOSIT_TABS,
  findCryptoDepositAccount,
} from "@/components/wallet/crypto-networks";
import { Building2, QrCode, Wallet, Globe } from "lucide-react";

function UpiAccountCard({ account }: { account: DepositAccount }) {
  const a = enrichDepositAccount(account);
  return (
    <Card className="bg-black/20 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{a.name}</CardTitle>
          {a.badge && <Badge variant="outline" className="border-amber-500/40 text-amber-400">{a.badge}</Badge>}
        </div>
        <CardDescription>Scan QR or copy UPI ID to pay</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(a.qrCodeUrl || a.upiId) && (
          <div className="text-center">
            <img
              src={a.qrCodeUrl || upiQrImageUrl(a.upiId!, a.name)}
              alt="UPI QR"
              className="mx-auto max-h-44 rounded border border-white/10"
            />
          </div>
        )}
        {a.upiId && (
          <>
            <CredentialRow label="UPI ID" value={a.upiId} mono />
            <a
              href={buildUpiPayUri(a.upiId, a.name)}
              className="inline-flex text-sm font-semibold text-black bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-md"
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
    <Card className="bg-black/20 border-white/10">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CardTitle className="text-base">{a.name}</CardTitle>
          {a.badge && <Badge variant="outline" className="border-amber-500/40 text-amber-400">{a.badge}</Badge>}
        </div>
        <CardDescription>Wire Transfer, RTGS, NEFT, IMPS &amp; UPI</CardDescription>
      </CardHeader>
      <CardContent className="rounded-lg border border-white/10 bg-black/20 p-3">
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
    <Card className="bg-black/20 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{tabLabel}</CardTitle>
        <CardDescription>Send only {a.symbol} on {a.network || "the correct"} network</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(a.qrCodeUrl || a.walletAddress) && (
          <div className="text-center">
            <img
              src={a.qrCodeUrl || cryptoQrImageUrl(a.walletAddress!)}
              alt="Wallet QR"
              className="mx-auto max-h-44 rounded border border-white/10"
            />
          </div>
        )}
        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
          <CredentialRow label="Coin" value={`${a.symbol || "—"} (${a.network || "—"})`} copyable={false} />
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
  initialSection?: "upi" | "bank" | "crypto" | "online";
  initialGatewayId?: string;
} = {}) {
  const [tab, setTab] = useState<"upi" | "bank" | "crypto" | "online">(initialSection || "upi");
  const [selectedUpi, setSelectedUpi] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [cryptoTab, setCryptoTab] = useState(CRYPTO_DEPOSIT_TABS[0].key);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<DepositAccountsResponse>("/payments/deposit-accounts"),
  });

  const upi = (data?.upi || []).map(enrichDepositAccount);
  const bank = (data?.bank || []).map(enrichDepositAccount);
  const crypto = (data?.crypto || []).map(enrichDepositAccount);
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
    if (bank.length && !selectedBank) setSelectedBank(String(bank[0].id));
  }, [upi, bank, selectedUpi, selectedBank]);

  useEffect(() => {
    const first = CRYPTO_DEPOSIT_TABS.find(t => findCryptoDepositAccount(crypto, t));
    if (first) setCryptoTab(first.key);
  }, [crypto]);

  if (isLoading) return <Skeleton className="h-64 w-full rounded-xl" />;

  const activeUpi = upi.find(a => String(a.id) === selectedUpi);
  const activeBank = bank.find(a => String(a.id) === selectedBank);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Deposit Accounts</CardTitle>
          <CardDescription>UPI, bank, crypto, or payment gateway — copy details or pay online</CardDescription>
        </div>
        <DepositDialog trigger={
          <button type="button" className="text-xs text-amber-400 hover:underline shrink-0">Quick deposit →</button>
        } />
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={v => setTab(v as typeof tab)}>
          <TabsList className="bg-white/5 border border-white/10 mb-4 flex-wrap h-auto">
            {upi.length > 0 && (
              <TabsTrigger value="upi" className="gap-1.5">
                <QrCode className="h-3.5 w-3.5" /> UPI ({upi.length})
              </TabsTrigger>
            )}
            {bank.length > 0 && (
              <TabsTrigger value="bank" className="gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Bank ({bank.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="crypto" className="gap-1.5">
              <Wallet className="h-3.5 w-3.5" /> Crypto
            </TabsTrigger>
            <TabsTrigger value="online" className="gap-1.5">
              <Globe className="h-3.5 w-3.5" /> Payment Gateway{onlineCount > 0 ? ` (${onlineCount})` : ""}
            </TabsTrigger>
          </TabsList>

          {upi.length > 0 && (
            <TabsContent value="upi" className="space-y-3 mt-0">
              {upi.length > 1 && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Select UPI / QR account</Label>
                    <Select value={selectedUpi} onValueChange={setSelectedUpi}>
                      <SelectTrigger className="bg-white/5 border-white/10">
                        <SelectValue placeholder="-- Select UPI ID --" />
                      </SelectTrigger>
                      <SelectContent>
                        {upi.map(a => (
                          <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Tabs value={selectedUpi} onValueChange={setSelectedUpi}>
                    <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1">
                      {upi.map(a => (
                        <TabsTrigger key={a.id} value={String(a.id)} className="text-xs">{a.name}</TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </>
              )}
              {activeUpi && <UpiAccountCard account={activeUpi} />}
            </TabsContent>
          )}

          {bank.length > 0 && (
            <TabsContent value="bank" className="space-y-3 mt-0">
              <Tabs value={selectedBank} onValueChange={setSelectedBank}>
                <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1">
                  {bank.map(a => (
                    <TabsTrigger key={a.id} value={String(a.id)} className="text-xs">{a.name}</TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              {activeBank && <BankAccountCard account={activeBank} />}
            </TabsContent>
          )}

          <TabsContent value="crypto" className="space-y-3 mt-0">
            <Tabs value={cryptoTab} onValueChange={setCryptoTab}>
              <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
                {CRYPTO_DEPOSIT_TABS.map(t => (
                  <TabsTrigger key={t.key} value={t.key} className="text-xs whitespace-nowrap">{t.label}</TabsTrigger>
                ))}
              </TabsList>
              {CRYPTO_DEPOSIT_TABS.map(t => {
                const account = findCryptoDepositAccount(crypto, t);
                return (
                  <TabsContent key={t.key} value={t.key} className="mt-3">
                    {account ? (
                      <CryptoAccountCard account={account} tabLabel={t.label} />
                    ) : (
                      <Card className="bg-black/20 border-white/10 border-dashed">
                        <CardContent className="py-8 text-center text-sm text-muted-foreground">
                          <p className="font-medium text-foreground/80">{t.label}</p>
                          <p className="mt-1">Wallet not configured. Ask admin to add in Super Admin → Payments.</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </TabsContent>

          <TabsContent value="online" className="space-y-3 mt-0" id="deposit-online-payments">
            <OnlineGatewayCheckoutPanel initialGatewayId={initialGatewayId} />
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground mt-4">
          Manual UPI/bank/crypto: submit proof via the <span className="text-amber-400">Deposit</span> button. Payment gateways credit instantly after successful checkout.
        </p>
      </CardContent>
    </Card>
  );
}
