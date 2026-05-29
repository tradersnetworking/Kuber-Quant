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
import { PaymentMethodTabsList, PaymentMethodTabsTrigger } from "@/components/wallet/PaymentMethodField";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Plus, Edit2, Trash2, RefreshCw, QrCode, Building2, Wallet, Globe, Loader2, IndianRupee } from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { CredentialRow } from "@/components/wallet/CredentialRow";
import { enrichDepositAccount, ONLINE_GATEWAY_CATALOG, getOnlineGatewayMeta, isOnlineGatewayType, type DepositAccount, minAmountLabelForGatewayType, formatGatewayMinAmount } from "@/components/wallet/deposit-account-utils";
import { formatCryptoAssetLabel } from "@/components/wallet/crypto-asset-catalog";
import { CryptoAssetPicker } from "@/components/wallet/CryptoAssetPicker";
import { CryptoAssetIcon } from "@/components/wallet/CryptoAssetIcon";
import { upiQrImageUrl, cryptoQrImageUrl, digitalRupeeQrImageUrl, resolveDepositQrSrc, publicAssetUrl } from "@/components/wallet/deposit-account-utils";
import { QrImage } from "@/components/wallet/QrImage";
import { DepositQrUploadField } from "@/components/super-admin/DepositQrUploadField";
import { CryptoWalletsOverviewTable } from "@/components/super-admin/CryptoWalletsOverviewTable";
import { STAFF_PAGE_STACK, STAFF_HEADER_ROW, STAFF_CARD, STAFF_FORM_GRID, STAFF_CHART_GRID } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

const DEPOSIT_WITHDRAWAL_TITLE = "Deposit & Withdrawal Payment Accounts";

type MethodKey = "upi" | "digital_rupee" | "bank" | "gateway" | "crypto";
type MethodVisibility = { deposit: Record<MethodKey, boolean>; withdrawal: Record<MethodKey, boolean> };
const METHOD_LABELS: { key: MethodKey; label: string }[] = [
  { key: "upi", label: "UPI" },
  { key: "digital_rupee", label: "Digital Rupee" },
  { key: "bank", label: "Bank Transfer" },
  { key: "gateway", label: "Gateway" },
  { key: "crypto", label: "Crypto" },
];

function MethodVisibilityCard() {
  const { toast } = useToast();
  const [vis, setVis] = useState<MethodVisibility | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setVis(await staffFetch<MethodVisibility>("/admin/payment-method-visibility"));
    } catch {
      /* ignore — defaults remain all enabled on the user side */
    }
  };
  useEffect(() => { load(); }, []);

  const setFlag = async (scope: "deposit" | "withdrawal", key: MethodKey, value: boolean) => {
    if (!vis || saving) return;
    const next: MethodVisibility = {
      deposit: { ...vis.deposit },
      withdrawal: { ...vis.withdrawal },
    };
    next[scope][key] = value;
    setVis(next);
    setSaving(true);
    try {
      const saved = await staffFetch<MethodVisibility>("/admin/payment-method-visibility", {
        method: "PATCH",
        body: JSON.stringify({ [scope]: next[scope] }),
      });
      setVis(saved);
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
      load();
    } finally {
      setSaving(false);
    }
  };

  if (!vis) return null;

  return (
    <Card className={cn(STAFF_CARD, "min-w-0")}>
      <CardContent className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Method visibility for users</h3>
          <p className="text-xs text-muted-foreground">Turn methods on or off for deposits and withdrawals. Disabled methods are hidden from users.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(["deposit", "withdrawal"] as const).map(scope => (
            <div key={scope} className="rounded-xl border border-border dark:border-white/10 p-3 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{scope}</p>
              {METHOD_LABELS
                .filter(m => !(scope === "withdrawal" && m.key === "gateway"))
                .map(m => (
                  <div key={m.key} className="flex items-center justify-between gap-2 py-1">
                    <span className="text-sm">{m.label}</span>
                    <Switch
                      checked={vis[scope][m.key] !== false}
                      onCheckedChange={v => setFlag(scope, m.key, v)}
                      disabled={saving}
                    />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type GwForm = {
  name: string;
  type: string;
  symbol: string;
  network: string;
  coinName: string;
  description: string;
  walletAddress: string;
  upiId: string;
  digitalRupeeId: string;
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
  name: "", type, symbol: type === "crypto" ? "USDT" : "", network: type === "crypto" ? "TRC20" : "", coinName: type === "crypto" ? "Tether USD" : "",
  description: "", walletAddress: "", upiId: "", digitalRupeeId: "", qrCodeUrl: "", minAmount: 10, isEnabled: true, sortOrder: 0,
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
    coinName: ec.coinName || gw.extraConfig?.coinName || "",
    description: gw.description || "",
    walletAddress: gw.walletAddress || "",
    upiId: gw.upiId || "",
    digitalRupeeId: gw.digitalRupeeId || "",
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
  const trim = (v: string) => v.trim();
  const extraConfig: Record<string, string> = {};
  if (form.type === "bank") {
    Object.assign(extraConfig, {
      accountHolderName: trim(form.accountHolderName),
      bankName: trim(form.bankName || form.name),
      accountNumber: trim(form.accountNumber),
      ifscCode: trim(form.ifscCode).toUpperCase(),
      branchName: trim(form.branchName),
      accountType: trim(form.accountType),
      swiftCode: trim(form.swiftCode),
      micrCode: trim(form.micrCode),
    });
  }
  if (form.badge.trim()) extraConfig.badge = trim(form.badge);
  if (form.note.trim()) extraConfig.note = trim(form.note);
  if (form.logoUrl.trim()) extraConfig.logoUrl = trim(form.logoUrl);
  if (form.type === "crypto" && form.coinName.trim()) extraConfig.coinName = trim(form.coinName);
  if (isOnlineGatewayType(form.type)) {
    if (form.merchantId.trim()) extraConfig.merchantId = trim(form.merchantId);
    if (form.publicKey.trim()) extraConfig.publicKey = trim(form.publicKey);
  }

  const payload: Record<string, unknown> = {
    name: trim(form.name),
    type: form.type,
    description: trim(form.description) || null,
    minAmount: form.minAmount,
    isEnabled: form.isEnabled,
    sortOrder: form.sortOrder,
    extraConfig,
  };

  if (form.type === "upi") {
    payload.upiId = trim(form.upiId).toLowerCase();
    payload.qrCodeUrl = trim(form.qrCodeUrl) || null;
  } else if (form.type === "digital_rupee") {
    payload.digitalRupeeId = trim(form.digitalRupeeId);
    payload.qrCodeUrl = trim(form.qrCodeUrl) || null;
  } else if (form.type === "bank") {
    payload.qrCodeUrl = trim(form.qrCodeUrl) || null;
  } else if (form.type === "crypto") {
    payload.symbol = trim(form.symbol).toUpperCase();
    payload.network = trim(form.network);
    payload.walletAddress = trim(form.walletAddress);
    payload.qrCodeUrl = trim(form.qrCodeUrl) || null;
  }

  return payload;
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
    <Card className={cn(STAFF_CARD, "min-w-0 overflow-hidden")}>
      <CardContent className="p-4 space-y-3 mobile-box-safe">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 min-w-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <p className="font-semibold truncate">{a.name}</p>
              {a.badge && <Badge className="text-[10px] bg-amber-500/20 text-amber-600 dark:text-amber-400">{a.badge}</Badge>}
              {!a.isEnabled && <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{formatGatewayMinAmount(a.type, a.minAmount)} · Order {a.sortOrder}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-start flex-wrap">
            <Switch checked={a.isEnabled} onCheckedChange={onToggle} />
            <Button size="icon" variant="outline" className="h-8 w-8" onClick={onEdit}><Edit2 className="h-3.5 w-3.5" /></Button>
            <Button size="icon" variant="outline" className="h-8 w-8 text-red-400" onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>

        <div className="rounded-lg border border-border dark:border-white/10 bg-muted/80 dark:bg-black/20 p-3 space-y-0">
          {a.type === "upi" && (
            <>
              {(a.qrCodeUrl || a.upiId) && (
                <div className="flex justify-center pb-2">
                  <QrImage
                    src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, upiId: a.upiId, payeeName: a.name })}
                    fallbackSrc={a.upiId ? resolveDepositQrSrc({ upiId: a.upiId, payeeName: a.name }) : undefined}
                    alt="UPI QR"
                    className="h-24 w-24 object-contain rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                </div>
              )}
              <CredentialRow label="UPI ID" value={a.upiId} mono />
              {a.description && <CredentialRow label="Note" value={a.description} copyable={false} />}
            </>
          )}
          {a.type === "digital_rupee" && (
            <>
              {(a.qrCodeUrl || a.digitalRupeeId) && (
                <div className="flex justify-center pb-2">
                  <QrImage
                    src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, digitalRupeeId: a.digitalRupeeId, payeeName: a.name })}
                    fallbackSrc={a.digitalRupeeId ? resolveDepositQrSrc({ digitalRupeeId: a.digitalRupeeId, payeeName: a.name }) : undefined}
                    alt="Digital Rupee QR"
                    className="h-24 w-24 object-contain rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                </div>
              )}
              <CredentialRow label="Digital Rupee ID" value={a.digitalRupeeId} mono />
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
              <div className="flex items-center gap-2 pb-2 border-b border-border/80 dark:border-white/5 mb-1">
                <CryptoAssetIcon symbol={a.symbol} network={a.network} coinName={a.extraConfig?.coinName} size="md" />
                <div>
                  <p className="text-sm font-semibold">{formatCryptoAssetLabel(a.symbol, a.network, a.extraConfig?.coinName)}</p>
                  <p className="text-[11px] text-muted-foreground">{a.name}</p>
                </div>
              </div>
              {(a.qrCodeUrl || a.walletAddress) && (
                <div className="flex justify-center pb-2">
                  <QrImage
                    src={resolveDepositQrSrc({ qrCodeUrl: a.qrCodeUrl, walletAddress: a.walletAddress })}
                    fallbackSrc={a.walletAddress ? resolveDepositQrSrc({ walletAddress: a.walletAddress }) : undefined}
                    alt="Wallet QR"
                    className="h-24 w-24 object-contain rounded border border-border dark:border-white/10 bg-white p-1"
                  />
                </div>
              )}
              <CredentialRow label="Coin" value={formatCryptoAssetLabel(a.symbol, a.network, a.extraConfig?.coinName)} copyable={false} />
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
          {a.note && <p className="text-[11px] text-amber-400/80 pt-2 border-t border-border/80 dark:border-white/5">{a.note}</p>}
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
    <div className="space-y-4 min-w-0">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 min-w-0">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold flex flex-wrap items-center gap-2">
            <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="min-w-0">{title}</span>
            <Badge variant="outline" className="text-[10px] shrink-0">Multiple Supported</Badge>
          </h3>
          <p className="text-sm text-muted-foreground mt-1 break-words">{description}</p>
        </div>
        <Button size="sm" className="bg-amber-500 text-black shrink-0 w-full md:w-auto" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {items.length === 0 ? (
        <Card className="bg-muted/40 dark:bg-white/[0.02] border-dashed border-border dark:border-white/10 p-8 text-center text-sm text-muted-foreground">
          No {title.toLowerCase()} configured yet.
        </Card>
      ) : (
        <div className={STAFF_CHART_GRID}>
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
  const [saving, setSaving] = useState(false);

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
    if (saving) return;
    if (form.type === "crypto") {
      if (!form.symbol.trim() || !form.network.trim()) {
        toast({ title: "Coin & chain required", description: "Select or enter a cryptocurrency and network.", variant: "destructive" });
        return;
      }
      if (!form.walletAddress.trim()) {
        toast({ title: "Wallet address required", variant: "destructive" });
        return;
      }
    }
    setSaving(true);
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
    } finally {
      setSaving(false);
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
    <div className={cn(STAFF_PAGE_STACK, "min-w-0")}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2">
            <CreditCard className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span className="min-w-0">{DEPOSIT_WITHDRAWAL_TITLE}</span>
          </h2>
          <p className="text-sm text-muted-foreground break-words">
            Configure UPI, Digital Rupee (e-Rupee/CBDC), bank, crypto, and online gateways for user deposits and withdrawal payouts. Crypto supports Trust Wallet–style coin/chain selection or custom tokens.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 w-full md:w-auto" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <MethodVisibilityCard />

      <Tabs value={tab} onValueChange={setTab} className="min-w-0">
        <PaymentMethodTabsList className="mb-4">
          <PaymentMethodTabsTrigger value="upi" tone="upi" className="gap-1.5">
            <QrCode className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">UPI ({gateways.filter(g => g.type === "upi").length})</span>
          </PaymentMethodTabsTrigger>
          <PaymentMethodTabsTrigger value="digital_rupee" tone="digital_rupee" className="gap-1.5">
            <IndianRupee className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Digital Rupee ({gateways.filter(g => g.type === "digital_rupee").length})</span>
          </PaymentMethodTabsTrigger>
          <PaymentMethodTabsTrigger value="bank" tone="bank" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Bank ({gateways.filter(g => ["bank", "fiat"].includes(g.type)).length})</span>
          </PaymentMethodTabsTrigger>
          <PaymentMethodTabsTrigger value="crypto" tone="crypto" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Crypto ({gateways.filter(g => g.type === "crypto").length})</span>
          </PaymentMethodTabsTrigger>
          <PaymentMethodTabsTrigger value="online" tone="gateway" className="gap-1.5">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Online ({gateways.filter(g => isOnlineGatewayType(g.type)).length})</span>
          </PaymentMethodTabsTrigger>
        </PaymentMethodTabsList>

        <TabsContent value="upi" className="mt-4">
          <AccountSection
            title="UPI / QR Accounts"
            description="Add multiple UPI IDs with optional QR images. Users scan the QR or copy the UPI ID to deposit."
            typeFilter={t => t === "upi"}
            gateways={gateways}
            icon={QrCode}
            onAdd={() => openNew("upi")}
            onEdit={openEditGw}
            onDelete={remove}
            onToggle={toggle}
          />
        </TabsContent>

        <TabsContent value="digital_rupee" className="mt-4">
          <AccountSection
            title="Digital Rupee / e-Rupee Accounts"
            description="Add multiple CBDC wallet IDs with optional QR images. Users scan the QR or copy the Digital Rupee ID to deposit."
            typeFilter={t => t === "digital_rupee"}
            gateways={gateways}
            icon={IndianRupee}
            onAdd={() => openNew("digital_rupee")}
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

        <TabsContent value="crypto" className="mt-4 space-y-4 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 min-w-0">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold flex flex-wrap items-center gap-2">
                <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Cryptocurrency Wallets</span>
                <Badge variant="outline" className="text-[10px] shrink-0">Multiple Supported</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1 break-words">
                All wallets listed here sync to Exchange admin rates and user Buy/Sell with coin icons and network/chain.
              </p>
            </div>
            <Button size="sm" className="bg-amber-500 text-black shrink-0 w-full md:w-auto" onClick={() => openNew("crypto")}>
              <Plus className="h-4 w-4 mr-1" /> Add wallet
            </Button>
          </div>
          <CryptoWalletsOverviewTable
            gateways={gateways}
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
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-xl w-[calc(100vw-2rem)] p-0 gap-0 flex flex-col max-h-[min(90dvh,calc(100dvh-1.5rem))] overflow-hidden">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 shrink-0">
            <DialogTitle>{editing ? "Edit Account" : "Add Deposit Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-2 space-y-3">
            <div className="space-y-1">
              <Label>Display Name *</Label>
              <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. PhonePe Business" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>

            {form.type === "upi" && (
              <>
                <div className="space-y-1"><Label>UPI ID (VPA) *</Label><Input required value={form.upiId} onChange={e => setForm(f => ({ ...f, upiId: e.target.value }))} placeholder="merchant@ybl" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" /></div>
                <DepositQrUploadField
                  inputId="upi-qr-upload"
                  label="UPI QR code image"
                  hint="QR is auto-generated when you save. Upload only if you want a custom static QR image."
                  value={form.qrCodeUrl}
                  onChange={url => setForm(f => ({ ...f, qrCodeUrl: url }))}
                  fallbackPreview={form.upiId.trim() ? upiQrImageUrl(form.upiId.trim(), form.name || "UPI") : undefined}
                />
              </>
            )}

            {form.type === "digital_rupee" && (
              <>
                <div className="space-y-1"><Label>Digital Rupee wallet ID *</Label><Input required value={form.digitalRupeeId} onChange={e => setForm(f => ({ ...f, digitalRupeeId: e.target.value }))} placeholder="CBDC wallet ID" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" /></div>
                <DepositQrUploadField
                  inputId="digital-rupee-qr-upload"
                  label="Digital Rupee QR code image"
                  hint="QR is auto-generated when you save. Upload only if you want a custom static QR image."
                  value={form.qrCodeUrl}
                  onChange={url => setForm(f => ({ ...f, qrCodeUrl: url }))}
                  fallbackPreview={form.digitalRupeeId.trim() ? digitalRupeeQrImageUrl(form.digitalRupeeId.trim(), form.name || "Digital Rupee") : undefined}
                />
              </>
            )}

            {form.type === "bank" && (
              <div className="space-y-2 p-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02]">
                <Input required placeholder="Bank name *" value={form.bankName} onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input required placeholder="Account holder name *" value={form.accountHolderName} onChange={e => setForm(f => ({ ...f, accountHolderName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                <Input required placeholder="Account number *" value={form.accountNumber} onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
                <Input required placeholder="IFSC code *" value={form.ifscCode} onChange={e => setForm(f => ({ ...f, ifscCode: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
                <div className={cn(STAFF_FORM_GRID, "gap-2")}>
                  <Input placeholder="Account type" value={form.accountType} onChange={e => setForm(f => ({ ...f, accountType: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                  <Input placeholder="Branch" value={form.branchName} onChange={e => setForm(f => ({ ...f, branchName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                </div>
                <div className={cn(STAFF_FORM_GRID, "gap-2")}>
                  <Input placeholder="MICR code" value={form.micrCode} onChange={e => setForm(f => ({ ...f, micrCode: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
                  <Input placeholder="SWIFT (international)" value={form.swiftCode} onChange={e => setForm(f => ({ ...f, swiftCode: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono" />
                </div>
                <Input placeholder="Bank QR image URL" value={form.qrCodeUrl} onChange={e => setForm(f => ({ ...f, qrCodeUrl: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
              </div>
            )}

            {form.type === "crypto" && (
              <div className="space-y-3 p-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02]">
                <CryptoAssetPicker
                  value={{ symbol: form.symbol, network: form.network, coinName: form.coinName }}
                  onChange={next => setForm(f => ({ ...f, symbol: next.symbol, network: next.network, coinName: next.coinName }))}
                  onAutoName={label => setForm(f => ({ ...f, name: f.name.trim() ? f.name : label }))}
                />
                <div className="space-y-1">
                  <Label>Wallet address *</Label>
                  <Input required placeholder="Paste deposit / payout wallet address" value={form.walletAddress} onChange={e => setForm(f => ({ ...f, walletAddress: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm" />
                </div>
                <DepositQrUploadField
                  inputId="crypto-qr-upload"
                  label="Wallet QR code image"
                  hint="QR is auto-generated when you save. Upload only if you want a custom static QR image."
                  value={form.qrCodeUrl}
                  onChange={url => setForm(f => ({ ...f, qrCodeUrl: url }))}
                  fallbackPreview={form.walletAddress.trim() ? cryptoQrImageUrl(form.walletAddress.trim()) : undefined}
                />
              </div>
            )}

            {isOnlineGatewayType(form.type) && (
              <div className="space-y-2 p-3 rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02]">
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
                    <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
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
                <Input placeholder="Merchant ID (reference / display)" value={form.merchantId} onChange={e => setForm(f => ({ ...f, merchantId: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm" />
                <Input placeholder="Public Key / Client ID (reference only — secrets go in .env)" value={form.publicKey} onChange={e => setForm(f => ({ ...f, publicKey: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 font-mono text-sm" />
              </div>
            )}

            <div className={STAFF_FORM_GRID}>
              <div className="space-y-1"><Label>{minAmountLabelForGatewayType(form.type)}</Label><Input type="number" value={form.minAmount} onChange={e => setForm(f => ({ ...f, minAmount: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
              <div className="space-y-1"><Label>Sort Order</Label><Input type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" /></div>
            </div>
            <Input placeholder="Badge (e.g. Recommended, Instant)" value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            <Textarea placeholder="Note to customer (shown on deposit page)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" rows={2} />
            <div className="flex items-center gap-2">
              <Switch checked={form.isEnabled} onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))} />
              <Label>Enabled — visible to users</Label>
            </div>
            </div>
            <DialogFooter className="shrink-0 gap-2 sm:gap-2">
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 text-black w-full sm:flex-1" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
