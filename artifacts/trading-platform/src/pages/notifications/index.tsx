import * as ApiHooks from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bell, Check, Trash2, Info, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function NotificationsPage() {
  const useListNotifications = (ApiHooks as any).useListNotifications;
  const useMarkNotificationRead = (ApiHooks as any).useMarkNotificationRead;

  const { data: notifications, isLoading, refetch } = useListNotifications ? useListNotifications() : { data: [], isLoading: true, refetch: () => {} };
  const markReadMutation = useMarkNotificationRead ? useMarkNotificationRead() : { mutate: () => {} };
  const { toast } = useToast();

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id, {
      onSuccess: () => refetch()
    });
  };

  const handleMarkAllRead = () => {
    // For now we just loop through unread ones
    notifications?.filter((n: any) => !n.read).forEach((n: any) => {
      markReadMutation.mutate(n.id);
    });
    toast({ title: "All notifications marked as read" });
    refetch();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'info': return <Info className="h-5 w-5 text-blue-500" />;
      case 'success': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Bell className="h-5 w-5 text-amber-500" />;
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
      case 'success': return 'bg-green-500/10 border-green-500/20';
      case 'warning': return 'bg-amber-500/10 border-amber-500/20';
      case 'error': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-white/5 border-white/10';
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">Notifications</h1>
            <p className="text-muted-foreground">Stay updated with your account activity and platform alerts.</p>
          </div>
          <Button variant="outline" size="sm" className="border-amber-500/30 text-amber-500 hover:bg-amber-500/10" onClick={handleMarkAllRead}>
            <Check className="mr-2 h-4 w-4" /> Mark all as read
          </Button>
        </div>

        <Card className="bg-white/5 backdrop-blur-sm border-white/10 overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : notifications?.length ? (
              <div className="divide-y divide-white/5">
                {notifications.map((notif: any) => (
                  <div 
                    key={notif.id} 
                    className={`p-6 flex gap-4 transition-colors group relative ${notif.read ? 'opacity-60' : 'bg-white/[0.02]'}`}
                    onClick={() => !notif.read && handleMarkRead(notif.id)}
                  >
                    {!notif.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500" />
                    )}
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 border ${getColorClass(notif.type)}`}>
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-platinum-white' : 'text-amber-400'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 whitespace-nowrap ml-4">
                          <Clock className="h-3 w-3" /> {new Date(notif.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                        {notif.message}
                      </p>
                      {!notif.read && (
                        <div className="mt-3 flex gap-2">
                           <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 text-[10px] uppercase font-bold tracking-wider text-amber-500"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkRead(notif.id);
                            }}
                           >
                             Mark as read
                           </Button>
                        </div>
                      )}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                       </Button>
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
                <p className="text-muted-foreground max-w-xs mx-auto mt-2">We'll notify you here when there's activity on your account.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
