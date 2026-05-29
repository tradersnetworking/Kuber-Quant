import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { authFetchJson, getStoredToken, apiPath } from "@/lib/token-store";
import { registerServiceWorker } from "@/lib/push-notifications";
import { invalidateFinanceQueries, isFinanceNotification } from "@/lib/invalidate-finance-queries";
import { resolveActionUrl } from "@/lib/action-url";
import { isRateLimitedError, NOTIFICATION_POLL_MS } from "@/lib/query-config";

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
  const backoffRef = useRef(NOTIFICATION_POLL_MS);

  const showNotification = useCallback((n: Notif) => {
    toast({
      title: n.title,
      description: (
        <div className="space-y-2">
          <p>{n.message}</p>
          {n.actionUrl && (
            <Link href={resolveActionUrl(user?.role as string ?? "user", n.actionUrl)}>
              <Button size="sm" variant="secondary" className="h-7 text-xs">
                View details
              </Button>
            </Link>
          )}
        </div>
      ),
      variant: n.type === "error" ? "destructive" : "default",
    });
    if (isFinanceNotification(n.category, n.title)) {
      invalidateFinanceQueries(qc);
    }
    qc.invalidateQueries({ queryKey: ["/api/notifications"] });
  }, [toast, qc]);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!user || !token) {
      lastIdRef.current = 0;
      initializedRef.current = false;
      backoffRef.current = NOTIFICATION_POLL_MS;
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    let eventSource: EventSource | null = null;

    const initBaseline = async () => {
      try {
        const all = await authFetchJson<Notif[]>("/notifications?limit=1");
        if (all[0]) lastIdRef.current = all[0].id;
        initializedRef.current = true;
        qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      } catch { /* non-fatal */ }
    };

    const handleNotifPayload = (raw: Notif) => {
      if (raw.id <= lastIdRef.current) return;
      lastIdRef.current = Math.max(lastIdRef.current, raw.id);
      showNotification(raw);
    };

    const connectSse = () => {
      const accessToken = getStoredToken();
      if (!accessToken || cancelled) return;

      const url = apiPath(`/notifications/stream?access_token=${encodeURIComponent(accessToken)}`);
      eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        if (cancelled || !event.data) return;
        try {
          const payload = JSON.parse(event.data) as { type?: string; notification?: Notif };
          if (payload.type === "notification" && payload.notification) {
            handleNotifPayload(payload.notification);
          }
        } catch { /* ignore malformed */ }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (!cancelled) startPolling();
      };
    };

    const schedule = (delayMs: number) => {
      if (cancelled) return;
      timer = window.setTimeout(poll, delayMs);
    };

    const poll = async () => {
      if (cancelled || document.hidden) {
        schedule(backoffRef.current);
        return;
      }

      try {
        if (!initializedRef.current) {
          await initBaseline();
          backoffRef.current = NOTIFICATION_POLL_MS;
          schedule(NOTIFICATION_POLL_MS);
          return;
        }

        const since = lastIdRef.current;
        const data = await authFetchJson<{ notifications: Notif[]; latestId: number }>(`/notifications/since/${since}`);

        if (data?.notifications?.length) {
          for (const n of data.notifications) {
            handleNotifPayload(n);
          }
        }
        if (data?.latestId) lastIdRef.current = Math.max(lastIdRef.current, data.latestId);
        backoffRef.current = NOTIFICATION_POLL_MS;
      } catch (err) {
        if (isRateLimitedError(err)) {
          backoffRef.current = Math.min(backoffRef.current * 2, 600_000);
        }
      }

      schedule(backoffRef.current);
    };

    const startPolling = () => {
      if (cancelled || timer) return;
      void initBaseline().then(() => poll());
    };

    void initBaseline().then(() => {
      if (!cancelled) connectSse();
    });

    const onVisibility = () => {
      if (!document.hidden && !cancelled && !eventSource) {
        window.clearTimeout(timer);
        timer = undefined;
        schedule(500);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      eventSource?.close();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, token, showNotification, qc]);

  return <>{children}</>;
}
