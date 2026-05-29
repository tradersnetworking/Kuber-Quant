import { useState } from "react";
import { useListAdminManagers, useCreateAdminManager, useDeleteAdminManager, User } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UserPlus, Trash2, UserCheck, Mail, Phone, Calendar } from "lucide-react";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";

export function ManagersManagementPanel() {
  const { data: managers, isLoading, refetch } = useListAdminManagers();
  const createMutation = useCreateAdminManager();
  const deleteMutation = useDeleteAdminManager();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<User | null>(null);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

  const openDetail = (manager: User) => {
    setDetailUserId(manager.id);
    setDetailOpen(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ data: form }, {
      onSuccess: () => {
        toast({ title: "Manager created successfully" });
        setIsCreateOpen(false);
        setForm({ email: "", password: "", fullName: "", phone: "" });
        refetch();
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err?.message || "Failed to create manager", variant: "destructive" });
      },
    });
  };

  const handleDemote = () => {
    if (!demoteTarget) return;
    deleteMutation.mutate({ id: demoteTarget.id }, {
      onSuccess: () => {
        toast({ title: "Manager demoted to user" });
        setDemoteTarget(null);
        refetch();
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Manager Accounts</h2>
          <p className="text-sm text-muted-foreground">Create and manage platform managers — same as admin panel.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
          <UserPlus className="h-4 w-4" /> Add Manager
        </Button>
      </div>

      <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 w-fit">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Managers</p>
            <p className="text-2xl font-bold">{managers?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border dark:border-white/10 bg-muted/60 dark:bg-white/5">
        <CardHeader><CardTitle className="text-base">All Managers</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : managers?.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">No managers yet — create one above.</p>
          ) : (
            <ResponsiveDataView
              data={managers ?? []}
              rowKey={manager => manager.id}
              onRowClick={openDetail}
              rowClassName="border-border dark:border-white/10 hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
              mobileFooter={manager => (
                <div className="mt-3 pt-3 border-t border-border/80 flex justify-end" onClick={e => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={e => {
                      e.stopPropagation();
                      setDemoteTarget(manager);
                    }}
                    className="text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              columns={[
                {
                  key: "manager",
                  header: "Manager",
                  mobileTitle: true,
                  cell: manager => (
                    <>
                      <p className="font-medium hover:text-amber-600 dark:text-amber-400">{manager.fullName}</p>
                      <p className="text-xs text-muted-foreground font-normal">ID #{manager.id}</p>
                    </>
                  ),
                },
                {
                  key: "contact",
                  header: "Contact",
                  cell: manager => (
                    <>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />{manager.email}
                      </div>
                      {manager.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3 shrink-0" />{manager.phone}
                        </div>
                      )}
                    </>
                  ),
                },
                {
                  key: "joined",
                  header: "Joined",
                  cellClassName: "text-sm text-muted-foreground",
                  cell: manager => (
                    <>
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {manager.createdAt ? format(new Date(manager.createdAt), "MMM d, yyyy") : "—"}
                    </>
                  ),
                },
                {
                  key: "actions",
                  header: "Actions",
                  headerClassName: "text-right",
                  cellClassName: "text-right",
                  hideOnMobile: true,
                  cell: manager => (
                    <div onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setDemoteTarget(manager)} className="text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-md">
          <DialogHeader><DialogTitle>Create Manager Account</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending} className="w-full bg-amber-500 text-black">
                {createMutation.isPending ? "Creating..." : "Create Manager"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!demoteTarget} onOpenChange={() => setDemoteTarget(null)}>
        <AlertDialogContent className="bg-background border-border dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Demote Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              Demote {demoteTarget?.fullName} to a regular user. They lose manager privileges immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemote} className="bg-red-500">Demote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserFullDetailSheet
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        apiBase="/admin"
      />
    </div>
  );
}
