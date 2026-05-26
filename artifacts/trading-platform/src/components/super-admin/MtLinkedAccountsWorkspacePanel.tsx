import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  LineChart, RefreshCw, Send, CheckCircle, XCircle, Key, Globe,
  Copy, ShieldCheck, Wifi,
} from "lucide-react";
import { staffFetch } from "@/lib/staff-api";
import { Mt5RelayFormConfigPanel } from "@/components/super-admin/Mt5RelayFormConfigPanel";

type WorkspaceTab = "credentials" | "requests" | "config";

interface MtLinkedAccountsWorkspacePanelProps {
  apiBase?: "/admin" | "/super-admin";
  defaultTab?: WorkspaceTab;
  showFormConfig?: boolean;
}

const statusColor: Record<string, string> = {
  active: "bg-green-500/20 text-green-400",
  inactive: "bg-gray-500/20 text-gray-400",
  pending_review: "bg-amber-500/20 text-amber-400",
  pending: "bg-amber-500/20 text-amber-400",
  forwarded: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-purple-500/20 text-purple-400",
};

export function MtLinkedAccountsWorkspacePanel({
  apiBase = "/super-admin",
  defaultTab = "credentials",
  showFormConfig = apiBase === "/super-admin",
}: MtLinkedAccountsWorkspacePanelProps) {
  const { toast } = useToast();
  const [tab, setTab] = useState<WorkspaceTab>(defaultTab);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const [mt5Endpoint, setMt5Endpoint] = useState("");
  const [tcConfigured, setTcConfigured] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const fetches: Promise<any>[] = [
        staffFetch<any[]>(`${apiBase}/mt5-accounts`),
        staffFetch<any[]>(`${apiBase}/mt5-requests`),
      ];
      if (showFormConfig && apiBase === "/super-admin") {
        fetches.push(
          staffFetch<{ endpoint?: string }>("/super-admin/settings/mt5-endpoint").catch(() => ({ endpoint: "" })),
          staffFetch<{ baseUrl?: string }>("/super-admin/settings/trade-copier").catch(() => ({ baseUrl: "" })),
        );
      }
      const results = await Promise.all(fetches);
      setAccounts(results[0]);
      setRequests(results[1]);
      if (showFormConfig && apiBase === "/super-admin") {
        setMt5Endpoint(results[2]?.endpoint || "");
        setTcConfigured(Boolean(results[3]?.baseUrl?.trim()));
      }
    } catch (e: any) {
      toast({ title: "Failed to load MT workspace", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [apiBase, showFormConfig, toast]);

  useEffect(() => { load(); }, [load]);

  const reviewAccount = async (id: number, status: "active" | "inactive" | "pending_review") => {
    setActionLoading(l => ({ ...l, [`acc_${id}`]: true }));
    try {
      await staffFetch(`${apiBase}/mt5-accounts/${id}/review`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: status === "active" ? "Account approved" : "Account updated" });
      load();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(l => ({ ...l, [`acc_${id}`]: false }));
    }
  };

  const forwardRequest = async (id: number) => {
    setActionLoading(l => ({ ...l, [`fwd_${id}`]: true }));
    try {
      await staffFetch(`${apiBase}/mt5-requests/${id}/forward`, { method: "POST" });
      toast({ title: "Forwarded", description: "Profit-sharing request forwarded to Trade Copier and relay endpoint." });
      load();
    } catch (e: any) {
      toast({ title: "Forward failed", description: e.message, variant: "destructive" });
    } finally {
      setActionLoading(l => ({ ...l, [`fwd_${id}`]: false }));
    }
  };

  const updateRequestStatus = async (id: number, status: string) => {
    try {
      await staffFetch(`${apiBase}/mt5-requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({ title: "Status updated" });
      load();
    } catch (e: any) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    }
  };

  const saveEndpoint = async () => {
    try {
      await staffFetch("/super-admin/settings/mt5-endpoint", {
        method: "POST",
        body: JSON.stringify({ endpoint: mt5Endpoint }),
      });
      toast({ title: "Relay endpoint saved" });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    }
  };

  const filteredAccounts = accounts.filter(a =>
    !search ||
    a.accountNumber?.includes(search) ||
    a.broker?.toLowerCase().includes(search.toLowerCase()) ||
    a.userName?.toLowerCase().includes(search.toLowerCase()) ||
    a.userEmail?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRequests = requests.filter(r =>
    !search ||
    r.userName?.toLowerCase().includes(search.toLowerCase()) ||
    r.userEmail?.toLowerCase().includes(search.toLowerCase()) ||
    r.accountNumber?.includes(search) ||
    String(r.id).includes(search)
  );

  const pendingCredentials = accounts.filter(a => a.status === "pending_review").length;
  const pendingRequests = requests.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LineChart className="h-5 w-5 text-sky-400" />
            User MT Accounts &amp; Profit Sharing
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Users link MT4/MT5 credentials for copy trading or account handling on a profit-sharing basis
            (same flow as <span className="text-amber-400/90">/mt5-accounts</span> and{" "}
            <span className="text-amber-400/90">/mt5-relay</span>). Review credentials, then forward or accept service requests.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Input
            placeholder="Search user or account..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-48 bg-white/5 border-white/10"
          />
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="border-amber-500/30 text-amber-400">
          {pendingCredentials} credential{pendingCredentials !== 1 ? "s" : ""} pending review
        </Badge>
        <Badge variant="outline" className="border-violet-500/30 text-violet-400">
          {pendingRequests} profit-sharing request{pendingRequests !== 1 ? "s" : ""} pending
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as WorkspaceTab)}>
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="credentials">
            Credential Submissions
            {pendingCredentials > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 text-amber-400 text-xs px-1.5">{pendingCredentials}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            Profit-Sharing Requests
            {pendingRequests > 0 && (
              <span className="ml-2 rounded-full bg-violet-500/20 text-violet-400 text-xs px-1.5">{pendingRequests}</span>
            )}
          </TabsTrigger>
          {showFormConfig && <TabsTrigger value="config">Form &amp; Routing</TabsTrigger>}
        </TabsList>

        <TabsContent value="credentials" className="mt-4 space-y-3">
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : filteredAccounts.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-muted-foreground text-sm">No user-submitted MT4/MT5 credentials yet.</p>
            </Card>
          ) : (
            filteredAccounts.map(a => (
              <Card key={a.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">#{a.accountNumber}</p>
                      <Badge className={statusColor[a.status] || "bg-gray-500/20 text-gray-400"}>{a.status}</Badge>
                      <Badge variant="outline">{(a.platform || "mt5").toUpperCase()}</Badge>
                      {a.hasCredentials && (
                        <Badge variant="outline" className="text-green-400 border-green-500/30">
                          <Key className="h-3 w-3 mr-1" />Credentials stored
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {a.broker}{a.serverName ? ` · ${a.serverName}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.userName} ({a.userEmail})
                    </p>
                    {a.profitSharingRequests?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {a.profitSharingRequests.map((r: any) => (
                          <Badge key={r.id} variant="secondary" className="text-[10px]">
                            {r.type === "copy_trading" ? "Copy" : "Handling"} · {r.profitSharingPercent}% · {r.status}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(a.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap shrink-0">
                    {a.status === "pending_review" && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          disabled={actionLoading[`acc_${a.id}`]}
                          onClick={() => reviewAccount(a.id, "active")}
                        >
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-400 border-red-500/30"
                          disabled={actionLoading[`acc_${a.id}`]}
                          onClick={() => reviewAccount(a.id, "inactive")}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                    {a.status === "active" && (
                      <Button size="sm" variant="outline" onClick={() => reviewAccount(a.id, "inactive")}>
                        Deactivate
                      </Button>
                    )}
                    {a.status === "inactive" && (
                      <Button size="sm" variant="outline" onClick={() => reviewAccount(a.id, "active")}>
                        Reactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {tcConfigured && (
            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              Trade Copier API connected — forwarding copy trading requests registers slave accounts automatically.
            </div>
          )}

          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
          ) : filteredRequests.length === 0 ? (
            <Card className="bg-white/5 border-white/10 p-8 text-center">
              <p className="text-muted-foreground text-sm">No copy trading or account handling requests yet.</p>
            </Card>
          ) : (
            filteredRequests.map(r => (
              <Card key={r.id} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge className={`text-xs ${r.type === "copy_trading" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                          {r.type === "copy_trading" ? (
                            <><Copy className="h-3 w-3 mr-1 inline" />Copy Trading</>
                          ) : (
                            "Account Handling"
                          )}
                        </Badge>
                        <Badge className={`text-xs ${statusColor[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                          {r.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Request #{r.id}</span>
                      </div>
                      <p className="text-sm">
                        {r.userName}{" "}
                        <span className="text-muted-foreground">({r.userEmail})</span>
                        {" · "}
                        <span className="text-amber-400 font-medium">{r.profitSharingPercent}% profit sharing</span>
                      </p>
                      {r.accountNumber && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Account #{r.accountNumber} · {r.broker}
                          {r.serverName ? ` · ${r.serverName}` : ""}
                          {r.platform ? ` · ${String(r.platform).toUpperCase()}` : ""}
                          {r.hasCredentials && " · credentials on file"}
                        </p>
                      )}
                      {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {r.status === "pending" && (
                        <Button
                          size="sm"
                          onClick={() => forwardRequest(r.id)}
                          disabled={actionLoading[`fwd_${r.id}`]}
                          className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black"
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {actionLoading[`fwd_${r.id}`] ? "Forwarding..." : "Forward"}
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
            ))
          )}
        </TabsContent>

        {showFormConfig && (
          <TabsContent value="config" className="mt-4 space-y-6">
            <Mt5RelayFormConfigPanel />
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-amber-400" />
                  <h3 className="font-medium text-sm">External Relay Endpoint</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  When a profit-sharing request is forwarded, a POST is sent to this URL with user credentials metadata and profit %.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    value={mt5Endpoint}
                    onChange={e => setMt5Endpoint(e.target.value)}
                    placeholder="https://your-mt5-site.com/api/relay"
                    className="bg-white/5 border-white/10 flex-1"
                  />
                  <Button size="sm" className="bg-amber-500 text-black shrink-0" onClick={saveEndpoint}>
                    Save Endpoint
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/** @deprecated Use MtLinkedAccountsWorkspacePanel */
export const Mt5AccountsManagementPanel = MtLinkedAccountsWorkspacePanel;
