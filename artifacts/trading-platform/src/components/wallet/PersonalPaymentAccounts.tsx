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
import { Plus, Edit2, Trash2, Star, Building2, QrCode, Wallet } from "lucide-react";
import {
  CRYPTO_SYMBOLS,
  defaultNetworkForSymbol,
  formatCryptoLabel,
  networksForSymbol,
} from "./crypto-networks";

export type PaymentAccount = {
  id: number;
  label: string;
  accountType: "bank" | "upi" | "crypto";
  accountHolderName?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  upiId?: string | null;
  cryptoSymbol?: string | null;
  cryptoNetwork?: string | null;
  walletAddress?: string | null;
  isDefault: boolean;
};

type AccountForm = {
  label: string;
  accountType: PaymentAccount["accountType"];
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  upiId: string;
  cryptoSymbol: string;
  cryptoNetwork: string;
  walletAddress: string;
  isDefault: boolean;
};

const EMPTY: AccountForm = {
  label: "", accountType: "bank", accountHolderName: "", bankName: "",
  accountNumber: "", ifscCode: "", branchName: "", upiId: "",
  cryptoSymbol: "USDT", cryptoNetwork: "TRC20", walletAddress: "", isDefault: false,
};

const TYPE_ICON = { bank: Building2, upi: QrCode, crypto: Wallet };

export function PersonalPaymentAccounts({ onSelect }: { onSelect?: (acc: PaymentAccount) => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentAccount | null>(null);
  const [form, setForm] = useState({ ...EMPTY });

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["/api/wallet/payment-accounts"],
    queryFn: () => authFetchJson<PaymentAccount[]>("/wallet/payment-accounts"),
  });

  function openNew(type?: PaymentAccount["accountType"]) {
    setEditing(null);
    setForm({ ...EMPTY, accountType: type || "bank" });
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
      cryptoSymbol: acc.cryptoSymbol || "USDT",
      cryptoNetwork: acc.cryptoNetwork || "",
      walletAddress: acc.walletAddress || "",
      isDefault: acc.isDefault,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (form.accountType === "crypto" && !form.cryptoNetwork?.trim()) {
      toast({ title: "Chain required", description: "Select a network (e.g. TRC20, ERC20, BEP20 for USDT).", variant: "destructive" });
      return;
    }
    try {
      const body = { ...form };
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
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">My Payout Accounts</CardTitle>
            <CardDescription>Save bank, UPI, and crypto accounts for withdrawals. Available to all roles.</CardDescription>
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
                : `${formatCryptoLabel(acc.cryptoSymbol, acc.cryptoNetwork)} · ${acc.walletAddress?.slice(0, 12)}…`;
            return (
              <div key={acc.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="p-2 rounded-lg bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{acc.label}</p>
                    <Badge variant="outline" className="text-[10px] capitalize">{acc.accountType}</Badge>
                    {acc.accountType === "crypto" && acc.cryptoNetwork && (
                      <Badge variant="outline" className="text-[10px]">{acc.cryptoNetwork.toUpperCase()}</Badge>
                    )}
                    {acc.isDefault && <Badge className="text-[10px] bg-amber-500/20 text-amber-400"><Star className="h-3 w-3 mr-0.5" />Default</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{detail}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {onSelect && (
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => onSelect(acc)}>Use</Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(acc)}><Edit2 className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(acc.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Payout Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Label</Label>
              <Input required value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="Primary Bank" className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.accountType} onValueChange={v => setForm(f => ({ ...f, accountType: v as any }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Account</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="crypto">Crypto Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.accountType === "bank" && (
              <>
                <Input required placeholder="Account holder name" value={form.accountHolderName} onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input required placeholder="Bank name" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input required placeholder="Account number" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input placeholder="IFSC / SWIFT" value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input placeholder="Branch" value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} className="bg-white/5 border-white/10" />
              </>
            )}

            {form.accountType === "upi" && (
              <Input required placeholder="UPI ID (name@bank)" value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} className="bg-white/5 border-white/10" />
            )}

            {form.accountType === "crypto" && (
              <>
                <div className="space-y-1">
                  <Label>Asset</Label>
                  <Select
                    value={form.cryptoSymbol}
                    onValueChange={v => setForm(f => ({
                      ...f,
                      cryptoSymbol: v,
                      cryptoNetwork: defaultNetworkForSymbol(v),
                    }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CRYPTO_SYMBOLS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Chain / Network {form.cryptoSymbol === "USDT" && <span className="text-amber-400">*</span>}</Label>
                  <Select
                    value={form.cryptoNetwork}
                    onValueChange={v => setForm(f => ({ ...f, cryptoNetwork: v }))}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select chain" /></SelectTrigger>
                    <SelectContent>
                      {networksForSymbol(form.cryptoSymbol).map(n => (
                        <SelectItem key={n.value} value={n.value}>
                          {n.label}{n.hint ? ` — ${n.hint}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.cryptoSymbol === "USDT" && (
                    <p className="text-[11px] text-muted-foreground">
                      Choose TRC20, ERC20, or BEP20 — must match your wallet address network.
                    </p>
                  )}
                </div>
                <Input required placeholder="Wallet address" value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} className="bg-white/5 border-white/10 font-mono text-sm" />
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.isDefault} onCheckedChange={v => setForm(f => ({ ...f, isDefault: v }))} />
              <Label className="text-sm">Set as default withdrawal account</Label>
            </div>

            <DialogFooter>
              <Button type="submit" className="w-full bg-amber-500 text-black">{editing ? "Save Changes" : "Add Account"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
