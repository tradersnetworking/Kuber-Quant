import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowUp, ArrowDown, Save, Eye, EyeOff, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_SERVICE_VISIBILITY,
  SERVICE_CATALOG,
  type ServiceKey,
  type ServiceVisibilityItem,
} from "@/lib/service-catalog";
import { loadServiceVisibilityAdmin, saveServiceVisibilityAdmin } from "@/lib/service-visibility-admin";
import { STAFF_CARD } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

export function ServiceVisibilityPanel() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [items, setItems] = useState<ServiceVisibilityItem[]>(DEFAULT_SERVICE_VISIBILITY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const services = await loadServiceVisibilityAdmin();
      setItems(services);
      setDirty(false);
    } catch (e: any) {
      setItems(DEFAULT_SERVICE_VISIBILITY);
      setError(e?.message || "Could not load saved settings — showing defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const move = (index: number, dir: -1 | 1) => {
    setItems(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
    setSuccess(null);
  };

  const toggle = (key: ServiceKey, enabled: boolean) => {
    setItems(prev => prev.map(it => (it.key === key ? { ...it, enabled } : it)));
    setDirty(true);
    setSuccess(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await saveServiceVisibilityAdmin(items);
      setItems(saved);
      setDirty(false);
      setSuccess("Changes saved. Homepage and investor menus will update shortly.");
      void qc.invalidateQueries({ queryKey: ["/api/service-visibility"] });
      toast({ title: "Service visibility saved", description: "Changes are now live for users and the homepage." });
    } catch (e: any) {
      const msg = e?.message || "Save failed. Restart the API server and try again.";
      setError(msg);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={cn(STAFF_CARD, "min-w-0")}>
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Services shown to investors</h3>
            <p className="text-xs text-muted-foreground">
              Toggle each service on or off, and reorder how they appear on the home page and in the menu.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading || saving} aria-label="Refresh">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={() => void save()} disabled={!dirty || saving || loading}>
              <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="py-2 border-emerald-500/30 bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <AlertDescription className="text-xs text-emerald-800 dark:text-emerald-200">{success}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading services…
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item, index) => {
              const meta = SERVICE_CATALOG[item.key];
              return (
                <li
                  key={item.key}
                  className="flex items-center gap-3 rounded-xl border border-border dark:border-white/10 p-3 bg-muted/40 dark:bg-white/[0.02]"
                >
                  <span className="text-xs font-mono text-muted-foreground w-6 text-center shrink-0">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{meta?.label ?? item.key}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      {item.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {item.enabled ? "Visible to users" : "Hidden from users"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Move up">
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Move down">
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Switch checked={item.enabled} onCheckedChange={v => toggle(item.key, v)} />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
