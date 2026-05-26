import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { authFetchJson, getStoredToken } from "@/lib/token-store";
import { ArrowDownLeft, Upload } from "lucide-react";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { OnlineGatewayCheckoutPanel } from "@/components/wallet/OnlineGatewayCheckoutPanel";
import {
  enrichDepositAccount,
  upiQrImageUrl,
  cryptoQrImageUrl,
  buildUpiPayUri,
  getOnlineGatewayLabel,
  type DepositAccountsResponse,
} from "@/components/wallet/deposit-account-utils";
import { CRYPTO_DEPOSIT_TABS, findCryptoDepositAccount } from "@/components/wallet/crypto-networks";
import { DEPOSIT_FIAT_CURRENCIES } from "@/lib/wallet-currency-options";

type PaymentOption = "" | "upi" | "bank" | "gateway" | "crypto";

const PAYMENT_OPTIONS: { value: PaymentOption; label: string; hint?: string }[] = [
  { value: "upi", label: "UPI" },
  { value: "bank", label: "Bank Transfer (IMPS, NEFT, RTGS)" },
  { value: "gateway", label: "Payment Gateway" },
  { value: "crypto", label: "Crypto" },
];

export function DepositDialog({ onSuccess, trigger }: { onSuccess?: () => void; trigger?: React.ReactNode }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);

  const [paymentOption, setPaymentOption] = useState<PaymentOption>("");
  const [accountId, setAccountId] = useState("");
  const [manual, setManual] = useState({ amount: "", currency: "INR", utrReference: "", promoCode: "" });
  const [promoDiscount, setPromoDiscount] = useState<number | null>(null);
  const [promoValidating, setPromoValidating] = useState(false);

  const { data: depositAccounts } = useQuery({
    queryKey: ["/api/payments/deposit-accounts"],
    queryFn: () => authFetchJson<DepositAccountsResponse>("/payments/deposit-accounts"),
    enabled: open,
  });

  const upi = (depositAccounts?.upi || []).map(enrichDepositAccount);
  const bank = (depositAccounts?.bank || []).map(enrichDepositAccount);
  const crypto = (depositAccounts?.crypto || []).map(enrichDepositAccount);
  const online = (depositAccounts?.online || []).map(enrichDepositAccount);

  useEffect(() => {
    setAccountId("");
  }, [paymentOption]);

  useEffect(() => {
    if (!paymentOption || accountId) return;
    if (paymentOption === "upi" && upi.length) setAccountId(String(upi[0].id));
    if (paymentOption === "bank" && bank.length) setAccountId(String(bank[0].id));
    if (paymentOption === "crypto" && CRYPTO_DEPOSIT_TABS.length) {
      const first = CRYPTO_DEPOSIT_TABS.find(t => findCryptoDepositAccount(crypto, t));
      if (first) setAccountId(first.key);
    }
  }, [paymentOption, upi, bank, crypto, accountId]);

  const activeUpi = upi.find(a => String(a.id) === accountId);
  const activeBank = bank.find(a => String(a.id) === accountId);
  const activeGateway = online.find(g => String(g.id) === accountId);
  const activeCryptoTab = CRYPTO_DEPOSIT_TABS.find(t => t.key === accountId);
  const activeCrypto = activeCryptoTab ? findCryptoDepositAccount(crypto, activeCryptoTab) : undefined;

  async function validatePromo() {
    if (!manual.promoCode.trim()) { setPromoDiscount(null); return; }
    setPromoValidating(true);
    try {
      const res = await authFetchJson<{ valid: boolean; discount: number }>("/promo-codes/validate", {
        method: "POST",
        body: JSON.stringify({ code: manual.promoCode.trim(), amount: Number(manual.amount) || 0, appliesTo: "deposit" }),
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
    if (paymentOption === "gateway") return;

    setLoading(true);
    try {
      if (paymentOption === "crypto") {
        await authFetchJson("/payments/crypto/deposit", {
          method: "POST",
          body: JSON.stringify({
            amount: Number(manual.amount),
            currency: activeCryptoTab?.symbol || "USDT",
            txHash: manual.utrReference,
            gatewayId: activeCrypto?.id,
          }),
        });
        toast({ title: "Crypto deposit submitted", description: "Pending verification." });
      } else {
        const active = paymentOption === "upi" ? activeUpi : activeBank;
        const fd = new FormData();
        fd.append("amount", manual.amount);
        fd.append("currency", manual.currency);
        fd.append("paymentMethod", active?.name || paymentOption);
        if (manual.utrReference) fd.append("utrReference", manual.utrReference);
        if (manual.promoCode.trim()) fd.append("promoCode", manual.promoCode.trim().toUpperCase());
        if (active) fd.append("notes", `Deposit to ${active.name} (ID ${active.id})`);
        const file = proofRef.current?.files?.[0];
        if (file) fd.append("proof", file);

        const token = getStoredToken();
        const res = await fetch("/api/transactions/manual-deposit", {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Deposit failed");
        toast({ title: "Deposit submitted", description: "Pending admin verification." });
      }
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({ title: "Deposit failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const accountOptions = (() => {
    if (paymentOption === "upi") return upi.map(a => ({ value: String(a.id), label: a.name }));
    if (paymentOption === "bank") return bank.map(a => ({ value: String(a.id), label: a.name }));
    if (paymentOption === "gateway") return online.map(g => ({ value: String(g.id), label: g.name || getOnlineGatewayLabel(g.type) }));
    if (paymentOption === "crypto") return CRYPTO_DEPOSIT_TABS.map(t => ({ value: t.key, label: t.label }));
    return [];
  })();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
            <ArrowDownLeft className="mr-2 h-4 w-4" /> Deposit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-[#050A14] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>Select payment type, then choose an account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Payment option</Label>
            <Select value={paymentOption} onValueChange={v => setPaymentOption(v as PaymentOption)}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue placeholder="-- Select payment option --" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {paymentOption && (
            <div className="space-y-1.5">
              <Label>
                {paymentOption === "upi" && "Select UPI ID"}
                {paymentOption === "bank" && "Select bank account"}
                {paymentOption === "crypto" && "Select coin / network"}
                {paymentOption === "gateway" && "Select payment gateway"}
              </Label>
              <Select
                value={accountId}
                onValueChange={setAccountId}
              >
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="-- Select account --" />
                </SelectTrigger>
                <SelectContent>
                  {accountOptions.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {paymentOption === "gateway" && online.length === 0 && (
                <p className="text-xs text-muted-foreground">No gateways enabled. Contact admin.</p>
              )}
            </div>
          )}

          {paymentOption === "gateway" && accountId && (
            <OnlineGatewayCheckoutPanel
              compact
              initialGatewayId={accountId}
              onSuccess={() => {
                setOpen(false);
                onSuccess?.();
              }}
            />
          )}

          {paymentOption === "upi" && activeUpi && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
              <p className="text-sm font-medium text-center">{activeUpi.name}</p>
              {(activeUpi.qrCodeUrl || activeUpi.upiId) && (
                <img
                  src={activeUpi.qrCodeUrl || upiQrImageUrl(activeUpi.upiId!, activeUpi.name, manual.amount ? Number(manual.amount) : undefined)}
                  alt="UPI QR"
                  className="mx-auto max-h-40 rounded border border-white/10"
                />
              )}
              {activeUpi.upiId && (
                <>
                  <CredentialRow label="UPI ID" value={activeUpi.upiId} mono />
                  <a href={buildUpiPayUri(activeUpi.upiId, activeUpi.name)} className="inline-flex text-sm font-semibold text-black bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded-md">
                    Pay Now
                  </a>
                </>
              )}
            </div>
          )}

          {paymentOption === "bank" && activeBank && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-0">
              <p className="text-sm font-medium mb-2">{activeBank.name}</p>
              <p className="text-xs text-muted-foreground mb-2 italic">IMPS · NEFT · RTGS · Wire Transfer</p>
              <CredentialRow label="Account Holder" value={activeBank.accountHolderName} />
              <CredentialRow label="Bank" value={activeBank.bankName} copyable={false} />
              <CredentialRow label="Account No." value={activeBank.accountNumber} mono />
              <CredentialRow label="IFSC" value={activeBank.ifscCode} mono />
              <CredentialRow label="MICR" value={activeBank.micrCode} mono />
              <CredentialRow label="SWIFT" value={activeBank.swiftCode} mono />
              <CredentialRow label="Branch" value={activeBank.branchName} copyable={false} />
            </div>
          )}

          {paymentOption === "crypto" && activeCryptoTab && (
            <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-3">
              <p className="text-sm font-medium">{activeCryptoTab.label}</p>
              {activeCrypto ? (
                <>
                  {(activeCrypto.qrCodeUrl || activeCrypto.walletAddress) && (
                    <img
                      src={activeCrypto.qrCodeUrl || cryptoQrImageUrl(activeCrypto.walletAddress!)}
                      alt="Wallet QR"
                      className="mx-auto max-h-40 rounded border border-white/10"
                    />
                  )}
                  <CredentialRow label="Coin" value={`${activeCrypto.symbol} (${activeCrypto.network})`} copyable={false} />
                  <CredentialRow label="Address" value={activeCrypto.walletAddress} mono />
                </>
              ) : (
                <p className="text-xs text-amber-400/80">Wallet not configured for {activeCryptoTab.label}.</p>
              )}
            </div>
          )}

          {paymentOption && paymentOption !== "gateway" && (
            <form onSubmit={handleSubmit} className="space-y-3 pt-2 border-t border-white/10">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <Input type="number" required min={1} value={manual.amount}
                    onChange={e => setManual({ ...manual, amount: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1">
                  <Label>Currency</Label>
                  <Select value={manual.currency} onValueChange={v => setManual({ ...manual, currency: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPOSIT_FIAT_CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Promo code (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    value={manual.promoCode}
                    onChange={e => setManual({ ...manual, promoCode: e.target.value.toUpperCase() })}
                    placeholder="SAVE20"
                    className="bg-white/5 border-white/10 uppercase"
                  />
                  <Button type="button" variant="outline" onClick={validatePromo} disabled={promoValidating || !manual.promoCode.trim()}>
                    Apply
                  </Button>
                </div>
                {promoDiscount != null && (
                  <p className="text-xs text-green-400">Discount: {promoDiscount} {manual.currency}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>{paymentOption === "crypto" ? "Transaction Hash / TX ID" : "UTR / Reference Number"}</Label>
                <Input
                  required={paymentOption === "crypto"}
                  placeholder={paymentOption === "crypto" ? "Blockchain transaction hash" : "Payment reference"}
                  value={manual.utrReference}
                  onChange={e => setManual({ ...manual, utrReference: e.target.value })}
                  className="bg-white/5 border-white/10 font-mono text-sm"
                />
              </div>
              {paymentOption !== "crypto" && (
                <div className="space-y-1">
                  <Label>Payment proof (screenshot)</Label>
                  <Input ref={proofRef} type="file" accept="image/*,.pdf" className="bg-white/5 border-white/10" />
                </div>
              )}
              <Button type="submit" disabled={loading} className="w-full bg-amber-500 text-black font-semibold">
                {loading ? "Submitting..." : <><Upload className="h-4 w-4 mr-2 inline" />Submit for Verification</>}
              </Button>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
