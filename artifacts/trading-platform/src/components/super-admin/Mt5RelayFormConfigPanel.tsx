import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { authFetchJson } from "@/lib/token-store";
import {
  DEFAULT_MT5_RELAY_FORM_CONFIG,
  mergeMt5RelayFormConfig,
  type Mt5RelayFieldKey,
  type Mt5RelayFormConfig,
} from "@/lib/mt5-relay-form-config";
import { Settings2, Save } from "lucide-react";
import { STAFF_FORM_GRID } from "@/lib/staff-dashboard-ui";
import { cn } from "@/lib/utils";

const FIELD_KEYS: Mt5RelayFieldKey[] = ["platform", "accountNumber", "brokerName", "serverName", "tradingPassword", "details"];

const FIELD_HINTS: Record<Mt5RelayFieldKey, string> = {
  platform: "MT4 / MT5 selector on the user request form",
  accountNumber: "Broker login / account number",
  brokerName: "Broker company name",
  serverName: "MT4/MT5 server name from the broker",
  tradingPassword: "MT4/MT5 trading password (stored encrypted — never shown in admin UI)",
  details: "Free-text notes from the user",
};

export function Mt5RelayFormConfigPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Mt5RelayFormConfig>(DEFAULT_MT5_RELAY_FORM_CONFIG);

  useEffect(() => {
    authFetchJson<Mt5RelayFormConfig>("/super-admin/settings/mt5-relay-form")
      .then(data => setConfig(mergeMt5RelayFormConfig(data)))
      .catch(() => setConfig(DEFAULT_MT5_RELAY_FORM_CONFIG))
      .finally(() => setLoading(false));
  }, []);

  function updateField(key: Mt5RelayFieldKey, patch: Partial<Mt5RelayFormConfig["fields"][Mt5RelayFieldKey]>) {
    setConfig(c => ({
      ...c,
      fields: {
        ...c.fields,
        [key]: { ...c.fields[key], ...patch },
      },
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const saved = await authFetchJson<Mt5RelayFormConfig>("/super-admin/settings/mt5-relay-form", {
        method: "POST",
        body: JSON.stringify(config),
      });
      setConfig(mergeMt5RelayFormConfig(saved));
      toast({ title: "Form fields saved", description: "User copy trading & account handling forms updated." });
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <Card className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          MT4/MT5 Request Form Fields
        </CardTitle>
        <CardDescription>
          Choose which fields appear on the Copy Trading and Account Handling request forms for investors.
          Toggle visibility, set required fields, and customize labels.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={save} className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Form fields</p>
            {FIELD_KEYS.map(key => {
              const field = config.fields[key];
              return (
                <div key={key} className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                      <p className="text-xs text-muted-foreground">{FIELD_HINTS[key]}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={field.enabled}
                          onCheckedChange={v => updateField(key, { enabled: v, required: v ? field.required : false })}
                        />
                        Show
                      </label>
                      <label className="flex items-center gap-2 text-xs">
                        <Switch
                          checked={field.required}
                          disabled={!field.enabled}
                          onCheckedChange={v => updateField(key, { required: v })}
                        />
                        Required
                      </label>
                    </div>
                  </div>
                  {field.enabled && (
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          value={field.label}
                          onChange={e => updateField(key, { label: e.target.value })}
                          className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9"
                        />
                      </div>
                      {key !== "platform" && (
                        <div className="space-y-1">
                          <Label className="text-xs">Placeholder</Label>
                          <Input
                            value={field.placeholder || ""}
                            onChange={e => updateField(key, { placeholder: e.target.value })}
                            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="rounded-lg border border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.02] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Profit sharing slider</p>
                <p className="text-xs text-muted-foreground">Percentage shared with Kuber Quant on profits</p>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={config.profitSharing.enabled}
                    onCheckedChange={v => setConfig(c => ({
                      ...c,
                      profitSharing: { ...c.profitSharing, enabled: v, required: v ? c.profitSharing.required : false },
                    }))}
                  />
                  Show
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <Switch
                    checked={config.profitSharing.required}
                    disabled={!config.profitSharing.enabled}
                    onCheckedChange={v => setConfig(c => ({ ...c, profitSharing: { ...c.profitSharing, required: v } }))}
                  />
                  Required
                </label>
              </div>
            </div>
            {config.profitSharing.enabled && (
              <div className={cn(STAFF_FORM_GRID, "sm:grid-cols-2 lg:grid-cols-4")}>
                <div className="space-y-1">
                  <Label className="text-xs">Min %</Label>
                  <Input type="number" value={config.profitSharing.min}
                    onChange={e => setConfig(c => ({ ...c, profitSharing: { ...c.profitSharing, min: Number(e.target.value) } }))}
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max %</Label>
                  <Input type="number" value={config.profitSharing.max}
                    onChange={e => setConfig(c => ({ ...c, profitSharing: { ...c.profitSharing, max: Number(e.target.value) } }))}
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default %</Label>
                  <Input type="number" value={config.profitSharing.default}
                    onChange={e => setConfig(c => ({ ...c, profitSharing: { ...c.profitSharing, default: Number(e.target.value) } }))}
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Step</Label>
                  <Input type="number" value={config.profitSharing.step}
                    onChange={e => setConfig(c => ({ ...c, profitSharing: { ...c.profitSharing, step: Number(e.target.value) } }))}
                    className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 h-9" />
                </div>
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Copy trading — details placeholder</Label>
              <Textarea
                value={config.copyTradingDetailsPlaceholder}
                onChange={e => setConfig(c => ({ ...c, copyTradingDetailsPlaceholder: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[72px]"
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Account handling — details placeholder</Label>
              <Textarea
                value={config.accountHandlingDetailsPlaceholder}
                onChange={e => setConfig(c => ({ ...c, accountHandlingDetailsPlaceholder: e.target.value }))}
                className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 min-h-[72px]"
                rows={2}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="bg-gradient-to-r from-amber-400 to-yellow-600 text-black font-semibold">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save form fields"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
