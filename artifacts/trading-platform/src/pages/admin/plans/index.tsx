import { useListAdminPlans, useCreateAdminPlan, useUpdateAdminPlan, useDeleteAdminPlan } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export default function AdminPlansPage() {
  const { data: plans, isLoading, refetch } = useListAdminPlans();
  const createMutation = useCreateAdminPlan();
  const updateMutation = useUpdateAdminPlan();
  const deleteMutation = useDeleteAdminPlan();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    minAmount: 0,
    maxAmount: 0,
    roiPercent: 0,
    durationDays: 30,
    currency: "USD",
    category: "starter" as any,
    isActive: true,
  });

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      minAmount: 100,
      maxAmount: 1000,
      roiPercent: 5,
      durationDays: 30,
      currency: "USD",
      category: "starter",
      isActive: true,
    });
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
      isActive: plan.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPlan) {
      updateMutation.mutate(
        { id: editingPlan.id, data: formData },
        {
          onSuccess: () => {
            toast({ title: "Plan updated successfully" });
            setIsDialogOpen(false);
            refetch();
          },
        }
      );
    } else {
      createMutation.mutate({ data: formData }, {
        onSuccess: () => {
          toast({ title: "Plan created successfully" });
          setIsDialogOpen(false);
          refetch();
        },
      });
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Investment Plans</h1>
            <p className="text-muted-foreground">Manage the investment products available on the platform.</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-black">
            <Plus className="w-4 h-4 mr-2" />
            Create Plan
          </Button>
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle>All Plans</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : plans?.length ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-white/5">
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>ROI (%)</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Limits</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan: any) => (
                    <TableRow key={plan.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="font-medium text-white">{plan.name}</TableCell>
                      <TableCell className="capitalize text-amber-400">{plan.category}</TableCell>
                      <TableCell className="font-bold">{plan.roiPercent}%</TableCell>
                      <TableCell>{plan.durationDays} Days</TableCell>
                      <TableCell>
                        ${plan.minAmount} - ${plan.maxAmount}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            plan.isActive
                              ? "bg-green-500/20 text-green-500 border-green-500/20"
                              : "bg-red-500/20 text-red-500 border-red-500/20"
                          }
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(plan)} className="text-amber-400 hover:text-amber-500 hover:bg-amber-500/10">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(plan)} className="text-red-400 hover:text-red-500 hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No investment plans found.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Investment Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Plan Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 focus:border-amber-500"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="minAmount">Min Amount ($)</Label>
                <Input
                  id="minAmount"
                  type="number"
                  value={formData.minAmount}
                  onChange={(e) => setFormData({ ...formData, minAmount: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-amber-500"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxAmount">Max Amount ($)</Label>
                <Input
                  id="maxAmount"
                  type="number"
                  value={formData.maxAmount}
                  onChange={(e) => setFormData({ ...formData, maxAmount: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-amber-500"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="roi">ROI Percentage (%)</Label>
                <Input
                  id="roi"
                  type="number"
                  step="0.01"
                  value={formData.roiPercent}
                  onChange={(e) => setFormData({ ...formData, roiPercent: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-amber-500"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="duration">Duration (Days)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                  className="bg-white/5 border-white/10 focus:border-amber-500"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val as any })}
              >
                <SelectTrigger className="bg-white/5 border-white/10 focus:border-amber-500">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="bg-[#050A14] border-white/10">
                  <SelectItem value="forex">Forex</SelectItem>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="stocks">Stocks</SelectItem>
                  <SelectItem value="commodities">Commodities</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 py-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(val) => setFormData({ ...formData, isActive: val })}
              />
              <Label htmlFor="active">Active (Visible to users)</Label>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-white hover:bg-white/5">
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingPlan ? "Update Plan" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Investment Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the <span className="font-semibold text-amber-400">{deleteTarget?.name}</span> plan. Users with active investments will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate({ id: deleteTarget.id }, {
                  onSuccess: () => {
                    toast({ title: "Plan deleted" });
                    setDeleteTarget(null);
                    refetch();
                  },
                });
              }}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
