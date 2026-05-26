import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staff-api";
import {
  Bell, Send, BarChart3, Smartphone, RefreshCw, Download, Users,
} from "lucide-react";
import { InstallAndroidAppBanner } from "@/components/notifications/InstallAndroidAppBanner";

type Stats = {
  byCategory: Array<{ category: string; total: number; unread: number }>;
  totals: { total: number; unread: number; today: number };
  push: { subscribers: number; uniqueUsers: number };
};

type PlatformNotif = {
  id: number;
  userId: number;
  userName?: string | null;
  userEmail?: string | null;
  title: string;
  message: string;
  type: string;
  category: string;
  isRead: boolean;
  createdAt: string;
};

const CATEGORIES = ["all", "deposit", "withdrawal", "service", "kyc", "investment", "support", "system", "promo", "security"];

const categoryColor: Record<string, string> = {
  deposit: "bg-green-500/20 text-green-400",
  withdrawal: "bg-red-500/20 text-red-400",
  service: "bg-blue-500/20 text-blue-400",
  kyc: "bg-teal-500/20 text-teal-400",
  investment: "bg-purple-500/20 text-purple-400",
  support: "bg-rose-500/20 text-rose-400",
  system: "bg-zinc-500/20 text-zinc-300",
  security: "bg-amber-500/20 text-amber-400",
  promo: "bg-pink-500/20 text-pink-400",
};

export function NotificationManagementPanel() {
  const { toast } = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [entries, setEntries] = useState<PlatformNotif[]>([]);
  const [pushConfig, setPushConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [sending, setSending] = useState(false);

  const [broadcast, setBroadcast] = useState({
    title: "",
    message: "",
    type: "info",
    category: "system",
    targetRole: "all",
    actionUrl: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [s, feed, push] = await Promise.all([
        staffFetch<Stats>("/admin/notifications/stats"),
        staffFetch<{ entries: PlatformNotif[] }>(`/admin/notifications?limit=150&category=${filter}`),
        staffFetch("/admin/notifications/push-config"),
      ]);
      setStats(s);
      setEntries(feed.entries);
      setPushConfig(push);
    } catch {
      setStats(null);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const sendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcast.title.trim() || !broadcast.message.trim()) return;
    setSending(true);
    try {
      const res = await staffFetch<{ sent: number }>("/admin/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          title: broadcast.title,
          message: broadcast.message,
          type: broadcast.type,
          category: broadcast.category,
          actionUrl: broadcast.actionUrl || undefined,
          targetRole: broadcast.targetRole === "all" ? undefined : broadcast.targetRole,
          sendPush: true,
        }),
      });
      toast({ title: "Broadcast sent", description: `Delivered to ${res.sent} users with push where enabled.` });
      setBroadcast({ title: "", message: "", type: "info", category: "system", targetRole: "all", actionUrl: "" });
      load();
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-400" /> Notification Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage deposit, withdrawal, service alerts, broadcasts, and mobile app push delivery.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.totals.total ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Total sent</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-amber-400">{stats?.totals.unread ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Unread (users)</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-400">{stats?.totals.today ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{stats?.push.uniqueUsers ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Push subscribers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="feed">
        <TabsList className="bg-white/5 border border-white/10 flex-wrap h-auto">
          <TabsTrigger value="feed" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" />Platform Feed</TabsTrigger>
          <TabsTrigger value="broadcast" className="gap-1.5"><Send className="h-3.5 w-3.5" />Send Broadcast</TabsTrigger>
          <TabsTrigger value="categories" className="gap-1.5"><Bell className="h-3.5 w-3.5" />By Category</TabsTrigger>
          <TabsTrigger value="mobile" className="gap-1.5"><Smartphone className="h-3.5 w-3.5" />Mobile App</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base">All Platform Notifications</CardTitle>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger className="w-40 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => (
                      <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-32 w-full" />
              ) : entries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No notifications yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10">
                        <TableHead>User</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map(n => (
                        <TableRow key={n.id} className="border-white/5">
                          <TableCell>
                            <p className="text-sm font-medium">{n.userName || `#${n.userId}`}</p>
                            <p className="text-xs text-muted-foreground">{n.userEmail}</p>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] capitalize ${categoryColor[n.category] || ""}`}>{n.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-medium">{n.title}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">{n.message}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">{n.isRead ? "Read" : "Unread"}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="mt-4">
          <Card className="bg-white/5 border-white/10 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Send to Users</CardTitle>
              <CardDescription>Broadcast in-app notification + push pop alert to selected audience</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={sendBroadcast} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Title</Label>
                  <Input required value={broadcast.title} onChange={e => setBroadcast(b => ({ ...b, title: e.target.value }))}
                    className="bg-white/5 border-white/10" placeholder="Platform maintenance tonight" />
                </div>
                <div className="space-y-1.5">
                  <Label>Message</Label>
                  <Textarea required value={broadcast.message} onChange={e => setBroadcast(b => ({ ...b, message: e.target.value }))}
                    className="bg-white/5 border-white/10 min-h-[100px]" />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select value={broadcast.type} onValueChange={v => setBroadcast(b => ({ ...b, type: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["info", "success", "warning", "error"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={broadcast.category} onValueChange={v => setBroadcast(b => ({ ...b, category: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.filter(c => c !== "all").map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Audience</Label>
                    <Select value={broadcast.targetRole} onValueChange={v => setBroadcast(b => ({ ...b, targetRole: v }))}>
                      <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All active users</SelectItem>
                        <SelectItem value="user">Investors only</SelectItem>
                        <SelectItem value="manager">Managers</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Action URL (optional)</Label>
                  <Input value={broadcast.actionUrl} onChange={e => setBroadcast(b => ({ ...b, actionUrl: e.target.value }))}
                    className="bg-white/5 border-white/10" placeholder="/wallet" />
                </div>
                <Button type="submit" disabled={sending} className="bg-amber-500 hover:bg-amber-600 text-black font-bold w-full">
                  <Send className="h-4 w-4 mr-2" /> Send Broadcast + Push
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="mt-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(stats?.byCategory || []).map(row => (
              <Card key={row.category} className="bg-white/5 border-white/10">
                <CardContent className="p-4">
                  <Badge className={`capitalize mb-2 ${categoryColor[row.category] || ""}`}>{row.category}</Badge>
                  <p className="text-2xl font-bold">{row.total}</p>
                  <p className="text-xs text-muted-foreground">{row.unread} unread</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="bg-white/5 border-white/10 mt-4">
            <CardHeader><CardTitle className="text-base">Auto-notifications</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p><strong className="text-green-400">Deposits</strong> — submitted, approved, rejected</p>
              <p><strong className="text-red-400">Withdrawals</strong> — requested, approved, rejected (with push pop)</p>
              <p><strong className="text-blue-400">Services</strong> — MT5, copy trading, algo, investments, support tickets</p>
              <p><strong className="text-teal-400">KYC</strong> — submission and verification updates</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mobile" className="mt-4 space-y-4">
          <InstallAndroidAppBanner />
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Smartphone className="h-4 w-4" /> Android App (PWA)</CardTitle>
              <CardDescription>Users install from browser — standalone app with push notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Push subscribers</p>
                  <p className="text-xl font-bold">{pushConfig?.uniqueUsers ?? 0} users</p>
                  <p className="text-xs text-muted-foreground">{pushConfig?.subscribers ?? 0} devices</p>
                </div>
                <div className="p-3 rounded-lg bg-black/30 border border-white/10">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Web Push</p>
                  <p className="text-sm">{pushConfig?.configured ? "VAPID configured" : "Pending setup"}</p>
                  <p className="text-[10px] text-muted-foreground break-all mt-1 font-mono">{pushConfig?.publicKey?.slice(0, 40)}…</p>
                </div>
              </div>
              <div className="rounded-lg border border-white/10 p-4 space-y-2">
                <p className="font-medium flex items-center gap-2"><Download className="h-4 w-4 text-amber-400" /> User install steps (Android Chrome)</p>
                <ol className="list-decimal list-inside text-muted-foreground space-y-1 text-xs">
                  <li>Open <strong className="text-foreground">kuberquant.com</strong> in Chrome</li>
                  <li>Log in → Notifications page → tap <strong className="text-foreground">Install App</strong></li>
                  <li>Tap <strong className="text-foreground">Enable Pop Alerts</strong> for deposit/withdrawal push</li>
                  <li>App appears on home screen like a native Android app</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
