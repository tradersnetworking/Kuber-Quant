import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Edit2, Trash2, RefreshCw, QrCode, Building2, Wallet, Globe } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { enrichDepositAccount, ONLINE_GATEWAY_CATALOG, getOnlineGatewayMeta, isOnlineGatewayType, type DepositAccount } from "@/components/wallet/deposit-account-utils";
import { CRYPTO_SYMBOLS, defaultNetworkForSymbol, networksForSymbol, USDT_CHAINS } from "@/components/wallet/crypto-networks";

const USDT_CRYPTO_PRESETS = [
  { label: "USDT TRC20", symbol: "USDT", network: "TRC20", name: "USDT (TRC20)" },
  { label: "USDT ERC20", symbol: "USDT", network: "ERC20", name: "USDT (ERC20)" },
  { label: "USDT BEP20", symbol: "USDT", network: "BEP20", name: "USDT (BEP20)" },
] as const;

type GwForm = {
  name: string;
  type: string;
  symbol: string;
  network: string;
  description: string;
  walletAddress: string;
  upiId: string;
  qrCodeUrl: string;
  minAmount: number;
  isEnabled: boolean;
  sortOrder: number;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  swiftCode: string;
  micrCode: string;
  badge: string;
  note: string;
  logoUrl: string;
  merchantId: string;
  publicKey: string;
};

const emptyForm = (type: string): GwForm => ({
  name: "", type, symbol: type === "crypto" ? "USDT" : "", network: type === "crypto" ? "TRC20" : "",
  description: "", walletAddress: "", upiId: "", qrCodeUrl: "", minAmount: 10, isEnabled: true, sortOrder: 0,
  accountHolderName: "", bankName: "", accountNumber: "", ifscCode: "", branchName: "",
  accountType: "Current", swiftCode: "", micrCode: "", badge: "", note: "", logoUrl: "",
  merchantId: "", publicKey: "",
});

function formFromGateway(gw: DepositAccount, type: string): GwForm {
  const ec = gw.extraConfig || {};
  return {
    ...emptyForm(type),
    ...gw,
    name: gw.name,
    type: gw.type,
    symbol: gw.symbol || "",
    network: gw.network || "",
    description: gw.description || "",
    walletAddress: gw.walletAddress || "",
    upiId: gw.upiId || "",
    qrCodeUrl: gw.qrCodeUrl || "",
    minAmount: gw.minAmount,
    isEnabled: gw.isEnabled ?? true,
    sortOrder: gw.sortOrder ?? 0,
    accountHolderName: ec.accountHolderName || gw.accountHolderName || "",
    bankName: ec.bankName || gw.bankName || "",
    accountNumber: ec.accountNumber || gw.accountNumber || "",
    ifscCode: ec.ifscCode || gw.ifscCode || "",
    branchName: ec.branchName || gw.branchName || "",
      accountType: ec.accountType || gw.accountType || "Current",
      swiftCode: ec.swiftCode || gw.swiftCode || "",
      micrCode: ec.micrCode || ec.micr || gw.micrCode || "",
    badge: ec.badge || gw.badge || "",
    note: ec.note || gw.note || "",
    logoUrl: ec.logoUrl || gw.logoUrl || "",
    merchantId: ec.merchantId || "",
    publicKey: ec.publicKey || ec.clientId || "",
  };
}

function buildPayload(form: GwForm) {
  const extraConfig: Record<string, string> = {};
  if (form.type === "bank") {
    Object.assign(extraConfig, {
      accountHolderName: form.accountHolderName,
      bankName: form.bankName || form.name,
      accountNumber: form.accountNumber,
      ifscCode: form.ifscCode,
      branchName: form.branchName,
      accountType: form.accountType,
      swiftCode: form.swiftCode,
      micrCode: form.micrCode,
    });
  }
  if (form.badge) extraConfig.badge = form.badge;
  if (form.note) extraConfig.note = form.note;
  if (form.logoUrl) extraConfig.logoUrl = form.logoUrl;
  if (isOnlineGatewayType(form.type)) {
    if (form.merchantId) extraConfig.merchantId = form.merchantId;
    if (form.publicKey) extraConfig.publicKey = form.publicKey;
  }
  return { ...form, extraConfig };
}

function AdminAccountCard({
  gw,
  onEdit,
  onDelete,
  onToggle,
}: {
  gw: DepositAccount;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: (v: boolean) => void;
}) {
  const a = enrichDepositAccount(gw);
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{a.name}</p>
              {a.badge && <Badge className="text-[10px] bg-amber-500/20 text-amber-400">{a.badge}</Badge>}
              {!a.isEnabled && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Min ${a.minAmount} · Order {a.sortOrder}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch checked={a.isEnabled} onCheckedChange={onToggle} />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="outline" className="h-8 w-8 text-red-400" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        <div className="rounded-lg border border-white/10 bg-black/20 p-3 space-y-0">
          {a.type === "upi" && (
            <>
              <CredentialRow label="UPI ID" value={a.upiId} mono />
              {a.description && <CredentialRow label="Note" value={a.description} copyable={false} />}
            </>
          )}
          {a.type === "bank" && (
            <>
              <CredentialRow label="Bank" value={a.bankName} copyable={false} />
              <CredentialRow label="Account Holder" value={a.accountHolderName} copyable={false} />
              <CredentialRow label="Account No." value={a.accountNumber} mono />
              <CredentialRow label="IFSC" value={a.ifscCode} mono />
              <CredentialRow label="MICR" value={a.micrCode || a.extraConfig?.micrCode} mono />
              <CredentialRow label="Branch" value={a.branchName} copyable={false} />
              <CredentialRow label="Account Type" value={a.accountType} copyable={false} />
              <CredentialRow label="SWIFT" value={a.swiftCode} mono />
            </>
          )}
          {a.type === "crypto" && (
            <>
              <CredentialRow label="Coin" value={`${a.symbol || "—"} (${a.network || "—"})`} copyable={false} />
              <CredentialRow label="Address" value={a.walletAddress} mono />
            </>
          )}
          {isOnlineGatewayType(a.type) && (
            <>
              <CredentialRow label="Gateway" value={getOnlineGatewayMeta(a.type)?.label || a.type} copyable={false} />
              <CredentialRow label="Merchant ID" value={a.extraConfig?.merchantId} mono />
              <CredentialRow label="Public Key" value={a.extraConfig?.publicKey} mono />
              <p className="text-[11px] text-muted-foreground pt-2">
                API secrets: set env vars {getOnlineGatewayMeta(a.type)?.envVars.join(", ") || "—"} on the server.
              </p>
            </>
          )}
          {a.note && <p className="text-[11px] text-amber-400/80 pt-2 border-t border-white/5">{a.note}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function AccountSection({
  title,
  description,
  typeFilter,
  gateways,
  icon: Icon,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  title: string;
  description: string;
  typeFilter: (t: string) => boolean;
  gateways: DepositAccount[];
  icon: React.ComponentType<{ className?: string }>;
  onAdd: () => void;
  onEdit: (gw: DepositAccount) => void;
  onDelete: (id: number) => void;
  onToggle: (gw: DepositAccount, v: boolean) => void;
}) {
  const items = gateways.filter(g => typeFilter(g.type));
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Icon className="h-4 w-4 text-amber-400" /> {title}
            <Badge variant="outline" className="text-[10px]">Multiple Supported</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </div>
        <Button size="sm" className="bg-amber-500 text-black shrink-0" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <Card className="bg-white/[0.02] border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} configured yet.
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {items.map(gw => (
            <AdminAccountCard
              key={gw.id}
              gw={gw}
              onEdit={() => onEdit(gw)}
              onDelete={() => onDelete(gw.id)}
              onToggle={v => onToggle(gw, v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function PaymentGatewaysPanel() {
  const { toast } = useToast();
  const [gateways, setGateways] = useState<DepositAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DepositAccount | null>(null);
  const [form, setForm] = useState<GwForm>(emptyForm("upi"));
  const [tab, setTab] = useState("upi");

  const load = async () => {
    setLoading(true);
    try {
      const rows = await staffFetch<DepositAccount[]>("/admin/payment-gateways");
      setGateways(rows.map(enrichDepositAccount));
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = (type: string) => {
    setEditing(null);
    setForm(emptyForm(type));
    setOpen(true);
  };

  const openEditGw = (gw: DepositAccount) => {
    setEditing(gw);
    setForm(formFromGateway(gw, gw.type));
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = buildPayload(form);
      if (editing) {
        await staffFetch(`/admin/payment-gateways/${editing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast({ title: "Account updated" });
      } else {
        await staffFetch("/admin/payment-gateways", { method: "POST", body: JSON.stringify(payload) });
        toast({ title: "Account added" });
      }
      setOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    }
  };

  const remove = async (id: number) => {
    if (!confirm("Delete this deposit account?")) return;
    try {
      await staffFetch(`/admin/payment-gateways/${id}`, { method: "DELETE" });
      toast({ title: "Deleted" });
      load();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const toggle = async (gw: DepositAccount, enabled: boolean) => {
    try {
      await staffFetch(`/admin/payment-gateways/${gw.id}`, { method: "PATCH", body: JSON.stringify({ isEnabled: enabled }) });
      load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading) return <Skeleton className="h-48 w-full" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-400" /> Deposit & Payment Accounts
          </h2>
          <p className="text-sm text-muted-foreground">
            Configure multiple UPI, bank, and crypto accounts for user deposits (like WP Payment Forms Pro). Users see copy buttons beside each credential.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="upi" className="gap-1"><QrCode className="h-3.5 w-3.5" /> UPI ({gateways.filter(g => g.type === "upi").length})</TabsTrigger>
          <TabsTrigger value="bank" className="gap-1"><Building2 className="h-3.5 w-3.5" /> Bank ({gateways.filter(g => ["bank", "fiat"].includes(g.type)).length})</TabsTrigger>
          <TabsTrigger value="crypto" className="gap-1"><Wallet className="h-3.5 w-3.5" /> Crypto ({gateways.filter(g => g.type === "crypto").length})</TabsTrigger>
          <TabsTrigger value="online" className="gap-1"><Globe className="h-3.5 w-3.5" /> Online ({gateways.filter(g => isOnlineGatewayType(g.type)).length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upi" className="mt-4">
          <AccountSection
            title="UPI / QR Accounts"
            description="Add multiple UPI IDs. Customers copy the UPI ID or scan a dynamic QR when depositing."
            typeFilter={t => t === "upi"}
            gateways={gateways}
            icon={QrCode}
            onAdd={() => openNew("upi")}
            onEdit={openEditGw}
            onDelete={remove}
            onToggle={toggle}
          />
        </TabsContent>

        <TabsContent value="bank" className="mt-4">
          <AccountSection
            title="Bank Accounts"
            description="Add multiple NEFT/IMPS/RTGS accounts. All bank details are copyable by users."
            typeFilter={t => t === "bank" || t === "fiat"}
            gateways={gateways}
            icon={Building2}
            onAdd={() => openNew("bank")}
            onEdit={openEditGw}
            onDelete={remove}
            onToggle={toggle}
          />
        </TabsContent>

        <TabsContent value="crypto" className="mt-4">
          <AccountSection
            title="Cryptocurrency Wallets"
            description="Add multiple coin/network wallets (USDT TRC20/ERC20/BEP20, BTC, ETH). Addresses are copyable with QR."
            typeFilter={t => t === "crypto"}
            gateways={gateways}
            icon={Wallet}
            onAdd={() => openNew("crypto")}
            onEdit={openEditGw}
            onDelete={remove}
            onToggle={toggle}
          />
        </TabsContent>

        <TabsContent value="online" className="mt-4">
          <AccountSection
            title="Online Payment Gateways"
            description="Paytm, PhonePe, Razorpay, Cashfree, Stripe, Instamojo, PayU, Pine Labs, Easebuzz — enable for instant checkout deposits."
            typeFilter={t => isOnlineGatewayType(t)}
            gateways={gateways}
            icon={Globe}
            onAdd={() => openNew("razorpay")}
            onEdit={openEditGw}
            onDelete={remove}
            onToggle={toggle}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Account" : "Add Deposit Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="space-y-1">
              <Label>Display Name *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PhonePe Business" className="bg-white/5 border-white/10" />
            </div>

            {form.type === "upi" && (
              <>
                <div className="space-y-1"><Label>UPI ID (VPA) *</Label><Input required value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} placeholder="merchant@ybl" className="bg-white/5 border-white/10 font-mono" /></div>
                <div className="space-y-1"><Label>Static QR Image URL</Label><Input value={form.qrCodeUrl} onChange={e => setForm(f => ({ ...f, qrCodeUrl: e.target.value }))} placeholder="Optional — or dynamic QR generated for users" className="bg-white/5 border-white/10" /></div>
              </>
            )}

            {form.type === "bank" && (
              <div className="space-y-2 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <Input required placeholder="Bank name *" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input required placeholder="Account holder name *" value={form.accountHolderName} onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input required placeholder="Account number *" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="bg-white/5 border-white/10 font-mono" />
                <Input required placeholder="IFSC code *" value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} className="bg-white/5 border-white/10 font-mono" />
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Account type" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))} className="bg-white/5 border-white/10" />
                  <Input placeholder="Branch" value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} className="bg-white/5 border-white/10" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="MICR code" value={form.micrCode} onChange={e => setForm(f => ({ ...f, micrCode: e.target.value }))} className="bg-white/5 border-white/10 font-mono" />
                  <Input placeholder="SWIFT (international)" value={form.swiftCode} onChange={e => setForm(f => ({ ...f, swiftCode: e.target.value }))} className="bg-white/5 border-white/10 font-mono" />
                </div>
                <Input placeholder="Bank QR image URL" value={form.qrCodeUrl} onChange={e => setForm(f => ({ ...f, qrCodeUrl: e.target.value }))} className="bg-white/5 border-white/10" />
              </div>
            )}

            {form.type === "crypto" && (
              <div className="space-y-2 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Quick add USDT</Label>
                  <div className="flex flex-wrap gap-2">
                    {USDT_CRYPTO_PRESETS.map(p => (
                      <Button
                        key={p.network}
                        type="button"
                        size="sm"
                        variant={form.symbol === p.symbol && form.network === p.network ? "default" : "outline"}
                        className={form.symbol === p.symbol && form.network === p.network ? "bg-amber-500 text-black" : "border-white/10"}
                        onClick={() => setForm(f => ({
                          ...f,
                          name: f.name || p.name,
                          symbol: p.symbol,
                          network: p.network,
                        }))}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Coin *</Label>
                  <Select value={form.symbol} onValueChange={v => setForm(f => ({ ...f, symbol: v, network: defaultNetworkForSymbol(v) }))}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>{CRYPTO_SYMBOLS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Network / Chain *</Label>
                  <Select value={form.network} onValueChange={v => setForm(f => ({ ...f, network: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Chain" /></SelectTrigger>
                    <SelectContent>
                      {(form.symbol.toUpperCase() === "USDT" ? USDT_CHAINS : networksForSymbol(form.symbol)).map(n => (
                        <SelectItem key={n.value} value={n.value}>
                          {n.label}{n.hint ? ` — ${n.hint}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.symbol.toUpperCase() === "USDT" && (
                    <p className="text-[11px] text-muted-foreground">USDT supports TRC20 (Tron), ERC20 (Ethereum), and BEP20 (BNB Chain).</p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Wallet address *</Label>
                  <Input required placeholder="Wallet address *" value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} className="bg-white/5 border-white/10 font-mono text-sm" />
                </div>
              </div>
            )}

            {isOnlineGatewayType(form.type) && (
              <div className="space-y-2 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="space-y-1">
                  <Label>Gateway Provider *</Label>
                  <Select
                    value={form.type}
                    onValueChange={v => {
                      const meta = getOnlineGatewayMeta(v);
                      setForm(f => ({
                        ...f,
                        type: v,
                        name: f.name || meta?.label || v,
                        description: f.description || meta?.description || "",
                      }));
                    }}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ONLINE_GATEWAY_CATALOG.map(g => (
                        <SelectItem key={g.type} value={g.type}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {getOnlineGatewayMeta(form.type)?.description}
                </p>
                <p className="text-[11px] text-amber-400/80">
                  Server env: {getOnlineGatewayMeta(form.type)?.envVars.join(", ") || "—"}
                </p>
                <Input placeholder="Merchant ID (reference / display)" value={form.merchantId} onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} className="bg-white/5 border-white/10 font-mono text-sm" />
                <Input placeholder="Public Key / Client ID (reference only — secrets go in .env)" value={form.publicKey} onChange={e => setForm(f => ({ ...f, publicKey: e.target.value }))} className="bg-white/5 border-white/10 font-mono text-sm" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Min Amount ($)</Label><Input type="number" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
              <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="bg-white/5 border-white/10" /></div>
            </div>
            <Input placeholder="Badge (e.g. Recommended, Instant)" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="bg-white/5 border-white/10" />
            <Textarea placeholder="Note to customer (shown on deposit page)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-white/5 border-white/10" rows={2} />
            <div className="flex items-center gap-2">
              <Switch checked={form.isEnabled} onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))} />
              <Label>Enabled — visible to users</Label>
            </div>
            <DialogFooter><Button type="submit" className="bg-amber-500 text-black w-full">Save Account</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
