import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { InstallAndroidAppBanner } from "@/components/notifications/InstallAndroidAppBanner";
import { subscribeToPush } from "@/lib/push-notifications";
import { useAuth } from "@/hooks/use-auth";

type Notif = {
  id: number;
  title: string;
  message: string;
  type: string;
  category?: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
};

const CATEGORIES = ["all", "deposit", "withdrawal", "service", "kyc", "investment", "support", "system", "security"];

export default function NotificationsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [category, setCategory] = useState("all");

  const { data: notifications, isLoading, refetch } = useQuery({
    queryKey: ["/api/notifications", category],
    queryFn: () => authFetchJson<Notif[]>(`/notifications?limit=100&category=${category}`),
  });

  const handleMarkRead = async (id: number) => {
    await authFetchJson(`/notifications/${id}/read`, { method: "POST" });
    refetch();
  };

  const handleMarkAllRead = async () => {
    await authFetchJson("/notifications/read-all", { method: "POST" });
    toast({ title: "All notifications marked as read" });
    refetch();
  };

  const enablePush = async () => {
    if (!token) return;
    const ok = await subscribeToPush(token);
    toast({
      title: ok ? "Pop alerts enabled" : "Permission denied",
      description: ok ? "You'll receive deposit, withdrawal & service push notifications." : "Allow notifications in browser settings.",
      variant: ok ? "default" : "destructive",
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "info": return <Info className="h-5 w-5 text-blue-500" />;
      case "success": return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case "error": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Bell className="h-5 w-5 text-amber-500" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case "info": return "bg-blue-500/10 border-blue-500/20";
      case "success": return "bg-green-500/10 border-green-500/20";
      case "warning": return "bg-amber-500/10 border-amber-500/20";
      case "error": return "bg-red-500/10 border-red-500/20";
      default: return "bg-white/5 border-white/10";
    }
  };

  const unread = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-muted-foreground">Deposits, withdrawals, services, and platform alerts.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="border-white/10" onClick={enablePush}>
            <Bell className="mr-2 h-4 w-4" /> Enable Pop Alerts
          </Button>
          <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500" onClick={handleMarkAllRead}>
            <Check className="mr-2 h-4 w-4" /> Mark all read
          </Button>
        </div>
      </div>

      <InstallAndroidAppBanner />

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44 bg-white/5 border-white/10"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c === "all" ? "All categories" : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unread > 0 && <Badge className="bg-amber-500/20 text-amber-400">{unread} unread</Badge>}
      </div>

      <Card className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
            </div>
          ) : notifications?.length ? (
            <div className="divide-y divide-white/5">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={`p-6 flex gap-4 transition-colors group relative cursor-pointer ${notif.isRead ? "opacity-60" : "bg-white/[0.02]"}`}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                >
                  {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />}
                  <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border ${getColorClass(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1 gap-2 flex-wrap">
                      <h4 className={`text-sm font-bold ${notif.isRead ? "text-platinum-white" : "text-amber-400"}`}>
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        {notif.category && (
                          <Badge variant="outline" className="text-[10px] capitalize">{notif.category}</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                          <Clock className="h-3 w-3" /> {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{notif.message}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                <Bell className="h-10 w-10 text-muted-foreground/20" />
              </div>
              <h3 className="text-xl font-bold">No notifications yet</h3>
              <p className="text-muted-foreground max-w-xs mx-auto mt-2">Deposit, withdrawal, and service updates will appear here and as pop alerts.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
