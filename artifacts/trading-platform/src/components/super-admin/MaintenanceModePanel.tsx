import { useEffect, useMemo, useState } from "react";
import { useGetSiteSettings, useUpdateSiteSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Construction, Eye } from "lucide-react";
import { mergeSiteSettings, MAINTENANCE_SETTING_KEYS } from "@/lib/site-settings-defaults";
import { invalidateMaintenanceCache } from "@/hooks/use-maintenance-mode";
import { MaintenancePage } from "@/pages/maintenance";
import type { MaintenanceConfig } from "@/hooks/use-maintenance-mode";
import { useSiteBranding } from "@/hooks/use-site-branding";

export function MaintenanceModePanel() {
  const { data: apiSettings, refetch } = useGetSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const { toast } = useToast();
  const liveBranding = useSiteBranding();

  const settings = useMemo(() => mergeSiteSettings(apiSettings), [apiSettings]);
  const maintenanceDefaults = useMemo(() => {
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      if (MAINTENANCE_SETTING_KEYS.has(s.key)) map[s.key] = s.value ?? "";
    });
    return map;
  }, [settings]);

  const [enabled, setEnabled] = useState(false);
  const [description, setDescription] = useState("");
  const [notice, setNotice] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    setEnabled(maintenanceDefaults.maintenance_mode === "true");
    setDescription(maintenanceDefaults.maintenance_description || "");
    setNotice(maintenanceDefaults.maintenance_notice || "");
  }, [maintenanceDefaults]);

  const previewConfig: MaintenanceConfig = {
    enabled: true,
    description: description.trim() || "We are performing scheduled maintenance to improve your experience.",
    notice: notice.trim() || "Please check back soon. Thank you for your patience.",
    supportEmail: settings.find((s) => s.key === "support_email")?.value || "",
    branding: {
      titleGold: liveBranding.titleGold,
      titleSilver: liveBranding.titleSilver,
      titleGoldColor: liveBranding.titleGoldColor,
      titleSilverColor: liveBranding.titleSilverColor,
      siteName: liveBranding.siteName,
      logoUrl: liveBranding.logoUrl,
    },
  };

  const handleSave = () => {
    updateMutation.mutate(
      {
        data: {
          maintenance_mode: String(enabled),
          maintenance_description: description,
          maintenance_notice: notice,
        } as Record<string, string>,
      },
      {
        onSuccess: () => {
          invalidateMaintenanceCache();
          refetch();
          toast({
            title: enabled ? "Maintenance mode enabled" : "Maintenance mode disabled",
            description: enabled
              ? "Visitors will see the maintenance page. Super Admin access is unaffected."
              : "The site is live for all users.",
          });
        },
        onError: () => {
          toast({ title: "Failed to save maintenance settings", variant: "destructive" });
        },
      },
    );
  };

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Maintenance Page Preview</h2>
            <p className="text-sm text-muted-foreground">This is what users see when maintenance mode is on.</p>
          </div>
          <Button variant="outline" onClick={() => setShowPreview(false)}>Back to settings</Button>
        </div>
        <div className="rounded-xl border border-border overflow-hidden min-h-[520px]">
          <MaintenancePage config={previewConfig} />
        </div>
      </div>
    );
  }

  return (
    <Card className={`border ${enabled ? "border-amber-500/40 bg-amber-500/5" : "border-border"}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Construction className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Maintenance Mode
            </CardTitle>
            <CardDescription>
              When enabled, all users except Super Admin see a full-screen maintenance page with your custom message.
            </CardDescription>
          </div>
          <Badge className={enabled ? "bg-amber-500 text-black" : "bg-muted text-muted-foreground"}>
            {enabled ? "ON — Site locked" : "OFF — Site live"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 dark:bg-white/[0.03] px-4 py-3">
          <div>
            <p className="text-sm font-medium">Enable maintenance mode</p>
            <p className="text-xs text-muted-foreground">Blocks public access and shows the maintenance screen</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maintenance-description">Description</Label>
          <Textarea
            id="maintenance-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Explain why the site is down..."
            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 resize-y min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">Main message displayed below the logo and site title.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maintenance-notice">Notice for users</Label>
          <Textarea
            id="maintenance-notice"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            rows={3}
            placeholder="Expected return time, apology, or instructions..."
            className="bg-muted/60 dark:bg-white/5 border-border dark:border-white/10 resize-y min-h-[80px]"
          />
          <p className="text-xs text-muted-foreground">Highlighted notice box shown to all visitors.</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save maintenance settings"}
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
