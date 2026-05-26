import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  UserPlus, Trash2, Headset, Mail, Phone, Calendar, Ticket, MessageSquare, Users,
  Search, UserCheck, RefreshCw,
} from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { UserFullDetailSheet } from "@/components/super-admin/UserFullDetailSheet";
import { Link } from "wouter";

type SupportAgent = {
  id: number;
  email: string;
  fullName: string;
  phone?: string | null;
  role: string;
  createdAt?: string;
};

type Candidate = SupportAgent & {
  kycStatus?: string;
};

export function SupportTeamManagementPanel() {
  const { toast } = useToast();
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addTab, setAddTab] = useState<"existing" | "new">("existing");
  const [demoteTarget, setDemoteTarget] = useState<SupportAgent | null>(null);
  const [detailUserId, setDetailUserId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", phone: "" });

  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await staffFetch<SupportAgent[]>("/super-admin/support-team");
      setAgents(data);
    } catch (e: any) {
      const msg = e?.message || "Failed to load support team";
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        try {
          const users = await staffFetch<SupportAgent[]>("/super-admin/users?role=support");
          setAgents(users);
          setLoadError(null);
          return;
        } catch {
          setLoadError("Support team API is unavailable. Restart the server (pnpm dev or pnpm build:api && pnpm start).");
        }
      } else {
        setLoadError(msg);
      }
      toast({ title: "Load failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadCandidates = useCallback(async (search: string) => {
    setCandidatesLoading(true);
    try {
      const qs = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
      const data = await staffFetch<Candidate[]>(`/super-admin/support-team/candidates${qs}`);
      setCandidates(data);
    } catch (e: any) {
      toast({ title: "Search failed", description: e.message, variant: "destructive" });
    } finally {
      setCandidatesLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!addOpen || addTab !== "existing") return;
    const timer = window.setTimeout(() => loadCandidates(candidateSearch), 300);
    return () => window.clearTimeout(timer);
  }, [addOpen, addTab, candidateSearch, loadCandidates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await staffFetch("/super-admin/support-team", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast({ title: "Support agent created" });
      setAddOpen(false);
      setForm({ email: "", password: "", fullName: "", phone: "" });
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to create support agent", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddExisting = async (userId: number) => {
    setSaving(true);
    try {
      try {
        await staffFetch("/super-admin/support-team", {
          method: "POST",
          body: JSON.stringify({ userId }),
        });
      } catch (err: any) {
        if (!String(err?.message || "").includes("404")) throw err;
        await staffFetch(`/super-admin/users/${userId}`, {
          method: "PATCH",
          body: JSON.stringify({ role: "support", kycStatus: "verified", managerId: null }),
        });
      }
      toast({ title: "Added to support team" });
      setAddOpen(false);
      setCandidateSearch("");
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to add member", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async () => {
    if (!demoteTarget) return;
    try {
      await staffFetch(`/super-admin/support-team/${demoteTarget.id}`, { method: "DELETE" });
      toast({ title: "Support agent demoted to user" });
      setDemoteTarget(null);
      load();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to demote agent", variant: "destructive" });
    }
  };

  const openAddDialog = () => {
    setAddTab("existing");
    setCandidateSearch("");
    setAddOpen(true);
  };

  const roleLabel = (role: string) => {
    if (role === "manager") return "Manager";
    if (role === "user") return "Investor";
    return role;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold">Support Team</h2>
          <p className="text-sm text-muted-foreground">
            Add existing platform members or create new support agents for tickets, complaints, and the mail desk.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={openAddDialog} className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10 gap-2">
            <UserCheck className="h-4 w-4" /> Add Existing Member
          </Button>
          <Button onClick={() => { setAddTab("new"); setAddOpen(true); }} className="bg-rose-500 hover:bg-rose-600 text-white font-semibold gap-2">
            <UserPlus className="h-4 w-4" /> Create New Agent
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: "/super-admin/support", icon: Ticket, label: "Support Tickets", desc: "Reply and close tickets" },
          { href: "/super-admin/support-mail", icon: Mail, label: "Mail Desk", desc: "IMAP inbox & replies" },
          { href: "/super-admin/users", icon: Users, label: "All Users", desc: "Full user management" },
        ].map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <Card className="bg-white/5 border-white/10 hover:border-rose-500/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-rose-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="bg-white/5 border-white/10 w-fit">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
            <Headset className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Active Support Agents</p>
            <p className="text-2xl font-bold">{agents.length}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-white/5">
        <CardHeader><CardTitle className="text-base">Support Team Members</CardTitle></CardHeader>
        <CardContent>
          {loadError && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-red-400">{loadError}</p>
              <Button size="sm" variant="outline" onClick={load}>Retry</Button>
            </div>
          )}
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : agents.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">
              No support agents yet — add an existing member or create a new agent above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead>Agent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(agent => (
                  <TableRow
                    key={agent.id}
                    className="border-white/10 cursor-pointer hover:bg-white/5"
                    onClick={() => { setDetailUserId(agent.id); setDetailOpen(true); }}
                  >
                    <TableCell>
                      <p className="font-medium hover:text-rose-400">{agent.fullName}</p>
                      <p className="text-xs text-muted-foreground">ID #{agent.id}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />{agent.email}
                      </div>
                      {agent.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <Phone className="h-3 w-3" />{agent.phone}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {agent.createdAt ? format(new Date(agent.createdAt), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" onClick={() => setDemoteTarget(agent)} className="text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-[#050A14] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Headset className="h-5 w-5 text-rose-400" /> Add to Support Team
            </DialogTitle>
          </DialogHeader>

          <Tabs value={addTab} onValueChange={v => setAddTab(v as "existing" | "new")}>
            <TabsList className="bg-white/5 border border-white/10 w-full">
              <TabsTrigger value="existing" className="flex-1">Existing Member</TabsTrigger>
              <TabsTrigger value="new" className="flex-1">New Agent</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="mt-4 space-y-3 outline-none">
              <p className="text-sm text-muted-foreground">
                Promote an existing investor or manager to the support team. They keep the same login credentials.
              </p>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                  className="pl-9 bg-white/5 border-white/10"
                />
              </div>
              <div className="max-h-64 overflow-y-auto rounded-md border border-white/10 divide-y divide-white/5">
                {candidatesLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                  </div>
                ) : candidates.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {candidateSearch.trim() ? "No matching members found." : "Type to search investors and managers."}
                  </p>
                ) : (
                  candidates.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3 p-3 hover:bg-white/5">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] capitalize border-white/20">
                          {roleLabel(c.role)}
                        </Badge>
                        <Button
                          size="sm"
                          disabled={saving}
                          onClick={() => handleAddExisting(c.id)}
                          className="bg-rose-500 hover:bg-rose-600 text-white h-8"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => loadCandidates(candidateSearch)} disabled={candidatesLoading}>
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${candidatesLoading ? "animate-spin" : ""}`} />
                Refresh list
              </Button>
            </TabsContent>

            <TabsContent value="new" className="mt-4 outline-none">
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label>Full Name</Label>
                  <Input required value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" required placeholder="support@kuberquant.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1">
                  <Label>Password</Label>
                  <Input type="password" required minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
                <div className="space-y-1">
                  <Label>Phone (optional)</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="bg-white/5 border-white/10" />
                </div>
                <DialogFooter className="pt-2">
                  <Button type="submit" disabled={saving} className="w-full bg-rose-500 hover:bg-rose-600 text-white">
                    {saving ? "Creating..." : "Create Support Agent"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!demoteTarget} onOpenChange={() => setDemoteTarget(null)}>
        <AlertDialogContent className="bg-[#050A14] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Support Team?</AlertDialogTitle>
            <AlertDialogDescription>
              Demote {demoteTarget?.fullName} to a regular user. They lose support portal access immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDemote} className="bg-red-600 hover:bg-red-700">Demote</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UserFullDetailSheet
        userId={detailUserId}
        open={detailOpen}
        onOpenChange={open => {
          setDetailOpen(open);
          if (!open) load();
        }}
        apiBase="/super-admin"
      />
    </div>
  );
}
