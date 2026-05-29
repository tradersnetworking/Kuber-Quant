import { useEffect, useMemo, useState } from "react";
import { useGetSiteSettings, useUpdateSiteSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { mergeSiteSettings, SECURITY_SETTING_KEYS } from "@/lib/site-settings-defaults";
import { invalidateScreenshotProtectionCache } from "@/hooks/use-screenshot-protection";

function OnOffButtons({
  value,
  onChange,
  disabled,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border overflow-hidden shrink-0">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        className={cn(
          "rounded-none h-8 min-w-[3rem] px-3 text-xs font-bold",
          value && "bg-emerald-600 text-white hover:bg-emerald-600 hover:text-white",
        )}
        onClick={() => onChange(true)}
      >
        ON
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={disabled}
        className={cn(
          "rounded-none h-8 min-w-[3rem] px-3 text-xs font-bold border-l border-border",
          !value && "bg-muted text-foreground hover:bg-muted",
        )}
        onClick={() => onChange(false)}
      >
        OFF
      </Button>
    </div>
  );
}

export function ScreenshotProtectionPanel() {
  const { data: apiSettings, refetch } = useGetSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const { toast } = useToast();

  const settings = useMemo(() => mergeSiteSettings(apiSettings), [apiSettings]);
  const defaults = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      if (SECURITY_SETTING_KEYS.has(s.key)) map[s.key] = s.value ?? "";
    });
    return map;
  }, [settings]);

  const [enabled, setEnabled] = useState(true);
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState("0.03");

  useEffect(() => {
    setEnabled(defaults.screenshot_protection_enabled !== "false");
    setWatermarkEnabled(defaults.screenshot_watermark_enabled !== "false");
    setWatermarkOpacity(defaults.screenshot_watermark_opacity || "0.03");
  }, [defaults]);

  const persist = (next: {
    enabled?: boolean;
    watermarkEnabled?: boolean;
    watermarkOpacity?: string;
  }) => {
    const protectionOn = next.enabled ?? enabled;
    const watermarkOn = next.watermarkEnabled ?? watermarkEnabled;
    const opacity = next.watermarkOpacity ?? watermarkOpacity;

    updateMutation.mutate(
      {
        data: {
          screenshot_protection_enabled: String(protectionOn),
          screenshot_watermark_enabled: String(watermarkOn),
          screenshot_watermark_opacity: opacity,
        } as Record<string, string>,
      },
      {
        onSuccess: () => {
          invalidateScreenshotProtectionCache();
          refetch();
          toast({ title: "Security settings updated" });
        },
        onError: () => {
          toast({ title: "Failed to save security settings", variant: "destructive" });
        },
      },
    );
  };

  const setProtection = (next: boolean) => {
    setEnabled(next);
    persist({ enabled: next });
  };

  const setWatermark = (next: boolean) => {
    setWatermarkEnabled(next);
    persist({ watermarkEnabled: next });
  };

  const saveOpacity = () => {
    const parsed = parseFloat(watermarkOpacity);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 0.15) {
      toast({
        title: "Invalid opacity",
        description: "Use a value between 0.02 and 0.15 (lower = more transparent).",
        variant: "destructive",
      });
      return;
    }
    persist({ watermarkOpacity: String(parsed) });
  };

  return (
    <Card className={`border ${enabled ? "border-emerald-500/35 bg-emerald-500/5" : "border-border"}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Screenshot & Screen Capture Protection
            </CardTitle>
            <CardDescription>
              ON/OFF controls apply instantly for all users except Super Admin (exempt from watermark and restrictions).
              Watermark opacity controls how visible the trace overlay is.
            </CardDescription>
          </div>
          <Badge className={enabled ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"}>
            {enabled ? "Protected" : "Off"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 dark:bg-white/[0.03] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Screenshot prevention</p>
            <p className="text-xs text-muted-foreground">Blocks copy, print, and capture shortcuts</p>
          </div>
          <OnOffButtons value={enabled} onChange={setProtection} disabled={updateMutation.isPending} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 dark:bg-white/[0.03] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">Watermark overlay</p>
            <p className="text-xs text-muted-foreground">User email / ID trace pattern on screen</p>
          </div>
          <OnOffButtons
            value={watermarkEnabled}
            onChange={setWatermark}
            disabled={!enabled || updateMutation.isPending}
          />
        </div>

        <div className="rounded-lg border border-border bg-muted/40 dark:bg-white/[0.03] px-4 py-3 space-y-2">
          <Label htmlFor="watermark-opacity" className="text-sm font-medium">
            Watermark transparency
          </Label>
          <p className="text-xs text-muted-foreground">
            Lower value = more transparent watermark (default 0.03). Range: 0.02 – 0.15
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              id="watermark-opacity"
              type="number"
              step="0.01"
              min="0.02"
              max="0.15"
              value={watermarkOpacity}
              onChange={(e) => setWatermarkOpacity(e.target.value)}
              disabled={!enabled || !watermarkEnabled || updateMutation.isPending}
              className="h-9 w-28 bg-muted/60 dark:bg-white/5 border-border dark:border-white/10"
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={saveOpacity}
              disabled={!enabled || !watermarkEnabled || updateMutation.isPending}
            >
              Apply
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
