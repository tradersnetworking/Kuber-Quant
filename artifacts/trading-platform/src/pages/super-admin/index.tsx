import { useState } from "react";
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
  Users, Shield, Activity, Globe, RefreshCw,
  Send, CheckCircle, XCircle, Clock, Zap, Key, Settings2,
  Link2, Wifi, WifiOff, Eye, EyeOff, Copy, ExternalLink,
  Code2, Database, AlertCircle, ChevronDown, ChevronUp,
  Tag, FileText, Plus, Trash2, ToggleLeft, ToggleRight, Search
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

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    if (tab === "promo-codes" && !promoLoaded) {
      apiFetch("/promo-codes").then(d => { setPromoCodes(d); setPromoLoaded(true); }).catch(() => setPromoLoaded(true));
    }
    if (tab === "audit-logs" && !auditLoaded) {
      apiFetch("/audit-logs?limit=100").then(d => { setAuditLogs(d); setAuditLoaded(true); }).catch(() => setAuditLoaded(true));
    }
  }

  // ── Global state ──────────────────────────────────────────────────────────
  const [mt5Endpoint, setMt5Endpoint] = useState("");
  const [endpointSaved, setEndpointSaved] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [mt5Requests, setMt5Requests] = useState<any[]>([]);
  const [eaSubs, setEaSubs] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  // ── Promo Codes state ─────────────────────────────────────────────────────
  const [promoCodes, setPromoCodes] = useState<any[]>([]);
  const [promoForm, setPromoForm] = useState({ code: "", type: "percentage", discountValue: "", appliesTo: "deposit", minAmount: "", maxUses: "", expiresAt: "" });
  const [promoLoaded, setPromoLoaded] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showPromoCreate, setShowPromoCreate] = useState(false);

  // ── Audit Logs state ──────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [auditFilter, setAuditFilter] = useState("");

  // ── Trade Copier API state ────────────────────────────────────────────────
  const [tcConfig, setTcConfig] = useState({
    baseUrl: "",
    authType: "api_key" as "api_key" | "bearer" | "basic_auth",
    apiKey: "",
    username: "",
    password: "",
    masterAccountId: "",
  });
  const [tcConfigLoaded, setTcConfigLoaded] = useState(false);
  const [tcTestResult, setTcTestResult] = useState<{ ok: boolean; status?: number; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [tcSlaves, setTcSlaves] = useState<any[]>([]);
  const [showSlaves, setShowSlaves] = useState(false);

  if (!user || (user.role as string) !== "superadmin") {
    return <Redirect to="/dashboard" />;
  }

  // ── Load all data ─────────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(l => ({ ...l, all: true }));
    try {
      const [s, u, m, e, ep, tc] = await Promise.all([
        apiFetch("/super-admin/stats"),
        apiFetch("/super-admin/users"),
        apiFetch("/super-admin/mt5-requests"),
        apiFetch("/super-admin/ea-subscriptions"),
        apiFetch("/super-admin/settings/mt5-endpoint"),
        apiFetch("/super-admin/settings/trade-copier"),
      ]);
      setStats(s);
      setUsers(u);
      setMt5Requests(m);
      setEaSubs(e);
      setMt5Endpoint(ep.endpoint || "");
      setTcConfig({
        baseUrl: tc.baseUrl || "",
        authType: tc.authType || "api_key",
        apiKey: tc.apiKey || "",
        username: tc.username || "",
        password: tc.password || "",
        masterAccountId: tc.masterAccountId || "",
      });
      setTcConfigLoaded(true);
      setLoaded(true);
    } catch (e: any) {
      toast({ title: "Load failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, all: false }));
    }
  }

  if (!loaded && !loading.all) loadAll();

  // ── MT5 relay endpoint ────────────────────────────────────────────────────
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
      toast({ title: "Forwarded", description: "Request forwarded to Trade Copier API + relay endpoint." });
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

  // ── Trade Copier API actions ──────────────────────────────────────────────
  async function saveTcConfig() {
    setLoading(l => ({ ...l, tcSave: true }));
    try {
      await apiFetch("/super-admin/settings/trade-copier", {
        method: "POST",
        body: JSON.stringify(tcConfig),
      });
      toast({ title: "Trade Copier settings saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(l => ({ ...l, tcSave: false }));
    }
  }

  async function testTcConnection() {
    setLoading(l => ({ ...l, tcTest: true }));
    setTcTestResult(null);
    try {
      const result = await apiFetch("/super-admin/settings/trade-copier/test", { method: "POST" });
      setTcTestResult(result);
    } catch (e: any) {
      setTcTestResult({ ok: false, message: e.message });
    } finally {
      setLoading(l => ({ ...l, tcTest: false }));
    }
  }

  async function loadSlaves() {
    setLoading(l => ({ ...l, tcSlaves: true }));
    try {
      const result = await apiFetch("/super-admin/settings/trade-copier/slaves");
      setTcSlaves(result.data || []);
      setShowSlaves(true);
    } catch {
      setTcSlaves([]);
      setShowSlaves(true);
    } finally {
      setLoading(l => ({ ...l, tcSlaves: false }));
    }
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers, color: "text-blue-400" },
    { label: "Admins", value: stats?.admins, color: "text-amber-400" },
    { label: "Managers", value: stats?.managers, color: "text-green-400" },
    { label: "Investors", value: stats?.investors, color: "text-purple-400" },
    { label: "Pending MT5", value: stats?.pendingMt5Requests, color: "text-orange-400" },
    { label: "Active EA Subs", value: stats?.activeEASubscriptions, color: "text-yellow-400" },
  ];

  const statusColor: Record<string, string> = {
    pending: "bg-orange-500/20 text-orange-400",
    forwarded: "bg-blue-500/20 text-blue-400",
    accepted: "bg-green-500/20 text-green-400",
    rejected: "bg-red-500/20 text-red-400",
    completed: "bg-amber-500/20 text-amber-400",
  };

  const tcIsConfigured = tcConfig.baseUrl.length > 0;

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

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="mt5">MT5 Relay</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="ea-subs">EA Subscriptions</TabsTrigger>
            <TabsTrigger value="api" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              API
              {tcIsConfigured
                ? <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
                : <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />}
            </TabsTrigger>
            <TabsTrigger value="promo-codes" className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" />Promo Codes
            </TabsTrigger>
            <TabsTrigger value="audit-logs" className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />Audit Logs
            </TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map((s) => (
                <Card key={s.label} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    {loading.all ? <Skeleton className="h-8 w-16 mb-1" /> : (
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value ?? "—"}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

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

            {/* Trade Copier status card */}
            <Card className={`border ${tcIsConfigured ? "bg-green-500/5 border-green-500/20" : "bg-orange-500/5 border-orange-500/20"}`}>
              <CardContent className="p-4 flex items-center gap-4">
                {tcIsConfigured
                  ? <Wifi className="h-5 w-5 text-green-400 shrink-0" />
                  : <WifiOff className="h-5 w-5 text-orange-400 shrink-0" />}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${tcIsConfigured ? "text-green-400" : "text-orange-400"}`}>
                    Trade Copier API — {tcIsConfigured ? "Configured" : "Not configured"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tcIsConfigured
                      ? `Connected to: ${tcConfig.baseUrl}`
                      : "Configure your Trade Copier API credentials in the API tab to enable automated copy trading."}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setActiveTab("api")}>
                  {tcIsConfigured ? "Manage" : "Set up"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── MT5 Relay ── */}
          <TabsContent value="mt5" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-semibold">MT5 Relay Requests</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Copy-trading and account-handling requests submitted by users. For copy trading requests, clicking Forward will automatically register the slave account on your Trade Copier API.
            </p>

            {tcIsConfigured && (
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                <Wifi className="h-3.5 w-3.5 shrink-0" />
                Trade Copier API connected — forwarding copy trading requests will automatically register slave accounts.
              </div>
            )}

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
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-xs ${r.type === "copy_trading" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                            {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}
                          </Badge>
                          <Badge className={`text-xs ${statusColor[r.status] || "bg-gray-500/20 text-gray-400"}`}>{r.status}</Badge>
                          <span className="text-xs text-muted-foreground">Request #{r.id}</span>
                        </div>
                        <p className="text-sm">User #{r.userId} · <span className="text-amber-400 font-medium">{r.profitSharingPercent}% profit sharing</span></p>
                        {r.mt5AccountId && <p className="text-xs text-muted-foreground">Account: {r.mt5AccountId}</p>}
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

          {/* ── API Integrations ── */}
          <TabsContent value="api" className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Link2 className="h-5 w-5 text-amber-400" />
                API Integrations
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Configure third-party API connections used by the platform for automated trading services.
              </p>
            </div>

            {/* Trade Copier API */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <Code2 className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Trade Copier API
                        {tcIsConfigured
                          ? <Badge className="bg-green-500/20 text-green-400 text-xs flex items-center gap-1"><Wifi className="h-2.5 w-2.5" />Configured</Badge>
                          : <Badge className="bg-orange-500/20 text-orange-400 text-xs flex items-center gap-1"><WifiOff className="h-2.5 w-2.5" />Not configured</Badge>}
                      </CardTitle>
                      <CardDescription>
                        Connect to a RESTful trade copier service (e.g. Duplikium, custom API). Copy trading relay requests will automatically register slave accounts via this API.
                      </CardDescription>
                    </div>
                  </div>
                  <a
                    href="https://trade-copier.com/features/trade-copier-api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    API Docs
                  </a>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {!tcConfigLoaded ? (
                  <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : (
                  <>
                    {/* Base URL */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Base URL</Label>
                      <Input
                        value={tcConfig.baseUrl}
                        onChange={e => setTcConfig(c => ({ ...c, baseUrl: e.target.value }))}
                        placeholder="https://api.trade-copier.com"
                        className="bg-white/5 border-white/10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">The root URL of your trade copier API — no trailing slash.</p>
                    </div>

                    {/* Auth Type */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Authentication Method</Label>
                      <Select value={tcConfig.authType} onValueChange={v => setTcConfig(c => ({ ...c, authType: v as any }))}>
                        <SelectTrigger className="bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="api_key">API Key (X-API-Key + Bearer header)</SelectItem>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic_auth">Basic Auth (Username + Password)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Credentials */}
                    {tcConfig.authType !== "basic_auth" ? (
                      <div className="space-y-2">
                        <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                          {tcConfig.authType === "api_key" ? "API Key" : "Bearer Token"}
                        </Label>
                        <div className="relative">
                          <Input
                            type={showApiKey ? "text" : "password"}
                            value={tcConfig.apiKey}
                            onChange={e => setTcConfig(c => ({ ...c, apiKey: e.target.value }))}
                            placeholder={tcConfig.authType === "api_key" ? "your-api-key" : "your-bearer-token"}
                            className="bg-white/5 border-white/10 font-mono text-sm pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(s => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                          >
                            {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Username</Label>
                          <Input
                            value={tcConfig.username}
                            onChange={e => setTcConfig(c => ({ ...c, username: e.target.value }))}
                            placeholder="your-username"
                            className="bg-white/5 border-white/10"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Password</Label>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              value={tcConfig.password}
                              onChange={e => setTcConfig(c => ({ ...c, password: e.target.value }))}
                              placeholder="your-password"
                              className="bg-white/5 border-white/10 pr-10"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(s => !s)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Master Account ID */}
                    <div className="space-y-2">
                      <Label className="text-xs uppercase tracking-wider text-muted-foreground">Master Account ID</Label>
                      <Input
                        value={tcConfig.masterAccountId}
                        onChange={e => setTcConfig(c => ({ ...c, masterAccountId: e.target.value }))}
                        placeholder="master-account-id-from-trade-copier"
                        className="bg-white/5 border-white/10 font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">The master account ID registered on your trade copier platform. Slave accounts will be linked to this master.</p>
                    </div>

                    {/* Actions row */}
                    <div className="flex gap-3 flex-wrap pt-1">
                      <Button
                        onClick={saveTcConfig}
                        disabled={loading.tcSave}
                        className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-medium"
                      >
                        {loading.tcSave
                          ? "Saving..."
                          : <><Settings2 className="h-4 w-4 mr-2" />Save Settings</>}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={testTcConnection}
                        disabled={loading.tcTest || !tcConfig.baseUrl}
                      >
                        {loading.tcTest
                          ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Testing...</>
                          : <><Wifi className="h-4 w-4 mr-2" />Test Connection</>}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={showSlaves ? () => setShowSlaves(false) : loadSlaves}
                        disabled={loading.tcSlaves || !tcConfig.baseUrl}
                      >
                        {loading.tcSlaves
                          ? <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Loading...</>
                          : showSlaves
                            ? <><ChevronUp className="h-4 w-4 mr-2" />Hide Slaves</>
                            : <><Database className="h-4 w-4 mr-2" />List Slaves</>}
                      </Button>
                    </div>

                    {/* Test result */}
                    {tcTestResult && (
                      <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                        tcTestResult.ok
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}>
                        {tcTestResult.ok
                          ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          : <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                        <div>
                          <p className="font-medium">{tcTestResult.ok ? "Connection successful" : "Connection failed"}</p>
                          <p className="text-xs opacity-80 mt-0.5">{tcTestResult.message}</p>
                          {tcTestResult.status && <p className="text-xs opacity-60 mt-0.5">HTTP {tcTestResult.status}</p>}
                        </div>
                      </div>
                    )}

                    {/* Slave accounts list */}
                    {showSlaves && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                          Slave Accounts ({tcSlaves.length})
                        </p>
                        {tcSlaves.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No slave accounts found on the trade copier.</p>
                        ) : tcSlaves.map((sl, i) => (
                          <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                            <span className="font-mono">{sl.login || sl.id || JSON.stringify(sl)}</span>
                            <Badge className="bg-white/10 text-muted-foreground text-xs">{sl.status || "active"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* How the integration works */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-amber-400" />
                  How the Integration Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      icon: "1",
                      title: "User Submits Request",
                      desc: "A user submits a Copy Trading request via the MT4/MT5 Services page, including their account number and profit sharing terms.",
                      color: "text-blue-400 bg-blue-500/20",
                    },
                    {
                      icon: "2",
                      title: "Admin Reviews",
                      desc: "You review the request in the MT5 Relay tab, verify the account details, and click Forward to approve.",
                      color: "text-amber-400 bg-amber-500/20",
                    },
                    {
                      icon: "3",
                      title: "Auto Slave Registration",
                      desc: "On Forward, the platform calls POST /v1/slaves on your Trade Copier API with the slave login, master account ID, and profit sharing %.",
                      color: "text-purple-400 bg-purple-500/20",
                    },
                    {
                      icon: "4",
                      title: "Live Copy Trading Begins",
                      desc: "The trade copier begins mirroring trades from your master account to the slave. Both accounts trade in real time.",
                      color: "text-green-400 bg-green-500/20",
                    },
                  ].map(item => (
                    <div key={item.icon} className="flex gap-3">
                      <div className={`h-6 w-6 rounded-full ${item.color} flex items-center justify-center text-xs font-bold shrink-0 mt-0.5`}>
                        {item.icon}
                      </div>
                      <div>
                        <p className="font-medium text-white/90">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">API Endpoints Used</p>
                  {[
                    { method: "POST", path: "/v1/slaves", desc: "Register a new slave account" },
                    { method: "DELETE", path: "/v1/slaves/{id}", desc: "Remove a slave account (on unfollow)" },
                    { method: "GET", path: "/v1/slaves", desc: "List all slave accounts" },
                    { method: "GET", path: "/ping or /health", desc: "Test API connectivity" },
                  ].map(ep => (
                    <div key={ep.path} className="flex items-center gap-3 text-xs">
                      <span className={`font-mono font-bold w-14 text-center ${ep.method === "POST" ? "text-green-400" : ep.method === "DELETE" ? "text-red-400" : "text-blue-400"}`}>
                        {ep.method}
                      </span>
                      <code className="text-amber-400 font-mono flex-1">{ep.path}</code>
                      <span className="text-muted-foreground hidden md:block">{ep.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-amber-400" />
                  External MT5 Relay Endpoint
                </CardTitle>
                <CardDescription>
                  Optional secondary relay — configure a custom URL to also receive copy-trading and account-handling requests via POST when you click Forward.
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
                    POST body: requestId, type, userId, userEmail, userName, mt5AccountId, profitSharingPercent, details, timestamp
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
                {[
                  { label: "Your Role", value: <Badge className="bg-red-500/20 text-red-400">Super Admin</Badge> },
                  { label: "Role Hierarchy", value: "superadmin → admin → manager → user" },
                  { label: "KYC Requirement", value: <span className="text-green-400">Exempt</span> },
                  { label: "MT5 Relay Endpoint", value: <span className={mt5Endpoint ? "text-green-400" : "text-orange-400"}>{mt5Endpoint ? "Configured" : "Not configured"}</span> },
                  { label: "Trade Copier API", value: <span className={tcIsConfigured ? "text-green-400" : "text-orange-400"}>{tcIsConfigured ? "Configured" : "Not configured"}</span> },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                    <span className="text-muted-foreground">{item.label}</span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Promo Codes ── */}
          <TabsContent value="promo-codes" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Promo Codes</h3>
                <p className="text-sm text-muted-foreground">Create and manage discount codes for deposits, investments, and EA subscriptions.</p>
              </div>
              <Button onClick={() => { setShowPromoCreate(v => !v); }} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                <Plus className="h-4 w-4 mr-2" />Create Code
              </Button>
            </div>

            {showPromoCreate && (
              <Card className="bg-white/5 border-amber-500/20">
                <CardHeader><CardTitle className="text-base text-amber-400">New Promo Code</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    setPromoLoading(true);
                    try {
                      await apiFetch("/promo-codes", { method: "POST", body: JSON.stringify({ ...promoForm, discountValue: Number(promoForm.discountValue), minAmount: promoForm.minAmount ? Number(promoForm.minAmount) : undefined, maxUses: promoForm.maxUses ? Number(promoForm.maxUses) : undefined, expiresAt: promoForm.expiresAt || undefined }) });
                      const d = await apiFetch("/promo-codes"); setPromoCodes(d); setPromoLoaded(true);
                      setPromoForm({ code: "", type: "percentage", discountValue: "", appliesTo: "deposit", minAmount: "", maxUses: "", expiresAt: "" });
                      setShowPromoCreate(false);
                      toast({ title: "Promo code created!" });
                    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
                    finally { setPromoLoading(false); }
                  }} className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Code</Label>
                      <Input required value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" className="bg-white/5 border-white/10 uppercase" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Applies To</Label>
                      <Select value={promoForm.appliesTo} onValueChange={v => setPromoForm(f => ({ ...f, appliesTo: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="deposit">Deposit</SelectItem>
                          <SelectItem value="investment">Investment</SelectItem>
                          <SelectItem value="ea_subscription">EA Subscription</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Type</Label>
                      <Select value={promoForm.type} onValueChange={v => setPromoForm(f => ({ ...f, type: v }))}>
                        <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Discount Value</Label>
                      <Input required type="number" value={promoForm.discountValue} onChange={e => setPromoForm(f => ({ ...f, discountValue: e.target.value }))} placeholder={promoForm.type === "percentage" ? "20" : "50"} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Min Amount ($, optional)</Label>
                      <Input type="number" value={promoForm.minAmount} onChange={e => setPromoForm(f => ({ ...f, minAmount: e.target.value }))} placeholder="100" className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Max Uses (optional)</Label>
                      <Input type="number" value={promoForm.maxUses} onChange={e => setPromoForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="100" className="bg-white/5 border-white/10" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs text-muted-foreground">Expiry Date (optional)</Label>
                      <Input type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="col-span-2 flex gap-2 pt-1">
                      <Button type="submit" disabled={promoLoading} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold">
                        {promoLoading ? "Creating..." : "Create Promo Code"}
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setShowPromoCreate(false)}>Cancel</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                {!promoLoaded ? (
                  <div className="p-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                ) : promoCodes.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground">
                    <Tag className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>No promo codes yet. Create your first one above.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {promoCodes.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${p.isActive ? "bg-green-500" : "bg-gray-500"}`} />
                          <div>
                            <p className="font-mono font-bold text-amber-400">{p.code}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {p.type === "percentage" ? `${p.discountValue}% off` : `$${p.discountValue} off`} · {p.appliesTo?.replace("_", " ")}
                              {p.maxUses ? ` · ${p.usedCount}/${p.maxUses} used` : ""}
                              {p.expiresAt ? ` · Expires ${new Date(p.expiresAt).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={p.isActive ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                            {p.isActive ? "Active" : "Disabled"}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            await apiFetch(`/promo-codes/${p.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !p.isActive }) });
                            setPromoCodes(ps => ps.map(x => x.id === p.id ? { ...x, isActive: !x.isActive } : x));
                          }} className="h-7 w-7 p-0 text-muted-foreground hover:text-white">
                            {p.isActive ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm("Delete this promo code?")) return;
                            await apiFetch(`/promo-codes/${p.id}`, { method: "DELETE" });
                            setPromoCodes(ps => ps.filter(x => x.id !== p.id));
                            toast({ title: "Deleted" });
                          }} className="h-7 w-7 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Audit Logs ── */}
          <TabsContent value="audit-logs" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Audit Logs</h3>
              <p className="text-sm text-muted-foreground">Immutable record of all administrative and user actions.</p>
            </div>

            {!auditLoaded && (
              <Button onClick={async () => {
                const d = await apiFetch("/audit-logs?limit=100");
                setAuditLogs(d); setAuditLoaded(true);
              }} className="bg-white/5 border border-white/10 hover:bg-white/10 text-white">
                <FileText className="h-4 w-4 mr-2" />Load Audit Logs
              </Button>
            )}

            {auditLoaded && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={auditFilter} onChange={e => setAuditFilter(e.target.value)} placeholder="Filter by action, email, or entity..." className="bg-white/5 border-white/10 pl-10" />
                </div>
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="p-0">
                    {auditLogs.length === 0 ? (
                      <div className="p-12 text-center text-muted-foreground">
                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No audit logs yet.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5 max-h-[600px] overflow-auto">
                        {auditLogs
                          .filter((l: any) => !auditFilter || JSON.stringify(l).toLowerCase().includes(auditFilter.toLowerCase()))
                          .map((l: any, i: number) => (
                            <div key={i} className="px-4 py-3 hover:bg-white/5 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2 min-w-0">
                                  <Badge className="bg-amber-500/20 text-amber-400 text-xs shrink-0 mt-0.5">{l.action}</Badge>
                                  <div className="min-w-0">
                                    <p className="text-xs text-muted-foreground">
                                      {l.entityType && <span className="text-white/60">{l.entityType}</span>}
                                      {l.entityId && <span className="text-white/40"> #{l.entityId}</span>}
                                    </p>
                                    {l.details && (
                                      <p className="text-xs text-white/40 font-mono truncate max-w-sm">
                                        {typeof l.details === "object" ? JSON.stringify(l.details) : l.details}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs text-muted-foreground">{l.ipAddress || "—"}</p>
                                  <p className="text-xs text-white/40">{l.createdAt ? new Date(l.createdAt).toLocaleString() : "—"}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
