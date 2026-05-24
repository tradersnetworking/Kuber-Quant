import { useState } from "react";
import {
  useListPaymentGateways, useCreatePaymentGateway, useUpdatePaymentGateway, useDeletePaymentGateway,
  PaymentGateway, PaymentGatewayInput,
} from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wallet, Bitcoin, CreditCard, Building2 } from "lucide-react";
import { motion } from "framer-motion";

const TYPE_OPTIONS = [
  { value: "crypto", label: "Cryptocurrency", icon: Bitcoin },
  { value: "upi", label: "UPI", icon: Wallet },
  { value: "bank", label: "Bank Transfer", icon: Building2 },
  { value: "fiat", label: "Fiat / Card", icon: CreditCard },
];

const EMPTY_FORM: PaymentGatewayInput = {
  name: "", type: "crypto", symbol: "", network: "", description: "",
  walletAddress: "", upiId: "", qrCodeUrl: "", minAmount: 10, isEnabled: true, sortOrder: 0,
};

export default function AdminPaymentGatewaysPage() {
  const { data: gateways, isLoading, refetch } = useListPaymentGateways();
  const createMutation = useCreatePaymentGateway();
  const updateMutation = useUpdatePaymentGateway();
  const deleteMutation = useDeletePaymentGateway();
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGateway, setEditingGateway] = useState<PaymentGateway | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PaymentGateway | null>(null);
  const [form, setForm] = useState<PaymentGatewayInput>(EMPTY_FORM);

  const openCreate = () => {
    setEditingGateway(null);
    setForm(EMPTY_FORM);
    setIsDialogOpen(true);
  };

  const openEdit = (gw: PaymentGateway) => {
    setEditingGateway(gw);
    setForm({
      name: gw.name, type: gw.type, symbol: gw.symbol || "", network: gw.network || "",
      description: gw.description || "", walletAddress: gw.walletAddress || "",
      upiId: gw.upiId || "", qrCodeUrl: gw.qrCodeUrl || "",
      minAmount: gw.minAmount, maxAmount: gw.maxAmount || undefined,
      isEnabled: gw.isEnabled, sortOrder: gw.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingGateway) {
      updateMutation.mutate({ id: editingGateway.id, data: form }, {
        onSuccess: () => { toast({ title: "Gateway updated" }); setIsDialogOpen(false); refetch(); },
      });
    } else {
      createMutation.mutate({ data: form }, {
        onSuccess: () => { toast({ title: "Gateway created" }); setIsDialogOpen(false); refetch(); },
      });
    }
  };

  const handleToggle = (gw: PaymentGateway, enabled: boolean) => {
    updateMutation.mutate({ id: gw.id, data: { name: gw.name, type: gw.type, isEnabled: enabled } }, {
      onSuccess: () => { toast({ title: enabled ? "Gateway enabled" : "Gateway disabled" }); refetch(); },
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id }, {
      onSuccess: () => { toast({ title: "Gateway deleted" }); setDeleteTarget(null); refetch(); },
    });
  };

  const byType = (type: string) => gateways?.filter((g: PaymentGateway) => g.type === type) || [];

  const GatewayCard = ({ gw }: { gw: PaymentGateway }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white/5 border border-white/10 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{gw.name}</p>
          {gw.symbol && <p className="text-xs text-amber-400 font-mono">{gw.symbol}{gw.network ? ` (${gw.network})` : ""}</p>}
          {gw.description && <p className="text-xs text-muted-foreground mt-0.5">{gw.description}</p>}
        </div>
        <Switch checked={gw.isEnabled} onCheckedChange={v => handleToggle(gw, v)} />
      </div>

      {gw.walletAddress && (
        <div className="bg-black/30 rounded p-2">
          <p className="text-xs text-muted-foreground mb-0.5">Wallet Address</p>
          <p className="text-xs font-mono text-amber-300 break-all">{gw.walletAddress}</p>
        </div>
      )}
      {gw.upiId && (
        <div className="bg-black/30 rounded p-2">
          <p className="text-xs text-muted-foreground mb-0.5">UPI ID</p>
          <p className="text-xs font-mono text-amber-300">{gw.upiId}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={gw.isEnabled ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"}>
            {gw.isEnabled ? "Active" : "Disabled"}
          </Badge>
          <span className="text-xs text-muted-foreground">Min: ${gw.minAmount}</span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-400 hover:bg-amber-500/10" onClick={() => openEdit(gw)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-500/10" onClick={() => setDeleteTarget(gw)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </motion.div>
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Payment Gateways</h1>
            <p className="text-muted-foreground">Manage deposit and withdrawal payment methods.</p>
          </div>
          <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
            <Plus className="h-4 w-4" />
            Add Gateway
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : (
          <Tabs defaultValue="crypto">
            <TabsList className="bg-white/5 border border-white/10">
              {TYPE_OPTIONS.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="data-[state=active]:bg-amber-500 data-[state=active]:text-black">
                  <t.icon className="h-4 w-4 mr-1.5" />{t.label}
                  <Badge className="ml-2 bg-white/10 text-white text-xs px-1.5 py-0">{byType(t.value).length}</Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {TYPE_OPTIONS.map(t => (
              <TabsContent key={t.value} value={t.value} className="mt-4">
                {byType(t.value).length === 0 ? (
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="py-12 text-center text-muted-foreground">
                      <t.icon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>No {t.label} gateways configured.</p>
                      <Button onClick={openCreate} variant="outline" size="sm" className="mt-3 border-amber-500/30 text-amber-400">
                        Add {t.label} Gateway
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {byType(t.value).map((gw: PaymentGateway) => <GatewayCard key={gw.id} gw={gw} />)}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-card border-white/10 text-foreground max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-amber-400">{editingGateway ? "Edit Gateway" : "Add Payment Gateway"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  placeholder="Bitcoin (BTC)" className="bg-white/5 border-white/10 focus:border-amber-500" required />
              </div>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.type === "crypto") && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Symbol</Label>
                  <Input value={form.symbol} onChange={e => setForm({...form, symbol: e.target.value})}
                    placeholder="BTC, ETH, USDT" className="bg-white/5 border-white/10 focus:border-amber-500" />
                </div>
                <div className="grid gap-2">
                  <Label>Network</Label>
                  <Input value={form.network} onChange={e => setForm({...form, network: e.target.value})}
                    placeholder="TRC20, ERC20, BEP20" className="bg-white/5 border-white/10 focus:border-amber-500" />
                </div>
              </div>
            )}

            {form.type === "crypto" && (
              <div className="grid gap-2">
                <Label>Wallet Address</Label>
                <Input value={form.walletAddress} onChange={e => setForm({...form, walletAddress: e.target.value})}
                  placeholder="0x..." className="bg-white/5 border-white/10 focus:border-amber-500 font-mono text-sm" />
              </div>
            )}

            {form.type === "upi" && (
              <div className="grid gap-2">
                <Label>UPI ID</Label>
                <Input value={form.upiId} onChange={e => setForm({...form, upiId: e.target.value})}
                  placeholder="yourname@upi" className="bg-white/5 border-white/10 focus:border-amber-500" />
              </div>
            )}

            <div className="grid gap-2">
              <Label>QR Code URL</Label>
              <Input value={form.qrCodeUrl} onChange={e => setForm({...form, qrCodeUrl: e.target.value})}
                placeholder="https://..." className="bg-white/5 border-white/10 focus:border-amber-500" />
            </div>

            <div className="grid gap-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Optional description" className="bg-white/5 border-white/10 focus:border-amber-500" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Amount ($)</Label>
                <Input type="number" value={form.minAmount} onChange={e => setForm({...form, minAmount: Number(e.target.value)})}
                  className="bg-white/5 border-white/10 focus:border-amber-500" />
              </div>
              <div className="grid gap-2">
                <Label>Sort Order</Label>
                <Input type="number" value={form.sortOrder} onChange={e => setForm({...form, sortOrder: Number(e.target.value)})}
                  className="bg-white/5 border-white/10 focus:border-amber-500" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch checked={form.isEnabled} onCheckedChange={v => setForm({...form, isEnabled: v})} />
              <Label>Gateway Enabled</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/10">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {editingGateway ? "Update" : "Create"} Gateway
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gateway?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <span className="font-semibold text-amber-400">{deleteTarget?.name}</span>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
