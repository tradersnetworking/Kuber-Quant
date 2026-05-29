import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { authFetchJson } from "@/lib/token-store";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, Star, Building2, QrCode, Wallet, Loader2, IndianRupee } from "lucide-react";
import { formatCryptoLabel } from "./crypto-networks";
import { CryptoAssetPicker } from "./CryptoAssetPicker";
import { CryptoAssetIcon } from "./CryptoAssetIcon";
import { findCatalogAsset } from "./crypto-asset-catalog";
import { UserQrUploadButton } from "./UserQrUploadButton";
import { PayoutAccountDetailsCard } from "./PayoutAccountDetailsCard";
import { resolvePayoutQrSrc } from "./deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import type { PaymentAccount } from "./payout-account-types";

export type { PaymentAccount };

type AccountForm = {
  label: string;
  accountType: PaymentAccount["accountType"];
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  digitalRupeeId: string;
  upiQrUrl: string;
  cryptoSymbol: string;
  cryptoNetwork: string;
  walletAddress: string;
  walletQrUrl: string;
  isDefault: boolean;
};

const EMPTY: AccountForm = {
  label: "", accountType: "bank", accountHolderName: "", bankName: "",
  accountNumber: "", ifscCode: "", branchName: "", upiId: "", digitalRupeeId: "", upiQrUrl: "",
  cryptoSymbol: "USDT", cryptoNetwork: "TRC20", walletAddress: "", walletQrUrl: "", isDefault: false,
};

const EMPTY_CRYPTO_META = { coinName: "Tether USD" };

const TYPE_ICON = { bank: Building2, upi: QrCode, digital_rupee: IndianRupee, crypto: Wallet };

function buildAccountPayload(form: AccountForm) {
  const base = {
    label: form.label.trim(),
    accountType: form.accountType,
    isDefault: form.isDefault,
  };
  if (form.accountType === "bank") {
    return {
      ...base,
      accountHolderName: form.accountHolderName.trim(),
      bankName: form.bankName.trim(),
      accountNumber: form.accountNumber.trim(),
      ifscCode: form.ifscCode.trim().toUpperCase() || undefined,
      branchName: form.branchName.trim() || undefined,
    };
  }
  if (form.accountType === "upi") {
    return {
      ...base,
      upiId: form.upiId.trim().toLowerCase(),
      upiQrUrl: form.upiQrUrl?.trim() || undefined,
    };
  }
  if (form.accountType === "digital_rupee") {
    return {
      ...base,
      digitalRupeeId: form.digitalRupeeId.trim(),
      upiQrUrl: form.upiQrUrl?.trim() || undefined,
    };
  }
  return {
    ...base,
    cryptoSymbol: form.cryptoSymbol.trim().toUpperCase(),
    cryptoNetwork: form.cryptoNetwork.trim(),
    walletAddress: form.walletAddress.trim(),
    walletQrUrl: form.walletQrUrl?.trim() || undefined,
  };
}

export function PersonalPaymentAccounts({ onSelect }: { onSelect?: (acc: PaymentAccount) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentAccount | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [cryptoMeta, setCryptoMeta] = useState(EMPTY_CRYPTO_META);
  const [saving, setSaving] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<PaymentAccount[]>("/wallet/payment-accounts"),
  });

  function openNew(type?: PaymentAccount["accountType"]) {
    setEditing(null);
    setForm({ ...EMPTY, accountType: type || "bank" });
    setCryptoMeta(EMPTY_CRYPTO_META);
    setOpen(true);
  }

  function openEdit(acc: PaymentAccount) {
    setEditing(acc);
    setForm({
      label: acc.label,
      accountType: acc.accountType,
      accountHolderName: acc.accountHolderName || "",
      bankName: acc.bankName || "",
      accountNumber: acc.accountNumber || "",
      ifscCode: acc.ifscCode || "",
      branchName: acc.branchName || "",
      upiId: acc.upiId || "",
      digitalRupeeId: acc.digitalRupeeId || "",
      upiQrUrl: acc.upiQrUrl || "",
      cryptoSymbol: acc.cryptoSymbol || "USDT",
      cryptoNetwork: acc.cryptoNetwork || "",
      walletAddress: acc.walletAddress || "",
      walletQrUrl: acc.walletQrUrl || "",
      isDefault: acc.isDefault,
    });
    setCryptoMeta({ coinName: findCatalogAsset(acc.cryptoSymbol || "")?.name || acc.cryptoSymbol || "" });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    if (!form.label.trim()) {
      toast({ title: "Label required", description: "Give this account a name (e.g. Primary UPI).", variant: "destructive" });
      return;
    }
    if (form.accountType === "bank" && (!form.accountHolderName.trim() || !form.bankName.trim() || !form.accountNumber.trim())) {
      toast({ title: "Bank details required", description: "Account holder, bank name, and account number are required.", variant: "destructive" });
      return;
    }
    if (form.accountType === "upi" && !form.upiId.trim()) {
      toast({ title: "UPI ID required", variant: "destructive" });
      return;
    }
    if (form.accountType === "digital_rupee" && !form.digitalRupeeId.trim()) {
      toast({ title: "Digital Rupee ID required", variant: "destructive" });
      return;
    }
    if (form.accountType === "crypto" && !form.walletAddress.trim()) {
      toast({ title: "Wallet address required", variant: "destructive" });
      return;
    }
    if (form.accountType === "crypto" && !form.cryptoNetwork?.trim()) {
      toast({ title: "Chain required", description: "Select a network (e.g. TRC20, ERC20, BEP20 for USDT).", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const body = buildAccountPayload(form);
      if (editing) {
        await authFetchJson(`/wallet/payment-accounts/${editing.id}`, { method: "PATCH", body: JSON.stringify(body) });
        toast({ title: "Account updated" });
      } else {
        await authFetchJson("/wallet/payment-accounts", { method: "POST", body: JSON.stringify(body) });
        toast({ title: "Account added" });
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["/api/wallet/payment-accounts"] });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Remove this payout account?")) return;
    try {
      await authFetchJson(`/wallet/payment-accounts/${id}`, { method: "DELETE" });
      toast({ title: "Account removed" });
      qc.invalidateQueries({ queryKey: ["/api/wallet/payment-accounts"] });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">My Payout Accounts</CardTitle>
            <CardDescription>Save bank, UPI, Digital Rupee, and crypto wallets for withdrawals and exchange payouts. You can edit QR codes and addresses anytime.</CardDescription>
          </div>
          <Button size="sm" className="bg-amber-500 text-black shrink-0" onClick={() => openNew()}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : accounts.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground space-y-3">
            <p>No payout accounts saved yet.</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => openNew("bank")}>+ Bank</Button>
              <Button size="sm" variant="outline" onClick={() => openNew("upi")}>+ UPI</Button>
              <Button size="sm" variant="outline" onClick={() => openNew("digital_rupee")}>+ Digital Rupee</Button>
              <Button size="sm" variant="outline" onClick={() => openNew("crypto")}>+ Crypto</Button>
            </div>
          </div>
        ) : (
          accounts.map(acc => {
            const Icon = TYPE_ICON[acc.accountType];
            const detail = acc.accountType === "bank"
              ? `${acc.bankName} · ****${String(acc.accountNumber || "").slice(-4)}`
              : acc.accountType === "upi"
                ? acc.upiId
                : acc.accountType === "digital_rupee"
                  ? acc.digitalRupeeId
                  : `${formatCryptoLabel(acc.cryptoSymbol, acc.cryptoNetwork)} · ${acc.walletAddress?.slice(0, 12)}…`;
            return (
              <div key={acc.id} className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] overflow-hidden">
                <div className="flex items-center gap-3 p-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {acc.accountType === "crypto" ? (
                      <CryptoAssetIcon symbol={acc.cryptoSymbol} network={acc.cryptoNetwork} size="sm" />
                    ) : (
                      <Icon className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{acc.label}</p>
                      <Badge variant="outline" className="text-[10px] capitalize">{acc.accountType === "digital_rupee" ? "Digital Rupee" : acc.accountType}</Badge>
                      {acc.accountType === "crypto" && acc.cryptoNetwork && (
                        <Badge variant="outline" className="text-[10px]">{acc.cryptoNetwork.toUpperCase()}</Badge>
                      )}
                      {acc.isDefault && <Badge className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400"><Star className="h-3 w-3 mr-0.5" />Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{detail}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {onSelect && (
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onSelect(acc)}>Use</Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(acc)} title="Edit account"><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(acc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
                <div className="px-3 pb-3">
                  <PayoutAccountDetailsCard account={acc} compact className="border-border/80 dark:border-white/5 bg-black/15" />
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-md w-[calc(100vw-2rem)] p-0 gap-0 flex flex-col max-h-[min(90dvh,calc(100dvh-1.5rem))] overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle>{editing ? "Edit Account" : "Add Payout Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 space-y-3">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Primary Bank" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v as any }))}>
                <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="digital_rupee">Digital Rupee (e-Rupee)</SelectItem>
                  <SelectItem value="crypto">Crypto Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.accountType === "bank" && (
              <>
                <Input required placeholder="Account holder name" value={form.accountHolderName} onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input required placeholder="Bank name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input required placeholder="Account number" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input placeholder="IFSC / SWIFT" value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input placeholder="Branch" value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </>
            )}

            {form.accountType === "upi" && (
              <>
                <Input required placeholder="UPI ID (name@bank)" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">UPI QR code (optional — auto-generated if not uploaded)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <UserQrUploadButton onUploaded={url => setForm(f => ({ ...f, upiQrUrl: url }))} />
                    {(form.upiQrUrl || form.upiId) && (
                      <QrImage
                        src={resolvePayoutQrSrc({
                          accountType: "upi",
                          label: form.label || "UPI",
                          upiId: form.upiId,
                          upiQrUrl: form.upiQrUrl,
                        })}
                        fallbackSrc={form.upiId ? resolvePayoutQrSrc({ accountType: "upi", label: form.label || "UPI", upiId: form.upiId }) : undefined}
                        alt="UPI QR preview"
                        className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {form.accountType === "digital_rupee" && (
              <>
                <Input required placeholder="Digital Rupee wallet ID" value={form.digitalRupeeId} onChange={e => setForm(f => ({ ...f, digitalRupeeId: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Digital Rupee QR code (optional — auto-generated if not uploaded)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <UserQrUploadButton onUploaded={url => setForm(f => ({ ...f, upiQrUrl: url }))} />
                    {(form.upiQrUrl || form.digitalRupeeId) && (
                      <QrImage
                        src={resolvePayoutQrSrc({
                          accountType: "digital_rupee",
                          label: form.label || "Digital Rupee",
                          digitalRupeeId: form.digitalRupeeId,
                          upiQrUrl: form.upiQrUrl,
                        })}
                        fallbackSrc={form.digitalRupeeId ? resolvePayoutQrSrc({ accountType: "digital_rupee", label: form.label || "Digital Rupee", digitalRupeeId: form.digitalRupeeId }) : undefined}
                        alt="Digital Rupee QR preview"
                        className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {form.accountType === "crypto" && (
              <>
                <CryptoAssetPicker
                  value={{ symbol: form.cryptoSymbol, network: form.cryptoNetwork, coinName: cryptoMeta.coinName }}
                  onChange={next => {
                    setForm(f => ({ ...f, cryptoSymbol: next.symbol, cryptoNetwork: next.network }));
                    setCryptoMeta({ coinName: next.coinName });
                  }}
                  onAutoName={label => setForm(f => ({ ...f, label: f.label.trim() ? f.label : label }))}
                />
                <Input required placeholder="Wallet address" value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm" />
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Wallet QR code (optional — auto-generated if not uploaded)</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    <UserQrUploadButton
                      label="Upload wallet QR"
                      uploadPath="/wallet/payment-accounts/upload/wallet-qr"
                      onUploaded={url => setForm(f => ({ ...f, walletQrUrl: url }))}
                    />
                    {(form.walletQrUrl || form.walletAddress) && (
                      <QrImage
                        src={resolvePayoutQrSrc({
                          accountType: "crypto",
                          label: form.label || "Wallet",
                          walletAddress: form.walletAddress,
                          walletQrUrl: form.walletQrUrl,
                        })}
                        fallbackSrc={form.walletAddress ? resolvePayoutQrSrc({ accountType: "crypto", walletAddress: form.walletAddress }) : undefined}
                        alt="Wallet QR preview"
                        className="h-16 w-16 rounded border border-border dark:border-white/10 bg-white p-0.5 object-contain"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Upload your wallet QR or we generate one from the address. Edit anytime from this screen.</p>
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
              <Label className="text-sm">Set as default withdrawal account</Label>
            </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:flex-1 bg-amber-500 text-black" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editing ? "Save Changes" : "Add Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
