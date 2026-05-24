import { useState } from "react";
import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Users, Shield, Activity, Database, Globe, RefreshCw, Download,
  Send, CheckCircle, XCircle, Clock, Zap, Key, Settings2
} from "lucide-react";
import { Redirect } from "wouter";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json()).error || "Request failed");
  return r.json();
}

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [mt5Endpoint, setMt5Endpoint] = useState("");
  const [endpointSaved, setEndpointSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [mt5Requests, setMt5Requests] = useState<any[]>([]);
  const [eaSubs, setEaSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  if (!user || (user.role as string) !== "superadmin") {
    return <Redirect to="/dashboard" />;
  }

  async function loadAll() {
    setLoading(l => ({ ...l, all: true }));
    try {
      const [s, u, m, e, ep] = await Promise.all([
        apiFetch("/super-admin/stats"),
        apiFetch("/super-admin/users"),
        apiFetch("/super-admin/mt5-requests"),
        apiFetch("/super-admin/ea-subscriptions"),
        apiFetch("/super-admin/settings/mt5-endpoint"),
      ]);
      setStats(s);
      setUsers(u);
      setMt5Requests(m);
      setEaSubs(e);
      setMt5Endpoint(ep.endpoint || "");
      setLoaded(true);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, all: false }));
    }
  }

  if (!loaded && !loading.all) loadAll();

  async function saveEndpoint() {
    try {
      await apiFetch("/super-admin/settings/mt5-endpoint", {
        method: "POST",
        body: JSON.stringify({ endpoint: mt5Endpoint }),
      });
      setEndpointSaved(true);
      toast({ title: "MT5 endpoint saved" });
      setTimeout(() => setEndpointSaved(false), 3000);
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  }

  async function forwardRequest(id: number) {
    setLoading(l => ({ ...l, [`fwd_${id}`]: true }));
    try {
      await apiFetch(`/super-admin/mt5-requests/${id}/forward`, { method: "POST" });
      toast({ title: "Request forwarded to external site" });
      setMt5Requests(r => r.map(x => x.id === id ? { ...x, status: "forwarded" } : x));
    } catch (e: any) {
      toast({ title: "Forward failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, [`fwd_${id}`]: false }));
    }
  }

  async function updateRequestStatus(id: number, status: string) {
    try {
      await apiFetch(`/super-admin/mt5-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: "Status updated" });
      setMt5Requests(r => r.map(x => x.id === id ? { ...x, status } : x));
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  async function updateUserRole(id: number, role: string) {
    try {
      await apiFetch(`/super-admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      toast({ title: "Role updated" });
      setUsers(u => u.map(x => x.id === id ? { ...x, role } : x));
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, icon: Users, color: "text-blue-400" },
    { label: "Admins", value: stats?.admins, icon: Shield, color: "text-amber-400" },
    { label: "Managers", value: stats?.managers, icon: Activity, color: "text-green-400" },
    { label: "Investors", value: stats?.investors, icon: Users, color: "text-purple-400" },
    { label: "Pending MT5 Requests", value: stats?.pendingMt5Requests, icon: Clock, color: "text-orange-400" },
    { label: "Active EA Subs", value: stats?.activeEASubscriptions, icon: Zap, color: "text-yellow-400" },
  ];

  const statusColor: Record<string, string> = {
    pending: "bg-orange-500/20 text-orange-400",
    forwarded: "bg-blue-500/20 text-blue-400",
    accepted: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-amber-500/20 text-amber-400",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              Super Admin
            </h1>
            <p className="text-muted-foreground mt-1">Platform command center — unrestricted access</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading.all}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading.all ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mt5">MT5 Relay</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="ea-subs">EA Subscriptions</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map((s) => (
                <Card key={s.label} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    {loading.all ? (
                      <Skeleton className="h-8 w-16 mb-1" />
                    ) : (
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent MT5 Requests */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader><CardTitle className="text-base">Recent MT5 Relay Requests</CardTitle></CardHeader>
              <CardContent>
                {mt5Requests.slice(0, 5).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <span className="text-sm font-medium">#{r.id} — {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}</span>
                      <span className="text-xs text-muted-foreground ml-2">User #{r.userId} | {r.profitSharingPercent}% profit share</span>
                    </div>
                    <Badge className={`text-xs ${statusColor[r.status] || "bg-gray-500/20 text-gray-400"}`}>{r.status}</Badge>
                  </div>
                ))}
                {mt5Requests.length === 0 && <p className="text-sm text-muted-foreground">No requests yet</p>}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MT5 Relay ── */}
          <TabsContent value="mt5" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold">External MT5 Relay Requests</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              These are copy-trading and account-handling requests submitted by users. Forward them to your external MT5 service via the configured endpoint.
            </p>

            <div className="space-y-3">
              {loading.all ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)
              ) : mt5Requests.length === 0 ? (
                <Card className="bg-white/5 border-white/10 p-8 text-center">
                  <p className="text-muted-foreground">No MT5 relay requests yet</p>
                </Card>
              ) : mt5Requests.map(r => (
                <Card key={r.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`text-xs ${r.type === "copy_trading" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                            {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}
                          </Badge>
                          <Badge className={`text-xs ${statusColor[r.status] || "bg-gray-500/20 text-gray-400"}`}>{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">Request #{r.id}</span>
                        </div>
                        <p className="text-sm">User #{r.userId} · <span className="text-amber-400 font-medium">{r.profitSharingPercent}% profit sharing</span></p>
                        {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {r.status === "pending" && (
                          <Button size="sm" onClick={() => forwardRequest(r.id)} disabled={loading[`fwd_${r.id}`]}
                            className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black">
                            <Send className="h-3 w-3 mr-1" />
                            {loading[`fwd_${r.id}`] ? "Forwarding..." : "Forward"}
                          </Button>
                        )}
                        {["forwarded", "pending"].includes(r.status) && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, "accepted")}>
                              <CheckCircle className="h-3 w-3 mr-1 text-green-400" />Accept
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, "rejected")}>
                              <XCircle className="h-3 w-3 mr-1 text-red-400" />Reject
                            </Button>
                          </>
                        )}
                        {r.status === "accepted" && (
                          <Button size="sm" variant="outline" onClick={() => updateRequestStatus(r.id, "completed")}>
                            <CheckCircle className="h-3 w-3 mr-1 text-amber-400" />Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-4">
            <h2 className="text-lg font-semibold">User Management</h2>
            <div className="space-y-2">
              {loading.all ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : users.map(u => (
                <Card key={u.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        u.role === "superadmin" ? "bg-red-500/20 text-red-400" :
                        u.role === "admin" ? "bg-amber-500/20 text-amber-400" :
                        u.role === "manager" ? "bg-blue-500/20 text-blue-400" :
                        "bg-white/10 text-muted-foreground"
                      }`}>{u.role}</Badge>
                      <Select value={u.role} onValueChange={(role) => updateUserRole(u.id, role)}>
                        <SelectTrigger className="h-8 w-36 text-xs bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="superadmin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── EA Subscriptions ── */}
          <TabsContent value="ea-subs" className="space-y-4">
            <h2 className="text-lg font-semibold">EA Subscriptions</h2>
            <div className="space-y-2">
              {loading.all ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
              ) : eaSubs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No subscriptions yet</p>
              ) : eaSubs.map(s => (
                <Card key={s.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-3 flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">Strategy #{s.strategyId}</p>
                      <p className="text-xs text-muted-foreground">
                        User #{s.userId} · Account: {s.mtAccountNumber} · {s.mtPlatform.toUpperCase()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        License: <code className="text-amber-400">{s.licenseKey}</code> · Downloads: {s.downloadCount}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        s.status === "active" ? "bg-green-500/20 text-green-400" :
                        s.status === "expired" ? "bg-red-500/20 text-red-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>{s.status}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Expires {new Date(s.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-400" />
                  External MT5 API Endpoint
                </CardTitle>
                <CardDescription>
                  Configure the external site URL that receives copy-trading and account-handling relay requests.
                  When you click "Forward" on a request, it sends a POST with the request payload to this endpoint.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Relay Endpoint URL</Label>
                  <Input
                    value={mt5Endpoint}
                    onChange={e => setMt5Endpoint(e.target.value)}
                    placeholder="https://your-mt5-site.com/api/relay"
                    className="bg-white/5 border-white/10"
                  />
                  <p className="text-xs text-muted-foreground">
                    The platform sends a POST request with JSON body: requestId, type, userId, userEmail, userName, mt5AccountId, profitSharingPercent, details, timestamp
                  </p>
                </div>
                <Button onClick={saveEndpoint} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium">
                  {endpointSaved ? <><CheckCircle className="h-4 w-4 mr-2" />Saved!</> : <><Settings2 className="h-4 w-4 mr-2" />Save Endpoint</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-amber-400" />
                  Platform Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">Your Role</span>
                  <Badge className="bg-red-500/20 text-red-400">Super Admin</Badge>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">Role Hierarchy</span>
                  <span>superadmin → admin → manager → user</span>
                </div>
                <div className="flex justify-between py-2 border-b border-white/5">
                  <span className="text-muted-foreground">KYC Requirement</span>
                  <span className="text-green-400">Exempt</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-muted-foreground">API Relay</span>
                  <span className={mt5Endpoint ? "text-green-400" : "text-orange-400"}>
                    {mt5Endpoint ? "Configured" : "Not configured"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
