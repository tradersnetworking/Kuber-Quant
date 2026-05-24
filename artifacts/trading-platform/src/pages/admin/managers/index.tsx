import { useState } from "react";
import { useListAdminManagers, useCreateAdminManager, useDeleteAdminManager, User } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UserPlus, Trash2, UserCheck, Mail, Phone, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function AdminManagersPage() {
  const { data: managers, isLoading, refetch } = useListAdminManagers();
  const createMutation = useCreateAdminManager();
  const deleteMutation = useDeleteAdminManager();
  const { toast } = useToast();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [demoteTarget, setDemoteTarget] = useState<User | null>(null);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

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
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Manager Accounts</h1>
            <p className="text-muted-foreground">Create and manage platform managers who oversee clients.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2">
            <UserPlus className="h-4 w-4" />
            Add Manager
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Managers</p>
                <p className="text-2xl font-bold text-white">{managers?.length ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">All Managers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : managers?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No managers yet</p>
                <p className="text-sm mt-1">Create your first manager account to get started.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead>Manager</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managers?.map((manager: User, i: number) => (
                    <motion.tr
                      key={manager.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
                            {manager.fullName?.charAt(0) || "M"}
                          </div>
                          <div>
                            <p className="font-medium text-white">{manager.fullName}</p>
                            <p className="text-xs text-muted-foreground">ID #{manager.id}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />{manager.email}
                          </div>
                          {manager.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />{manager.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3 w-3" />
                          {manager.createdAt ? format(new Date(manager.createdAt), "MMM d, yyyy") : "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDemoteTarget(manager)}
                          className="text-red-400 hover:text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Manager Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-white/10 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Create Manager Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-2">
              <Label>Full Name *</Label>
              <Input
                value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })}
                placeholder="John Smith"
                className="bg-white/5 border-white/10 focus:border-amber-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="manager@kubercapital.com"
                className="bg-white/5 border-white/10 focus:border-amber-500"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Password *</Label>
              <Input
                type="password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Minimum 8 characters"
                className="bg-white/5 border-white/10 focus:border-amber-500"
                required
                minLength={8}
              />
            </div>
            <div className="grid gap-2">
              <Label>Phone Number</Label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                className="bg-white/5 border-white/10 focus:border-amber-500"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-white/10">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                {createMutation.isPending ? "Creating..." : "Create Manager"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Demote Confirmation Dialog */}
      <AlertDialog open={!!demoteTarget} onOpenChange={() => setDemoteTarget(null)}>
        <AlertDialogContent className="bg-card border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Demote Manager?</AlertDialogTitle>
            <AlertDialogDescription>
              This will demote <span className="font-semibold text-amber-400">{demoteTarget?.fullName}</span> from manager to a regular user. They will lose all manager privileges immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemote} className="bg-red-500 hover:bg-red-600">Demote to User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
