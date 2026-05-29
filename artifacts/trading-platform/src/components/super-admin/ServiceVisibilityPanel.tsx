import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown, Save, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { staffFetch } from "@/lib/staff-api";
import { SERVICE_CATALOG, type ServiceKey, type ServiceVisibilityItem } from "@/lib/service-catalog";
import { STAFF_CARD } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

export function ServiceVisibilityPanel() {
  const { toast } = useToast();
  const [items, setItems] = useState<ServiceVisibilityItem[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    try {
      const data = await staffFetch<{ services: ServiceVisibilityItem[] }>("/admin/service-visibility");
      setItems(data.services);
      setDirty(false);
    } catch (e: any) {
      toast({ title: "Failed to load services", description: e.message, variant: "destructive" });
    }
  };
  useEffect(() => { load(); }, []);

  const move = (index: number, dir: -1 | 1) => {
    setItems(prev => {
      if (!prev) return prev;
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setDirty(true);
  };

  const toggle = (key: ServiceKey, enabled: boolean) => {
    setItems(prev => prev?.map(it => (it.key === key ? { ...it, enabled } : it)) ?? prev);
    setDirty(true);
  };

  const save = async () => {
    if (!items) return;
    setSaving(true);
    try {
      const data = await staffFetch<{ services: ServiceVisibilityItem[] }>("/admin/service-visibility", {
        method: "PATCH",
        body: JSON.stringify({ services: items }),
      });
      setItems(data.services);
      setDirty(false);
      toast({ title: "Service visibility saved", description: "Changes are now live for users and the homepage." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!items) return <Skeleton className="h-64 w-full" />;

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
          <Button size="sm" onClick={save} disabled={!dirty || saving} className="shrink-0">
            <Save className="h-4 w-4 mr-1.5" /> {saving ? "Saving…" : "Save changes"}
          </Button>
        </div>

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
      </CardContent>
    </Card>
  );
}
