import { useEffect, useState } from "react";
import { authFetchJson } from "@/lib/token-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, User } from "lucide-react";

type Application = {
  id: number;
  applicantEmail: string;
  fullName: string;
  status: string;
  data: Record<string, unknown>;
  reviewNotes?: string | null;
  createdAt: string;
};

export function ManagerApplicationsPanel() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    try {
      const data = await authFetchJson<Application[]>("/onboarding/manager/applications");
      setApps(data);
    } catch (e: any) {
      toast.error(e.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function review(id: number, action: "approve" | "reject") {
    try {
      await authFetchJson(`/onboarding/manager/applications/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ action, reviewNotes: notes[id] || "" }),
      });
      toast.success(action === "approve" ? "Manager approved" : "Application rejected");
      load();
    } catch (e: any) {
      toast.error(e.message || "Review failed");
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm p-4">Loading applications…</p>;

  const pending = apps.filter(a => a.status === "pending");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><User className="h-4 w-4" /> Manager Applications</h3>
        <Badge variant="outline">{pending.length} pending</Badge>
      </div>
      {apps.length === 0 ? (
        <p className="text-sm text-muted-foreground">No manager applications yet.</p>
      ) : (
        apps.map(app => (
          <Card key={app.id} className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{app.fullName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{app.applicantEmail}</p>
                </div>
                <Badge className={
                  app.status === "pending" ? "bg-yellow-500/10 text-yellow-600" :
                  app.status === "approved" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                }>
                  {app.status === "pending" && <Clock className="h-3 w-3 mr-1 inline" />}
                  {app.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <span>Experience: {(app.data as any).yearsExperience || "—"}</span>
                <span>Region: {(app.data as any).assignedRegion || "—"}</span>
                <span>Specialization: {(app.data as any).specialization || "—"}</span>
                <span>Submitted: {new Date(app.createdAt).toLocaleDateString()}</span>
              </div>
              {app.status === "pending" && (
                <>
                  <Textarea placeholder="Review notes (optional)" value={notes[app.id] || ""} onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))} rows={2} />
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-1" onClick={() => review(app.id, "approve")}>
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => review(app.id, "reject")}>
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
