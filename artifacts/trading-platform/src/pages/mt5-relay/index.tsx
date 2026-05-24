import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Users, Activity, Clock, CheckCircle, XCircle, Send, TrendingUp } from "lucide-react";

const API_BASE = "/api";
const getToken = () => localStorage.getItem("token");

async function apiFetch(path: string, opts: RequestInit = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  if (!r.ok) { const j = await r.json().catch(() => ({ error: "Request failed" })); throw new Error(j.error || "Request failed"); }
  return r.json();
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-orange-500/20 text-orange-400",
  forwarded: "bg-blue-500/20 text-blue-400",
  accepted: "bg-green-500/20 text-green-400",
  rejected: "bg-red-500/20 text-red-400",
  completed: "bg-amber-500/20 text-amber-400",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  forwarded: Send,
  accepted: CheckCircle,
  rejected: XCircle,
  completed: TrendingUp,
};

export default function Mt5RelayPage() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "copy_trading",
    mt5AccountId: "",
    profitSharingPercent: 30,
    details: "",
  });

  useEffect(() => {
    apiFetch("/mt5-relay/my").then(setRequests).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        type: form.type,
        profitSharingPercent: form.profitSharingPercent,
        details: form.details || undefined,
      };
      if (form.mt5AccountId) payload.mt5AccountId = parseInt(form.mt5AccountId);
      const result = await apiFetch("/mt5-relay", { method: "POST", body: JSON.stringify(payload) });
      setRequests(r => [{ ...result }, ...r]);
      setForm({ type: "copy_trading", mt5AccountId: "", profitSharingPercent: 30, details: "" });
      toast({ title: "Request submitted", description: "Our team will review and contact you shortly." });
    } catch (e: any) {
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            MT5 Account Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Request copy trading or account handling services with profit-sharing arrangements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Request Form */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Submit a Request</CardTitle>
              <CardDescription>
                Choose a service type and configure your profit-sharing terms. Our team will review and connect your MT5 account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Service Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copy_trading">
                        <div className="flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /><span>Copy Trading</span></div>
                      </SelectItem>
                      <SelectItem value="account_handling">
                        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-purple-400" /><span>Account Handling</span></div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {form.type === "copy_trading"
                      ? "Automatically mirror trades from our expert traders to your MT5 account."
                      : "Our team manages your MT5 account on your behalf, applying institutional strategies."}
                  </p>
                </div>

                {/* Profit Sharing */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Profit Sharing</Label>
                    <span className="text-2xl font-bold text-amber-400">{form.profitSharingPercent}%</span>
                  </div>
                  <Slider
                    value={[form.profitSharingPercent]}
                    onValueChange={([v]) => setForm(f => ({ ...f, profitSharingPercent: v }))}
                    min={10} max={50} step={5}
                    className="[&>span]:bg-amber-500"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10% (Min)</span>
                    <span>50% (Max)</span>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1">
                    <p className="text-amber-300 font-medium">Profit Sharing Breakdown</p>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">You receive</span>
                      <span className="text-green-400 font-medium">{100 - form.profitSharingPercent}% of profits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Kuber Quant receives</span>
                      <span className="text-amber-400 font-medium">{form.profitSharingPercent}% of profits</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">MT5 Account ID (optional)</Label>
                  <Input
                    placeholder="Your MT5 account ID from the platform"
                    value={form.mt5AccountId}
                    onChange={e => setForm(f => ({ ...f, mt5AccountId: e.target.value }))}
                    className="bg-white/5 border-white/10"
                    type="number"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Additional Details</Label>
                  <Textarea
                    placeholder="Any specific requirements, preferred trading pairs, risk level, etc."
                    value={form.details}
                    onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
                    className="bg-white/5 border-white/10 min-h-[80px]"
                  />
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-bold h-11">
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* My Requests */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">My Requests</h2>
            {loading ? (
              Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)
            ) : requests.length === 0 ? (
              <Card className="bg-white/5 border-white/10 p-8 text-center">
                <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No requests yet. Submit your first request to get started.</p>
              </Card>
            ) : requests.map(r => {
              const StatusIcon = STATUS_ICONS[r.status] || Clock;
              return (
                <Card key={r.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {r.type === "copy_trading"
                          ? <Users className="h-4 w-4 text-blue-400" />
                          : <Activity className="h-4 w-4 text-purple-400" />}
                        <span className="font-medium text-sm">
                          {r.type === "copy_trading" ? "Copy Trading" : "Account Handling"}
                        </span>
                      </div>
                      <Badge className={`text-xs flex items-center gap-1 ${STATUS_COLORS[r.status] || "bg-gray-500/20 text-gray-400"}`}>
                        <StatusIcon className="h-3 w-3" />
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Your Share</p>
                        <p className="text-lg font-bold text-green-400">{100 - r.profitSharingPercent}%</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2 border border-white/5">
                        <p className="text-[10px] text-muted-foreground uppercase">Platform Share</p>
                        <p className="text-lg font-bold text-amber-400">{r.profitSharingPercent}%</p>
                      </div>
                    </div>

                    {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
                    {r.externalResponse && (
                      <div className="bg-white/5 rounded p-2">
                        <p className="text-xs text-muted-foreground">Response: {r.externalResponse}</p>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(r.createdAt).toLocaleDateString()}
                      {r.forwardedAt && ` · Forwarded ${new Date(r.forwardedAt).toLocaleDateString()}`}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
