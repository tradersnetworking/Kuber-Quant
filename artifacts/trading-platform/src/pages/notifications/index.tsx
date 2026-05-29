import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { cn } from "@/lib/utils";
import { Bell, Check, Info, AlertTriangle, CheckCircle2, XCircle, Clock, ExternalLink } from "lucide-react";
import { InstallAndroidAppBanner } from "@/components/notifications/InstallAndroidAppBanner";
import { subscribeToPush } from "@/lib/push-notifications";
import { useAuth } from "@/hooks/use-auth";
import { resolveActionUrl } from "@/lib/action-url";

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

const CATEGORY_LABELS: Record<string, string> = {
  all: "All categories",
  deposit: "Deposits",
  withdrawal: "Withdrawals",
  service: "Services",
  kyc: "KYC",
  investment: "Investments",
  support: "Support",
  system: "System",
  security: "Security",
};

function formatNotifTime(date: string) {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getIcon(type: string) {
  switch (type) {
    case "info": return <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
    case "success": return <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
    case "warning": return <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />;
    case "error": return <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />;
    default: return <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />;
  }
}

function getColorClass(type: string) {
  switch (type) {
    case "info": return "bg-blue-500/10 border-blue-500/20";
    case "success": return "bg-green-500/10 border-green-500/20";
    case "warning": return "bg-amber-500/10 border-amber-500/20";
    case "error": return "bg-red-500/10 border-red-500/20";
    default: return "bg-muted/60 dark:bg-white/5 border-border dark:border-white/10";
  }
}

function NotificationItem({ notif, onMarkRead }: { notif: Notif; onMarkRead: (id: number) => void }) {
  const { user } = useAuth();
  const actionHref = notif.actionUrl && user
    ? resolveActionUrl(user.role as string, notif.actionUrl)
    : notif.actionUrl;
  const content = (
    <>
      {!notif.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r" />}
      <div className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-full flex items-center justify-center shrink-0 border", getColorClass(notif.type))}>
        {getIcon(notif.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h4
            className={cn(
              "text-sm font-semibold break-words leading-snug",
              notif.isRead ? "text-foreground" : "text-amber-600 dark:text-amber-400",
            )}
          >
            {notif.title}
          </h4>
          <div className="flex items-center gap-1.5 flex-wrap">
            {notif.category && (
              <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                {notif.category}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
              <Clock className="h-3 w-3 shrink-0" />
              <span className="sm:hidden">{formatNotifTime(notif.createdAt)}</span>
              <span className="hidden sm:inline">{new Date(notif.createdAt).toLocaleString()}</span>
            </span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-2 break-words">
          {notif.message}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {!notif.isRead && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onMarkRead(notif.id);
              }}
            >
              <Check className="h-3 w-3 mr-1 shrink-0" />
              Mark read
            </Button>
          )}
          {actionHref && (
            <Link href={actionHref}>
              <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs border-border dark:border-white/10">
                <ExternalLink className="h-3 w-3 mr-1 shrink-0" />
                View
              </Button>
            </Link>
          )}
        </div>
      </div>
    </>
  );

  const className = cn(
    "relative flex gap-3 sm:gap-4 p-3 sm:p-4 md:p-5 transition-colors min-w-0",
    !notif.isRead && "bg-muted/40 dark:bg-white/[0.02]",
    notif.isRead && "opacity-75",
  );

  if (actionHref && notif.isRead) {
    return (
      <Link href={actionHref} className={cn(className, "block hover:bg-muted/60 dark:hover:bg-white/[0.04]")}>
        {content}
      </Link>
    );
  }

  return (
    <div
      className={cn(className, !notif.isRead && "cursor-pointer hover:bg-muted/50 dark:hover:bg-white/[0.04]")}
      onClick={() => !notif.isRead && onMarkRead(notif.id)}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !notif.isRead) {
          e.preventDefault();
          onMarkRead(notif.id);
        }
      }}
      role={!notif.isRead ? "button" : undefined}
      tabIndex={!notif.isRead ? 0 : undefined}
    >
      {content}
    </div>
  );
}

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

  const unread = notifications?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="page-stack max-w-4xl mx-auto min-w-0">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="min-w-0">
          <h1 className="page-title bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="page-subtitle">Deposits, withdrawals, services, and platform alerts.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto sm:max-w-md">
          <Button
            variant="outline"
            size="sm"
            className="w-full border-border dark:border-white/10 justify-center"
            onClick={enablePush}
          >
            <Bell className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Enable Pop Alerts</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full border-amber-500/30 text-amber-600 dark:text-amber-400 justify-center"
            onClick={handleMarkAllRead}
            disabled={unread === 0}
          >
            <Check className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">Mark all read</span>
          </Button>
        </div>
      </div>

      <InstallAndroidAppBanner />

      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c] ?? c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {unread > 0 && (
          <Badge className="w-fit bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            {unread} unread
          </Badge>
        )}
      </div>

      <Card className="bg-muted/60 dark:bg-white/5 backdrop-blur-sm border-border dark:border-white/10 overflow-hidden min-w-0">
        <CardContent className="p-0 min-w-0">
          {isLoading ? (
            <div className="p-3 sm:p-6 space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 sm:h-20 w-full rounded-xl" />)}
            </div>
          ) : notifications?.length ? (
            <div className="divide-y divide-border/80 dark:divide-white/5">
              {notifications.map(notif => (
                <NotificationItem key={notif.id} notif={notif} onMarkRead={handleMarkRead} />
              ))}
            </div>
          ) : (
            <div className="py-16 sm:py-24 px-4 text-center min-w-0">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-muted/60 dark:bg-white/5 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <Bell className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold">No notifications yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mt-2 leading-relaxed">
                Deposit, withdrawal, and service updates will appear here and as pop alerts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
