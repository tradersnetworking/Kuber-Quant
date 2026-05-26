import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Search, RefreshCw, UserPlus, Eye, Edit2, Trash2, Users, Briefcase, Shield, Crown, Headset,
} from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { format } from "date-fns";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";

type RoleKey = "user" | "manager" | "support" | "admin" | "superadmin";

interface PlatformUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: RoleKey;
  kycStatus: string;
  balanceFiat: number;
  balanceCrypto: number;
  totalProfit: number;
  referralCode: string | null;
  referralCount: number;
  referralEarnings: number;
  managerId: number | null;
  isActive: boolean;
  isPromoter?: boolean;
  promoterCommissionType?: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
}

const ROLE_TABS: { key: RoleKey; label: string; icon: typeof Users; description: string }[] = [
  { key: "user", label: "Investors", icon: Users, description: "Users who deposit, invest, and trade on the platform" },
  { key: "manager", label: "Managers", icon: Briefcase, description: "Relationship managers overseeing client accounts" },
  { key: "support", label: "Support", icon: Headset, description: "Customer support agents" },
  { key: "admin", label: "Admins", icon: Shield, description: "Platform administrators with operational access" },
  { key: "superadmin", label: "Super Admins", icon: Crown, description: "Full platform control and configuration" },
];

const ROLE_BADGE: Record<RoleKey, string> = {
  user: "bg-zinc-500/20 text-zinc-300",
  manager: "bg-cyan-500/20 text-cyan-400",
  support: "bg-rose-500/20 text-rose-400",
  admin: "bg-amber-500/20 text-amber-400",
  superadmin: "bg-red-500/20 text-red-400",
};

const KYC_BADGE: Record<string, string> = {
  pending: "bg-zinc-500/20 text-zinc-400",
  submitted: "bg-blue-500/20 text-blue-400",
  verified: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

const emptyForm = () => ({
  email: "", password: "", fullName: "", phone: "",
  role: "user" as RoleKey, kycStatus: "pending", isActive: true, isPromoter: false,
  managerId: "", balanceFiat: "", balanceCrypto: "",
});

export function UsersManagementPanel({ defaultRoleTab = "user" }: { defaultRoleTab?: RoleKey }) {
  const { toast } = useToast();
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RoleKey>(defaultRoleTab);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<PlatformUser | null>(null);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editForm, setEditForm] = useState(emptyForm());
  const [newPassword, setNewPassword] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm());
  const [deactivateTarget, setDeactivateTarget] = useState<PlatformUser | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await staffFetch<PlatformUser[]>("/super-admin/users");
      setUsers(data);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setActiveTab(defaultRoleTab);
  }, [defaultRoleTab]);

  const managers = useMemo(
    () => users.filter(u => u.role === "manager" && u.isActive),
    [users],
  );

  const byRole = useMemo(() => {
    const map: Record<RoleKey, PlatformUser[]> = { user: [], manager: [], support: [], admin: [], superadmin: [] };
    for (const u of users) {
      if (map[u.role]) map[u.role].push(u);
    }
    return map;
  }, [users]);

  const filterList = (list: PlatformUser[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(u =>
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  };

  const managerName = (id: number | null) => {
    if (!id) return "—";
    return users.find(u => u.id === id)?.fullName || `#${id}`;
  };

  const openDetail = (u: PlatformUser) => {
    setDetailUserId(u.id);
    setDetailOpen(true);
  };

  const openEdit = (u: PlatformUser) => {
    setSelected(u);
    setNewPassword("");
    setEditForm({
      email: u.email,
      password: "",
      fullName: u.fullName,
      phone: u.phone || "",
      role: u.role,
      kycStatus: u.kycStatus,
      isActive: u.isActive,
      isPromoter: u.isPromoter ?? false,
      managerId: u.managerId ? String(u.managerId) : "",
      balanceFiat: String(u.balanceFiat),
      balanceCrypto: String(u.balanceCrypto),
    });
  };

  const openCreate = () => {
    setCreateForm({ ...emptyForm(), role: activeTab });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await staffFetch("/super-admin/users", {
        method: "POST",
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          phone: createForm.phone || undefined,
          role: createForm.role,
          kycStatus: createForm.kycStatus,
          managerId: createForm.managerId ? Number(createForm.managerId) : undefined,
        }),
      });
      toast({ title: `${ROLE_TABS.find(t => t.key === createForm.role)?.label} account created` });
      setCreateOpen(false);
      load();
    } catch (err: any) {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await staffFetch<PlatformUser>(`/super-admin/users/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          email: editForm.email,
          fullName: editForm.fullName,
          phone: editForm.phone || null,
          role: editForm.role,
          kycStatus: editForm.kycStatus,
          isActive: editForm.isActive,
          isPromoter: editForm.isPromoter,
          managerId: editForm.managerId ? Number(editForm.managerId) : null,
          balanceFiat: editForm.balanceFiat !== "" ? Number(editForm.balanceFiat) : undefined,
          balanceCrypto: editForm.balanceCrypto !== "" ? Number(editForm.balanceCrypto) : undefined,
          password: newPassword || undefined,
        }),
      });
      toast({ title: "Account updated" });
      setSelected(null);
      setNewPassword("");
      load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await staffFetch(`/super-admin/users/${deactivateTarget.id}`, { method: "DELETE" });
      toast({ title: "Account deactivated" });
      setDeactivateTarget(null);
      if (selected?.id === deactivateTarget.id) setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const renderTable = (role: RoleKey) => {
    const list = filterList(byRole[role]);
    const showManager = role === "user";
    const showBalance = role === "user" || role === "manager";

    if (loading) {
      return (
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No {ROLE_TABS.find(t => t.key === role)?.label.toLowerCase()} found.
          <Button variant="link" className="text-amber-400" onClick={openCreate}>Create one</Button>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              {showManager && <TableHead>Manager</TableHead>}
              {showBalance && <TableHead className="text-right">Fiat Balance</TableHead>}
              <TableHead>KYC</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.map(u => (
              <TableRow
                key={u.id}
                className="border-white/5 cursor-pointer hover:bg-white/5"
                onClick={() => openDetail(u)}
              >
                <TableCell className="text-muted-foreground font-mono text-xs">#{u.id}</TableCell>
                <TableCell className="font-medium">
                  <button type="button" className="text-left hover:text-amber-400 hover:underline" onClick={() => openDetail(u)}>
                    {u.fullName}
                  </button>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                {showManager && (
                  <TableCell className="text-sm">{managerName(u.managerId)}</TableCell>
                )}
                {showBalance && (
                  <TableCell className="text-right text-emerald-400 font-medium">
                    ${u.balanceFiat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                )}
                <TableCell>
                  <Badge className={`text-xs capitalize ${KYC_BADGE[u.kycStatus] || ""}`}>{u.kycStatus}</Badge>
                </TableCell>
                <TableCell>
                  {u.isActive
                    ? <Badge className="bg-green-500/20 text-green-400 text-xs">Active</Badge>
                    : <Badge className="bg-red-500/20 text-red-400 text-xs">Inactive</Badge>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {format(new Date(u.createdAt), "dd MMM yyyy")}
                </TableCell>
                <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(u)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    {u.isActive && (
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" onClick={() => setDeactivateTarget(u)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">People Management</h2>
          <p className="text-sm text-muted-foreground">
            Separate views for investors, managers, and admins — click any row for full details.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-52 bg-white/5 border-white/10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="bg-amber-500 text-black font-semibold" onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-1" /> Create
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as RoleKey)}>
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1 p-1">
          {ROLE_TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.key} value={tab.key} className="gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-white/20">
                  {byRole[tab.key].length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {ROLE_TABS.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4 outline-none">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-amber-400" />
                  {tab.label}
                </CardTitle>
                <CardDescription>{tab.description}</CardDescription>
              </CardHeader>
              <CardContent className="p-0 pb-2">
                {renderTable(tab.key)}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <UserFullDetailSheet
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={id => {
          const u = users.find(x => x.id === id);
          if (u) {
            setDetailOpen(false);
            openEdit(u);
          }
        }}
      />

      {/* Edit Sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg bg-[#050A14] border-white/10 overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  Edit {selected.fullName}
                  <Badge className={ROLE_BADGE[selected.role]}>{selected.role}</Badge>
                </SheetTitle>
                <SheetDescription>{selected.email}</SheetDescription>
              </SheetHeader>

              <form onSubmit={handleSave} className="mt-6 space-y-4">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="bg-white/5 border-white/10" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="bg-white/5 border-white/10" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as RoleKey }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_TABS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>KYC Status</Label>
                    <Select value={editForm.kycStatus} onValueChange={v => setEditForm(f => ({ ...f, kycStatus: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending", "submitted", "verified", "rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.role === "user" && (
                    <div className="space-y-1">
                      <Label>Assigned Manager</Label>
                      <Select value={editForm.managerId || "none"} onValueChange={v => setEditForm(f => ({ ...f, managerId: v === "none" ? "" : v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(editForm.role === "user" || editForm.role === "manager") && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Fiat Balance ($)</Label>
                        <Input type="number" step="0.01" value={editForm.balanceFiat} onChange={e => setEditForm(f => ({ ...f, balanceFiat: e.target.value }))} className="bg-white/5 border-white/10" />
                      </div>
                      <div className="space-y-1">
                        <Label>Crypto Balance</Label>
                        <Input type="number" step="0.0001" value={editForm.balanceCrypto} onChange={e => setEditForm(f => ({ ...f, balanceCrypto: e.target.value }))} className="bg-white/5 border-white/10" />
                      </div>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>New Password (optional)</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="bg-white/5 border-white/10" minLength={8} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.isActive} onCheckedChange={v => setEditForm(f => ({ ...f, isActive: v }))} />
                    <Label>Account Active</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.isPromoter} onCheckedChange={v => setEditForm(f => ({ ...f, isPromoter: v }))} />
                    <Label>Promoter / Affiliate</Label>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setSelected(null)}>Cancel</Button>
                    <Button type="submit" className="flex-1 bg-amber-500 text-black" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Create {ROLE_TABS.find(t => t.key === createForm.role)?.label} Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v as RoleKey }))}>
                <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_TABS.map(t => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input required value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Phone (optional)</Label>
              <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} className="bg-white/5 border-white/10" />
            </div>
            {createForm.role === "user" && (
              <div className="space-y-1">
                <Label>Assign Manager (optional)</Label>
                <Select value={createForm.managerId || "none"} onValueChange={v => setCreateForm(f => ({ ...f, managerId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" className="w-full bg-amber-500 text-black" disabled={saving}>
                {saving ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
        <AlertDialogContent className="bg-[#050A14] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate {deactivateTarget?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disable login for this account. You can reactivate it later by editing the account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeactivate}>
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
