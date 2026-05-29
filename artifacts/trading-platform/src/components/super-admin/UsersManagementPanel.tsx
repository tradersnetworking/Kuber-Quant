import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearch } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResponsiveDataView } from "@/components/ui/responsive-data-view";
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
  Search, RefreshCw, UserPlus, Eye, Edit2, Trash2, Users, Crown, Headset,
  Users2, ArrowRight, ShieldOff, ShieldCheck, UserCog, UserMinus, Ban, Shield,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { UserServiceControls, defaultServiceForm, type UserServiceForm } from "@/components/super-admin/UserServiceControls";
import { staffFetch } from "@/lib/staff-api";
import { STAFF_HEADER_ROW, STAFF_PAGE_STACK, STAFF_QUICK_LINK_GRID } from "@/lib/staff-dashboard-ui";
import { format } from "date-fns";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { Link } from "wouter";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { isSuperAdminRole } from "@/lib/permissions";

type RoleKey = "user" | "manager" | "support" | "admin" | "superadmin";

interface PlatformUser {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  role: RoleKey | "admin";
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
  suspendReason?: string | null;
  withdrawalsEnabled?: boolean;
  withdrawalBlockMessage?: string | null;
  depositsEnabled?: boolean;
  investmentsEnabled?: boolean;
  algoTradingEnabled?: boolean;
  copyTradingEnabled?: boolean;
  eaTradingEnabled?: boolean;
  mt5Enabled?: boolean;
  createdAt: string;
}

const ROLE_TABS: { key: "user" | "admin" | "superadmin"; label: string; icon: typeof Users; description: string }[] = [
  { key: "user", label: "Investors", icon: Users, description: "Users who deposit, invest, and trade on the platform" },
  { key: "admin", label: "Platform Admins", icon: Shield, description: "Operations & approvals — no credential access" },
  { key: "superadmin", label: "Super Admins", icon: Crown, description: "Full platform control including credentials" },
];

const STAFF_LINKS = [
  {
    href: "/super-admin/managers",
    label: "Managers",
    desc: "Create and manage relationship managers",
    icon: Users2,
    color: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10",
    countKey: "manager" as RoleKey,
  },
  {
    href: "/super-admin/support-team",
    label: "Support Team",
    desc: "Create and manage support agents",
    icon: Headset,
    color: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10",
    countKey: "support" as RoleKey,
  },
] as const;

const ROLE_BADGE: Record<RoleKey, string> = {
  user: "bg-muted text-muted-foreground",
  manager: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400",
  support: "bg-rose-500/20 text-rose-600 dark:text-rose-400",
  admin: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  superadmin: "bg-red-500/20 text-red-400",
};

const KYC_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-blue-500/20 text-blue-600 dark:text-blue-400",
  verified: "bg-green-500/20 text-green-700 dark:text-green-400",
  rejected: "bg-red-500/20 text-red-400",
};

const emptyForm = () => ({
  email: "", password: "", fullName: "", phone: "",
  role: "user" as RoleKey, kycStatus: "pending", isPromoter: false,
  managerId: "", balanceFiat: "", balanceCrypto: "",
  ...defaultServiceForm(),
});

type EditForm = ReturnType<typeof emptyForm>;

export function UsersManagementPanel({ defaultRoleTab = "user" }: { defaultRoleTab?: "user" | "admin" | "superadmin" }) {
  const { toast } = useToast();
  const { user: viewer } = useAuth();
  const urlSearch = useSearch();
  const viewerIsSuperAdmin = isSuperAdminRole(viewer?.role ?? "");
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"user" | "admin" | "superadmin">(
    defaultRoleTab === "superadmin" ? "superadmin" : defaultRoleTab === "admin" ? "admin" : "user",
  );
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
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkWorking, setBulkWorking] = useState(false);
  const [banTarget, setBanTarget] = useState<PlatformUser | null>(null);
  const [banReason, setBanReason] = useState("");

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
    const userId = new URLSearchParams(urlSearch).get("user");
    if (!userId || !/^\d+$/.test(userId)) return;
    const id = Number(userId);
    const match = users.find((u) => u.id === id);
    if (match) {
      setDetailUserId(id);
      setDetailOpen(true);
      setSelected(match);
    } else if (!loading && users.length > 0) {
      setDetailUserId(id);
      setDetailOpen(true);
    }
  }, [urlSearch, users, loading]);

  useEffect(() => {
    setActiveTab(defaultRoleTab === "superadmin" ? "superadmin" : "user");
  }, [defaultRoleTab]);

  const managers = useMemo(
    () => users.filter(u => u.role === "manager" && u.isActive),
    [users],
  );

  const byRole = useMemo(() => {
    const map: Record<RoleKey, PlatformUser[]> = { user: [], manager: [], support: [], admin: [], superadmin: [] };
    for (const u of users) {
      const bucket = (u.role === "admin" ? "admin" : u.role) as RoleKey;
      if (map[bucket]) map[bucket].push(u);
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
    const normalizedRole = (u.role === "admin" ? "admin" : u.role === "superadmin" ? "superadmin" : u.role === "manager" ? "manager" : "user") as RoleKey;
    setEditForm({
      email: u.email,
      password: "",
      fullName: u.fullName,
      phone: u.phone || "",
      role: normalizedRole,
      kycStatus: u.kycStatus,
      isPromoter: u.isPromoter ?? false,
      managerId: u.managerId ? String(u.managerId) : "",
      balanceFiat: String(u.balanceFiat),
      balanceCrypto: String(u.balanceCrypto),
      ...defaultServiceForm({
        isActive: u.isActive,
        suspendReason: u.suspendReason || "",
        withdrawalsEnabled: u.withdrawalsEnabled !== false,
        withdrawalBlockMessage: u.withdrawalBlockMessage || "",
        depositsEnabled: u.depositsEnabled !== false,
        investmentsEnabled: u.investmentsEnabled !== false,
        algoTradingEnabled: u.algoTradingEnabled !== false,
        copyTradingEnabled: u.copyTradingEnabled !== false,
        eaTradingEnabled: u.eaTradingEnabled !== false,
        mt5Enabled: u.mt5Enabled !== false,
      }),
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

  const buildUserPatchBody = (form: EditForm) => ({
    email: form.email,
    fullName: form.fullName,
    phone: form.phone || null,
    role: form.role,
    kycStatus: form.kycStatus,
    isActive: form.isActive,
    suspendReason: form.isActive ? null : (form.suspendReason.trim() || null),
    isPromoter: form.isPromoter,
    managerId: form.managerId ? Number(form.managerId) : null,
    withdrawalsEnabled: form.withdrawalsEnabled,
    withdrawalBlockMessage: form.withdrawalsEnabled ? null : (form.withdrawalBlockMessage.trim() || null),
    depositsEnabled: form.depositsEnabled,
    investmentsEnabled: form.investmentsEnabled,
    algoTradingEnabled: form.algoTradingEnabled,
    copyTradingEnabled: form.copyTradingEnabled,
    eaTradingEnabled: form.eaTradingEnabled,
    mt5Enabled: form.mt5Enabled,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const result = await staffFetch<PlatformUser & { clientsReleased?: number }>(`/super-admin/users/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...buildUserPatchBody(editForm),
          ...(viewerIsSuperAdmin && newPassword ? { password: newPassword } : {}),
        }),
      });
      toast({
        title: "Account updated",
        description: result.clientsReleased ? `${result.clientsReleased} client(s) moved to super admin pool.` : undefined,
      });
      setSelected(null);
      setNewPassword("");
      load();
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteManager = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await staffFetch(`/super-admin/users/${selected.id}/promote-manager`, { method: "POST" });
      toast({ title: "Promoted to manager" });
      setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: "Promotion failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDemoteManager = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await staffFetch<{ clientsReleased: number }>(`/super-admin/users/${selected.id}/demote-manager`, { method: "POST" });
      toast({
        title: "Manager demoted",
        description: `${result.clientsReleased} client(s) reassigned to super admin.`,
      });
      setSelected(null);
      load();
    } catch (err: any) {
      toast({ title: "Demotion failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runBulk = async (updates: Partial<UserServiceForm> & { isActive?: boolean; suspendReason?: string | null }) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBulkWorking(true);
    try {
      const result = await staffFetch<{ updated: number; clientsReleased: number }>("/super-admin/users/bulk", {
        method: "PATCH",
        body: JSON.stringify({ userIds: ids, updates }),
      });
      toast({
        title: `Updated ${result.updated} user(s)`,
        description: result.clientsReleased ? `${result.clientsReleased} client(s) released to super admin pool.` : undefined,
      });
      setSelectedIds(new Set());
      load();
    } catch (err: any) {
      toast({ title: "Bulk action failed", description: err.message, variant: "destructive" });
    } finally {
      setBulkWorking(false);
    }
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (list: PlatformUser[], checked: boolean) => {
    setSelectedIds(checked ? new Set(list.map(u => u.id)) : new Set());
  };

  const handleBanLogin = async () => {
    if (!banTarget) return;
    try {
      await staffFetch(`/super-admin/users/${banTarget.id}/ban-login`, {
        method: "POST",
        body: JSON.stringify({ reason: banReason.trim() || undefined }),
      });
      toast({ title: "User banned from login", description: `${banTarget.fullName} can no longer sign in.` });
      setBanTarget(null);
      setBanReason("");
      load();
    } catch (err: any) {
      toast({ title: "Ban failed", description: err.message, variant: "destructive" });
    }
  };

  const handleUnbanLogin = async (u: PlatformUser) => {
    try {
      await staffFetch(`/super-admin/users/${u.id}/unban-login`, { method: "POST" });
      toast({ title: "Login restored", description: `${u.fullName} can sign in again.` });
      load();
    } catch (err: any) {
      toast({ title: "Unban failed", description: err.message, variant: "destructive" });
    }
  };

  const hasRestrictedServices = (u: PlatformUser) =>
    !u.isActive
    || u.withdrawalsEnabled === false
    || u.depositsEnabled === false
    || u.investmentsEnabled === false
    || u.algoTradingEnabled === false
    || u.copyTradingEnabled === false
    || u.eaTradingEnabled === false
    || u.mt5Enabled === false;

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

  const renderTable = (role: "user" | "admin" | "superadmin") => {
    const list = filterList(byRole[role]);
    const showManager = role === "user";
    const showBalance = role === "user";

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
          <Button variant="link" className="text-amber-600 dark:text-amber-400" onClick={openCreate}>Create one</Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {selectedIds.size > 0 && role === "user" && (
          <div className="mx-4 flex flex-wrap items-center gap-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({ isActive: false, suspendReason: "Bulk banned by super admin" })}>
              <Ban className="h-3.5 w-3.5 mr-1" /> Ban login
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({ isActive: false, suspendReason: "Bulk suspended by super admin" })}>
              <ShieldOff className="h-3.5 w-3.5 mr-1" /> Suspend
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({ isActive: true, suspendReason: undefined })}>
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Unsuspend
            </Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({ withdrawalsEnabled: false })}>Block withdrawals</Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({ withdrawalsEnabled: true })}>Allow withdrawals</Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({
              depositsEnabled: false, investmentsEnabled: false, algoTradingEnabled: false,
              copyTradingEnabled: false, eaTradingEnabled: false, mt5Enabled: false,
            })}>Restrict all services</Button>
            <Button size="sm" variant="outline" disabled={bulkWorking} onClick={() => runBulk({
              depositsEnabled: true, investmentsEnabled: true, algoTradingEnabled: true,
              copyTradingEnabled: true, eaTradingEnabled: true, mt5Enabled: true,
            })}>Allow all services</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
          </div>
        )}
      <ResponsiveDataView
        data={list}
        rowKey={u => u.id}
        onRowClick={openDetail}
        rowClassName="border-border/80 dark:border-white/5 cursor-pointer hover:bg-muted/80 dark:hover:bg-muted/60 dark:bg-white/5"
        mobileHeader={u => (
          <div className="mb-2 min-w-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-2">
              {role === "user" && (
                <Checkbox
                  checked={selectedIds.has(u.id)}
                  onCheckedChange={v => toggleSelect(u.id, !!v)}
                  aria-label={`Select ${u.fullName}`}
                  className="mt-0.5 shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <button type="button" className="text-left font-semibold text-sm hover:text-amber-600 dark:text-amber-400 hover:underline truncate block w-full" onClick={() => openDetail(u)}>
                  {u.fullName}
                </button>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">#{u.id}</p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <Badge className={`text-xs capitalize ${KYC_BADGE[u.kycStatus] || ""}`}>{u.kycStatus}</Badge>
                {u.isActive
                  ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Active</Badge>
                  : <Badge className="bg-red-500/20 text-red-400 text-xs">Suspended</Badge>}
                {hasRestrictedServices(u) && u.isActive && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">Restricted</Badge>
                )}
              </div>
            </div>
          </div>
        )}
        mobileFooter={u => (
          <div className="mt-3 pt-3 border-t border-border/80 flex justify-end gap-1" onClick={e => e.stopPropagation()}>
            {u.isActive && u.role !== "superadmin" && u.role !== "admin" && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" title="Ban login" onClick={() => { setBanTarget(u); setBanReason(""); }}>
                <Ban className="h-3.5 w-3.5" />
              </Button>
            )}
            {!u.isActive && u.role !== "superadmin" && u.role !== "admin" && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400" title="Restore login" onClick={() => handleUnbanLogin(u)}>
                <Shield className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(u)}>
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            {u.isActive && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 dark:text-red-300" onClick={() => setDeactivateTarget(u)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
        columns={[
          ...(role === "user" ? [{
            key: "select",
            header: (
              <Checkbox
                checked={list.length > 0 && list.every(u => selectedIds.has(u.id))}
                onCheckedChange={v => toggleSelectAll(list, !!v)}
                aria-label="Select all"
              />
            ),
            headerClassName: "w-10",
            hideOnMobile: true,
            cell: (u: PlatformUser) => (
              <div onClick={e => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(u.id)}
                  onCheckedChange={v => toggleSelect(u.id, !!v)}
                  aria-label={`Select ${u.fullName}`}
                />
              </div>
            ),
          }] : []),
          {
            key: "id",
            header: "ID",
            hideOnMobile: true,
            cellClassName: "text-muted-foreground font-mono text-xs",
            cell: (u: PlatformUser) => `#${u.id}`,
          },
          {
            key: "name",
            header: "Name",
            mobileTitle: true,
            hideOnMobile: true,
            cellClassName: "font-medium max-w-[120px] sm:max-w-[180px]",
            cell: (u: PlatformUser) => (
              <button type="button" className="text-left hover:text-amber-600 dark:text-amber-400 hover:underline truncate block w-full" onClick={e => { e.stopPropagation(); openDetail(u); }}>
                {u.fullName}
              </button>
            ),
          },
          {
            key: "email",
            header: "Email",
            hideOnMobile: true,
            cellClassName: "text-muted-foreground text-sm max-w-[140px] sm:max-w-[220px] truncate",
            cell: (u: PlatformUser) => u.email,
          },
          ...(showManager ? [{
            key: "manager",
            header: "Manager",
            cell: (u: PlatformUser) => <span className="text-sm">{managerName(u.managerId)}</span>,
          }] : []),
          ...(showBalance ? [{
            key: "balance",
            header: "Fiat Balance",
            headerClassName: "text-right",
            cellClassName: "text-right text-emerald-600 dark:text-emerald-400 font-medium",
            cell: (u: PlatformUser) => `$${u.balanceFiat.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          }] : []),
          {
            key: "kyc",
            header: "KYC",
            hideOnMobile: true,
            cell: (u: PlatformUser) => (
              <Badge className={`text-xs capitalize ${KYC_BADGE[u.kycStatus] || ""}`}>{u.kycStatus}</Badge>
            ),
          },
          {
            key: "status",
            header: "Status",
            hideOnMobile: true,
            cell: (u: PlatformUser) => (
              <div className="flex flex-col gap-1 items-start">
                {u.isActive
                  ? <Badge className="bg-green-500/20 text-green-700 dark:text-green-400 text-xs">Active</Badge>
                  : <Badge className="bg-red-500/20 text-red-400 text-xs">Suspended</Badge>}
                {hasRestrictedServices(u) && u.isActive && (
                  <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">Restricted</Badge>
                )}
              </div>
            ),
          },
          {
            key: "joined",
            header: "Joined",
            cellClassName: "text-xs text-muted-foreground",
            cell: (u: PlatformUser) => format(new Date(u.createdAt), "dd MMM yyyy"),
          },
          {
            key: "actions",
            header: "Actions",
            headerClassName: "text-right",
            hideOnMobile: true,
            cell: (u: PlatformUser) => (
              <div className="text-right" onClick={e => e.stopPropagation()}>
                <div className="flex justify-end gap-1">
                  {u.isActive && u.role !== "superadmin" && u.role !== "admin" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-300" title="Ban login" onClick={() => { setBanTarget(u); setBanReason(""); }}>
                      <Ban className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {!u.isActive && u.role !== "superadmin" && u.role !== "admin" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-500 hover:text-emerald-400" title="Restore login" onClick={() => handleUnbanLogin(u)}>
                      <Shield className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetail(u)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  {u.isActive && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-600 dark:text-red-300" onClick={() => setDeactivateTarget(u)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
      </div>
    );
  };

  return (
    <div className={STAFF_PAGE_STACK}>
      <div className={STAFF_HEADER_ROW}>
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold break-words">Users & Investors</h2>
          <p className="text-sm text-muted-foreground break-words">
            Manage investor accounts — balances, KYC, and assigned managers. Staff roles are managed in their dedicated sections.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto min-w-0 sm:justify-end">
          <div className="relative flex-1 min-w-[140px] sm:flex-none sm:w-52">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 w-full bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading} className="shrink-0">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" className="bg-amber-500 text-black font-semibold shrink-0 w-full sm:w-auto" onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-1" /> Create Investor
          </Button>
        </div>
      </div>

      <div className={STAFF_QUICK_LINK_GRID}>
        <button type="button" onClick={() => setActiveTab("user")} className="text-left">
          <Card className={`bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-border dark:border-white/20 transition-colors cursor-pointer h-full ${activeTab === "user" ? "ring-1 ring-amber-500/40" : ""}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Investors</p>
                  <p className="text-xs text-muted-foreground truncate">Platform users & clients</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-border dark:border-white/20 shrink-0">{byRole.user.length}</Badge>
            </CardContent>
          </Card>
        </button>
        {STAFF_LINKS.map(({ href, label, desc, icon: Icon, color, bg, countKey }) => (
          <Link key={href} href={href}>
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-border dark:border-white/20 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground truncate">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs border-border dark:border-white/20">{byRole[countKey].length}</Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        <button type="button" onClick={() => setActiveTab("admin")} className="text-left">
          <Card className={`bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-border dark:border-white/20 transition-colors cursor-pointer h-full ${activeTab === "admin" ? "ring-1 ring-amber-500/40" : ""}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Shield className="h-4 w-4 text-amber-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Platform Admins</p>
                  <p className="text-xs text-muted-foreground truncate">Approvals & operations</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-border dark:border-white/20">{byRole.admin.length}</Badge>
            </CardContent>
          </Card>
        </button>
        {viewerIsSuperAdmin && (
        <button type="button" onClick={() => setActiveTab("superadmin")} className="text-left">
          <Card className={`bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 hover:border-border dark:border-white/20 transition-colors cursor-pointer h-full ${activeTab === "superadmin" ? "ring-1 ring-amber-500/40" : ""}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                  <Crown className="h-4 w-4 text-red-400" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">Super Admins</p>
                  <p className="text-xs text-muted-foreground truncate">Platform administrators</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="text-xs border-border dark:border-white/20">{byRole.superadmin.length}</Badge>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as "user" | "admin" | "superadmin")}>
        <TabsList className="bg-muted/60 dark:bg-white/5 border border-border dark:border-white/10">
          <TabsTrigger value="user" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Investors
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-border dark:border-white/20">
              {byRole.user.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Platform Admins
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-border dark:border-white/20">
              {byRole.admin.length}
            </Badge>
          </TabsTrigger>
          {viewerIsSuperAdmin && (
          <TabsTrigger value="superadmin" className="gap-1.5">
            <Crown className="h-3.5 w-3.5" />
            Super Admins
            <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 border-border dark:border-white/20">
              {byRole.superadmin.length}
            </Badge>
          </TabsTrigger>
          )}
        </TabsList>

        {ROLE_TABS.map(tab => (
          <TabsContent key={tab.key} value={tab.key} className="mt-4 outline-none">
            <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <tab.icon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
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
        <SheetContent className="w-full sm:max-w-lg bg-background border-border dark:border-white/10 overflow-y-auto flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2 flex-wrap">
                  Edit {selected.fullName}
                  <Badge className={ROLE_BADGE[selected.role in ROLE_BADGE ? selected.role as RoleKey : "user"]}>
                    {selected.role}
                  </Badge>
                </SheetTitle>
                <SheetDescription>{selected.email}</SheetDescription>
              </SheetHeader>

              <form onSubmit={handleSave} className="mt-6 space-y-4">
                  <div className="space-y-1">
                    <Label>Full Name</Label>
                    <Input value={editForm.fullName} onChange={e => setEditForm(f => ({ ...f, fullName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" required />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
                  </div>
                  <div className="space-y-1">
                    <Label>Role</Label>
                    <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v as RoleKey }))}>
                      <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Investor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Platform Admin</SelectItem>
                        {viewerIsSuperAdmin && <SelectItem value="superadmin">Super Admin</SelectItem>}
                      </SelectContent>
                    </Select>
                  </div>
                  {selected.role === "user" && (
                    <Button type="button" variant="outline" className="w-full gap-2" disabled={saving} onClick={handlePromoteManager}>
                      <UserCog className="h-4 w-4" /> Promote to Manager
                    </Button>
                  )}
                  {selected.role === "manager" && (
                    <Button type="button" variant="outline" className="w-full gap-2 border-red-500/30 text-red-400" disabled={saving} onClick={handleDemoteManager}>
                      <UserMinus className="h-4 w-4" /> Demote Manager (clients → super admin)
                    </Button>
                  )}
                  <div className="space-y-1">
                    <Label>KYC Status</Label>
                    <Select value={editForm.kycStatus} onValueChange={v => setEditForm(f => ({ ...f, kycStatus: v }))}>
                      <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["pending", "submitted", "verified", "rejected"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {editForm.role === "user" && (
                    <div className="space-y-1">
                      <Label>Assigned Manager</Label>
                      <Select value={editForm.managerId || "none"} onValueChange={v => setEditForm(f => ({ ...f, managerId: v === "none" ? "" : v }))}>
                        <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue placeholder="None" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {managers.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.fullName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {(editForm.role === "user" || editForm.role === "manager") && (
                    <p className="text-xs text-muted-foreground rounded-md border border-border dark:border-white/10 bg-muted/40 dark:bg-white/5 px-3 py-2">
                      Balances are ledger-managed. Use <strong>Wallet → Adjust</strong> in the admin console to credit or debit accounts with audit trail.
                    </p>
                  )}
                  {viewerIsSuperAdmin && (
                  <div className="space-y-1">
                    <Label>New Password (optional)</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Leave blank to keep current" className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" minLength={8} />
                  </div>
                  )}
                  <UserServiceControls
                    value={editForm}
                    onChange={patch => setEditForm(f => ({ ...f, ...patch }))}
                  />
                  <div className="flex items-center gap-2">
                    <Switch checked={editForm.isPromoter} onCheckedChange={v => setEditForm(f => ({ ...f, isPromoter: v }))} />
                    <Label>Promoter / Affiliate</Label>
                  </div>
                  <div className="flex gap-2 pt-2 pb-2 sticky bottom-0 bg-background/95 backdrop-blur-sm border-t border-border/60 -mx-1 px-1 mt-4">
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
        <DialogContent className="bg-background border-border dark:border-white/10 max-w-md max-h-[min(90dvh,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Create {activeTab === "superadmin" ? "Super Admin" : "Investor"} Account</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-3">
            {activeTab === "superadmin" && (
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={createForm.role} onValueChange={v => setCreateForm(f => ({ ...f, role: v as RoleKey }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="superadmin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input required value={createForm.fullName} onChange={e => setCreateForm(f => ({ ...f, fullName: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            <div className="space-y-1">
              <Label>Phone (optional)</Label>
              <Input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10" />
            </div>
            {createForm.role === "user" && (
              <div className="space-y-1">
                <Label>Assign Manager (optional)</Label>
                <Select value={createForm.managerId || "none"} onValueChange={v => setCreateForm(f => ({ ...f, managerId: v === "none" ? "" : v }))}>
                  <SelectTrigger className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"><SelectValue /></SelectTrigger>
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

      {/* Ban login confirm */}
      <AlertDialog open={!!banTarget} onOpenChange={open => !open && setBanTarget(null)}>
        <AlertDialogContent className="bg-background border-border dark:border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              Ban {banTarget?.fullName} from login?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This user will be immediately blocked from signing in. You can restore access with the shield button later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1 py-2">
            <Label>Reason (optional — shown on login attempt)</Label>
            <Textarea
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              placeholder="e.g. Terms violation, fraud investigation…"
              className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[72px]"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleBanLogin}>
              Ban Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivate Confirm */}
      <AlertDialog open={!!deactivateTarget} onOpenChange={open => !open && setDeactivateTarget(null)}>
        <AlertDialogContent className="bg-background border-border dark:border-white/10">
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
