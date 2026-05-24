import { useListAdminPlans, useCreateAdminPlan, useUpdateAdminPlan, useDeleteAdminPlan } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2, RefreshCw, Shield, AlertTriangle } from "lucide-react";
import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

const emptyForm = {
  name: "",
  description: "",
  minAmount: 100,
  maxAmount: 1000,
  roiPercent: 5,
  durationDays: 30,
  currency: "USD",
  category: "starter" as any,
  planType: "monthly" as any,
  profitFrequency: "monthly" as any,
  capitalReturn: "yes" as any,
  autoRenewal: false,
  earlyWithdrawalPenalty: 0,
  features: [] as string[],
  maxInvestors: undefined as number | undefined,
  isActive: true,
};

export default function AdminPlansPage() {
  const { data: plans, isLoading, refetch } = useListAdminPlans();
  const createMutation = useCreateAdminPlan();
  const updateMutation = useUpdateAdminPlan();
  const deleteMutation = useDeleteAdminPlan();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [featuresText, setFeaturesText] = useState("");

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({ ...emptyForm });
    setFeaturesText("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      minAmount: plan.minAmount,
      maxAmount: plan.maxAmount,
      roiPercent: plan.roiPercent,
      durationDays: plan.durationDays,
      currency: plan.currency || "USD",
      category: plan.category,
      planType: plan.planType || "monthly",
      profitFrequency: plan.profitFrequency || "monthly",
      capitalReturn: plan.capitalReturn || "yes",
      autoRenewal: plan.autoRenewal || false,
      earlyWithdrawalPenalty: plan.earlyWithdrawalPenalty || 0,
      features: plan.features || [],
      maxInvestors: plan.maxInvestors || undefined,
      isActive: plan.isActive,
    });
    setFeaturesText((plan.features || []).join("\n"));
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const features = featuresText.split("\n").map(s => s.trim()).filter(Boolean);
    const payload = { ...formData, features };
    if (editingPlan) {
      updateMutation.mutate({ id: editingPlan.id, data: payload }, {
        onSuccess: () => { toast({ title: "Plan updated" }); setIsDialogOpen(false); refetch(); },
        onError: () => toast({ title: "Failed to update plan", variant: "destructive" }),
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: "Plan created" }); setIsDialogOpen(false); refetch(); },
        onError: () => toast({ title: "Failed to create plan", variant: "destructive" }),
      });
    }
  };

  const f = (key: keyof typeof formData) => (val: any) => setFormData(prev => ({ ...prev, [key]: val }));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Investment Plans
            </h1>
            <p className="text-muted-foreground">Manage investment products with rich plan configuration.</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
            <Plus className="w-4 h-4 mr-2" /> Create Plan
          </Button>
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader><CardTitle>All Plans ({plans?.length || 0})</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1,2,3].map(i=><Skeleton key={i} className="h-12 w-full"/>)}</div>
            ) : plans?.length ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Plan Type</TableHead>
                      <TableHead>ROI</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Range</TableHead>
                      <TableHead>Profit Freq.</TableHead>
                      <TableHead>Capital</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan: any) => (
                      <TableRow key={plan.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="font-medium text-white min-w-[120px]">
                          <div>{plan.name}</div>
                          {plan.autoRenewal && <div className="flex items-center gap-1 text-xs text-amber-400 mt-0.5"><RefreshCw className="h-2.5 w-2.5"/>Auto-renew</div>}
                        </TableCell>
                        <TableCell><Badge className="capitalize bg-white/10 text-zinc-300 border-white/10">{plan.category}</Badge></TableCell>
                        <TableCell className="capitalize text-amber-400 text-sm">{plan.planType?.replace("_", "-")}</TableCell>
                        <TableCell className="font-bold text-amber-500">{plan.roiPercent}%</TableCell>
                        <TableCell className="text-sm">{plan.durationDays}d</TableCell>
                        <TableCell className="text-xs text-zinc-300">${Number(plan.minAmount).toLocaleString()} - ${Number(plan.maxAmount).toLocaleString()}</TableCell>
                        <TableCell className="text-sm capitalize">{plan.profitFrequency?.replace("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${plan.capitalReturn === "yes" ? "border-green-500/30 text-green-400" : plan.capitalReturn === "partial" ? "border-amber-500/30 text-amber-400" : "border-red-500/30 text-red-400"}`}>
                            {plan.capitalReturn === "yes" ? "Full" : plan.capitalReturn === "partial" ? "Partial" : "None"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-400">
                          {plan.features?.length > 0 ? `${plan.features.length} features` : "—"}
                          {plan.earlyWithdrawalPenalty > 0 && <div className="flex items-center gap-1 text-orange-400"><AlertTriangle className="h-2.5 w-2.5"/>{plan.earlyWithdrawalPenalty}% fee</div>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={plan.isActive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(plan)} className="text-amber-400 hover:bg-amber-500/10 h-7 w-7">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(plan)} className="text-red-400 hover:bg-red-500/10 h-7 w-7">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                No investment plans yet. Create one to get started.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingPlan ? "Edit Plan" : "Create Investment Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {/* Basic Info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Basic Info</h3>
              <div className="grid gap-2">
                <Label>Plan Name *</Label>
                <Input value={formData.name} onChange={e => f("name")(e.target.value)} className="bg-white/5 border-white/10" required />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea value={formData.description} onChange={e => f("description")(e.target.value)} className="bg-white/5 border-white/10 resize-none" rows={2} />
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Plan Type & Category */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Plan Classification</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Plan Type *</Label>
                  <Select value={formData.planType} onValueChange={f("planType")}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="half_yearly">Half-Yearly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={f("category")}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="growth">Growth</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="elite">Elite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Amounts & Returns */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Investment & Returns</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Min Amount ($) *</Label>
                  <Input type="number" value={formData.minAmount} onChange={e => f("minAmount")(Number(e.target.value))} className="bg-white/5 border-white/10" required min={0} />
                </div>
                <div className="grid gap-2">
                  <Label>Max Amount ($) *</Label>
                  <Input type="number" value={formData.maxAmount} onChange={e => f("maxAmount")(Number(e.target.value))} className="bg-white/5 border-white/10" required min={0} />
                </div>
                <div className="grid gap-2">
                  <Label>ROI (%) *</Label>
                  <Input type="number" step="0.01" value={formData.roiPercent} onChange={e => f("roiPercent")(Number(e.target.value))} className="bg-white/5 border-white/10" required />
                </div>
                <div className="grid gap-2">
                  <Label>Duration (Days) *</Label>
                  <Input type="number" value={formData.durationDays} onChange={e => f("durationDays")(Number(e.target.value))} className="bg-white/5 border-white/10" required min={1} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Profit Frequency</Label>
                  <Select value={formData.profitFrequency} onValueChange={f("profitFrequency")}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="at_maturity">At Maturity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Capital Return</Label>
                  <Select value={formData.capitalReturn} onValueChange={f("capitalReturn")}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#050A14] border-white/10">
                      <SelectItem value="yes">Full Capital Return</SelectItem>
                      <SelectItem value="partial">Partial Return</SelectItem>
                      <SelectItem value="no">No Capital Return</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Advanced Settings */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Advanced Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Early Withdrawal Penalty (%)</Label>
                  <Input type="number" step="0.01" value={formData.earlyWithdrawalPenalty} onChange={e => f("earlyWithdrawalPenalty")(Number(e.target.value))} className="bg-white/5 border-white/10" min={0} max={100} />
                </div>
                <div className="grid gap-2">
                  <Label>Max Investors (optional)</Label>
                  <Input type="number" value={formData.maxInvestors ?? ""} onChange={e => f("maxInvestors")(e.target.value ? Number(e.target.value) : undefined)} className="bg-white/5 border-white/10" min={0} placeholder="Unlimited" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch id="autoRenewal" checked={formData.autoRenewal} onCheckedChange={f("autoRenewal")} />
                  <Label htmlFor="autoRenewal" className="cursor-pointer">Auto Renewal</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="isActive" checked={formData.isActive} onCheckedChange={f("isActive")} />
                  <Label htmlFor="isActive" className="cursor-pointer">Active (visible to users)</Label>
                </div>
              </div>
            </div>

            <Separator className="bg-white/10" />

            {/* Features */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Plan Features</h3>
              <p className="text-xs text-muted-foreground">One feature per line. These appear as bullet points on the plan card.</p>
              <Textarea
                value={featuresText}
                onChange={e => setFeaturesText(e.target.value)}
                className="bg-white/5 border-white/10 resize-none font-mono text-sm"
                rows={4}
                placeholder={"Capital Guaranteed\nExpert Fund Managers\n24/7 Support\nMonthly Profit Payouts"}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black font-bold" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-[#050A14] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <span className="font-semibold text-amber-400">{deleteTarget?.name}</span>? Users with active investments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-white bg-white/5 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate({ id: deleteTarget.id }, {
                  onSuccess: () => { toast({ title: "Plan deleted" }); setDeleteTarget(null); refetch(); },
                });
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
