import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useStaffReports } from "@/lib/staff-api";

export function StaffEscalationsPanel({ role }: { role: "support" | "manager" }) {
  const { data: reports, isLoading } = useStaffReports(role);

  return (
    <Card className="border-border dark:border-white/10 bg-muted/60 dark:bg-white/5">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          Reports to Super Admin
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-20 w-full" />
        ) : !reports?.length ? (
          <p className="text-sm text-muted-foreground">
            No escalations yet. Use &quot;Report to Super Admin&quot; from user lookup or client details when you need account changes.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {reports.slice(0, 8).map((t: any) => (
              <div key={t.id} className="flex justify-between gap-2 p-2 rounded-lg border border-border dark:border-white/10 text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">#{t.id} — {t.subject}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {t.userName || t.userEmail} · {format(new Date(t.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize shrink-0">{t.status.replace("_", " ")}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
