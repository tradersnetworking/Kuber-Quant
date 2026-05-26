import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import { registerServiceWorker } from "@/lib/push-notifications";
import { invalidateFinanceQueries, isFinanceNotification } from "@/lib/invalidate-finance-queries";

type Notif = {
  id: number;
  title: string;
  message: string;
  type: string;
  category?: string;
  actionUrl?: string | null;
};

export function NotificationPopProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const lastIdRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!user || !token) {
      lastIdRef.current = 0;
      initializedRef.current = false;
      return;
    }

    const poll = async () => {
      try {
        const since = lastIdRef.current;
        const data = since > 0
          ? await authFetchJson<{ notifications: Notif[]; latestId: number }>(`/notifications/since/${since}`)
          : null;

        if (!initializedRef.current) {
          const all = await authFetchJson<Notif[]>("/notifications?limit=1");
          if (all[0]) lastIdRef.current = all[0].id;
          initializedRef.current = true;
          return;
        }

        if (data?.notifications?.length) {
          for (const n of data.notifications) {
            toast({
              title: n.title,
              description: n.message,
              variant: n.type === "error" ? "destructive" : "default",
            });
          }
          if (data.notifications.some(n => isFinanceNotification(n.category, n.title))) {
            invalidateFinanceQueries(qc);
          }
          qc.invalidateQueries({ queryKey: ["/api/notifications"] });
        }
        if (data?.latestId) lastIdRef.current = Math.max(lastIdRef.current, data.latestId);
      } catch { /* ignore poll errors */ }
    };

    poll();
    const id = window.setInterval(poll, 15000);
    return () => window.clearInterval(id);
  }, [user, token, toast, qc]);

  return <>{children}</>;
}
