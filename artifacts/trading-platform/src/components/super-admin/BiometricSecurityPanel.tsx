import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Fingerprint, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetchJson } from "@/lib/token-store";

type LogRow = {
  id: number;
  userId: number | null;
  eventType: string;
  success: boolean;
  failReason: string | null;
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
};

export function BiometricSecurityPanel() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const rows = await authFetchJson<LogRow[]>("/auth/webauthn/admin/logs?limit=200");
      setLogs(rows);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const failed = logs.filter(l => !l.success).length;
  const registrations = logs.filter(l => l.eventType === "register" && l.success).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Events</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{logs.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Failed Attempts</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-red-500">{failed}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Registrations</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{registrations}</p></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Biometric Login Monitor
              </CardTitle>
              <CardDescription>Passkey registrations, logins, 2FA, and failed authentications.</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No biometric events yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">Time</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Event</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">IP</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-border/50">
                      <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                      <td className="py-2 pr-3">{l.userId ?? "—"}</td>
                      <td className="py-2 pr-3">{l.eventType}</td>
                      <td className="py-2 pr-3">{l.deviceLabel || "—"}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{l.ipAddress || "—"}</td>
                      <td className="py-2">
                        <Badge variant={l.success ? "default" : "destructive"}>
                          {l.success ? "OK" : l.failReason || "Failed"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
