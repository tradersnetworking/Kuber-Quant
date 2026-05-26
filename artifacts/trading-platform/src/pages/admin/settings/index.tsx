import { useState, useEffect, useMemo } from "react";
import { useGetSiteSettings, useUpdateSiteSettings, SiteSetting } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Globe, DollarSign, Phone, Palette, Settings, Upload, ImageIcon, AlertCircle, RefreshCw, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { BOOL_SETTING_KEYS, mergeSiteSettings } from "@/lib/site-settings-defaults";
import { BrandTitle } from "@/components/brand/BrandTitle";
import { invalidateSiteBrandingCache } from "@/hooks/use-site-branding";
import { GoogleOAuthPreview } from "@/components/admin/GoogleOAuthPreview";

const CATEGORIES = [
  { key: "general", label: "General", icon: Globe },
  { key: "authentication", label: "Authentication", icon: Shield },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "appearance", label: "Appearance", icon: Palette },
];

export function SiteSettingsContent() {
  const { data: apiSettings, isLoading, isError, error, refetch } = useGetSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const { toast } = useToast();
  const { token } = useAuth();

  const settings = useMemo(() => mergeSiteSettings(apiSettings), [apiSettings]);

  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  useEffect(() => {
    const map: Record<string, string> = {};
    settings.forEach((s: SiteSetting) => { map[s.key] = s.value ?? ""; });
    setValues(map);
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = (category: string) => {
    const categoryKeys = settings.filter((s: SiteSetting) => s.category === category).map((s: SiteSetting) => s.key);
    const updates: Record<string, string> = {};
    categoryKeys.forEach(k => { if (values[k] !== undefined) updates[k] = values[k]; });
    if (category === "appearance") {
      updates.site_name = `${values.site_title_gold || "Kuber"} ${values.site_title_silver || "Quant"}`.trim();
    }

    updateMutation.mutate({ data: updates as any }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
        if (category === "appearance") {
          invalidateSiteBrandingCache();
        }
        setDirty(prev => {
          const next = new Set(prev);
          categoryKeys.forEach(k => next.delete(k));
          return next;
        });
        refetch();
      },
      onError: () => {
        toast({ title: "Failed to save settings", variant: "destructive" });
      },
    });
  };

  const byCategory = (cat: string) => settings.filter((s: SiteSetting) => s.category === cat);

  const handleImageUpload = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingKey(key);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload/branding", {
        method: "POST",
        headers: { Authorization: `Bearer ${token || localStorage.getItem("token") || ""}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      handleChange(key, data.url);
      toast({ title: "Image uploaded", description: "Click Save Changes to apply." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingKey(null);
      e.target.value = "";
    }
  };

  const renderField = (setting: SiteSetting) => {
    const isBool = BOOL_SETTING_KEYS.has(setting.key);
    const isColor = setting.key.includes("color");
    const isImage = setting.key === "logo_url" || setting.key === "favicon_url";
    const isTitlePart = setting.key === "site_title_gold" || setting.key === "site_title_silver";

    if (isImage) {
      return (
        <div className="space-y-3">
          {values[setting.key] && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-white/10">
              <img src={values[setting.key]} alt={setting.label} className="h-14 w-14 object-contain rounded bg-white/10 p-1" />
              <Button type="button" variant="ghost" size="sm" className="text-red-400"
                onClick={() => handleChange(setting.key, "")}>Remove</Button>
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <Label htmlFor={`upload-${setting.key}`} className="cursor-pointer">
              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 text-sm">
                <Upload className="h-4 w-4" />
                {uploadingKey === setting.key ? "Uploading..." : "Upload Image"}
              </span>
              <input id={`upload-${setting.key}`} type="file" accept="image/png,image/jpeg,image/webp,image/x-icon"
                className="hidden" onChange={e => handleImageUpload(setting.key, e)} disabled={uploadingKey === setting.key} />
            </Label>
          </div>
          <div className="relative">
            <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={values[setting.key] || ""} onChange={e => handleChange(setting.key, e.target.value)}
              placeholder="Or paste image URL" className="bg-white/5 border-white/10 focus:border-amber-500 pl-10" />
          </div>
        </div>
      );
    }

    if (isBool) {
      return (
        <div className="flex items-center gap-3">
          <Switch
            checked={values[setting.key] === "true"}
            onCheckedChange={v => handleChange(setting.key, String(v))}
          />
          <span className="text-sm text-muted-foreground">
            {values[setting.key] === "true" ? "Enabled" : "Disabled"}
          </span>
        </div>
      );
    }

    if (isColor) {
      return (
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={values[setting.key] || "#D4AF37"}
            onChange={e => handleChange(setting.key, e.target.value)}
            className="h-10 w-16 rounded cursor-pointer border border-white/10 bg-transparent"
          />
          <Input
            value={values[setting.key] || ""}
            onChange={e => handleChange(setting.key, e.target.value)}
            placeholder="#D4AF37"
            className="bg-white/5 border-white/10 focus:border-amber-500 font-mono w-32"
          />
        </div>
      );
    }

    return (
      <Input
        value={values[setting.key] || ""}
        onChange={e => {
          handleChange(setting.key, e.target.value);
          if (isTitlePart) {
            const gold = setting.key === "site_title_gold" ? e.target.value : (values.site_title_gold || "Kuber");
            const silver = setting.key === "site_title_silver" ? e.target.value : (values.site_title_silver || "Quant");
            handleChange("site_name", `${gold} ${silver}`.trim());
          }
        }}
        className="bg-white/5 border-white/10 focus:border-amber-500"
      />
    );
  };

  const previewBranding = {
    titleGold: values.site_title_gold || "Kuber",
    titleSilver: values.site_title_silver || "Quant",
    titleGoldColor: values.site_title_gold_color || "#D4AF37",
    titleSilverColor: values.site_title_silver_color || "#C0C0C0",
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Site Settings</h1>
            <p className="text-muted-foreground">Configure your platform's appearance, behavior, and content.</p>
          </div>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-amber-500" />
            {dirty.size > 0 && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                {dirty.size} unsaved change{dirty.size > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {isError && (
          <Card className="border-red-500/30 bg-red-500/10">
            <CardContent className="pt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Could not load settings from server{(error as Error)?.message ? `: ${(error as Error).message}` : ""}. Showing defaults — saves will still work.</span>
              </div>
              <Button size="sm" variant="outline" className="border-red-500/30 shrink-0" onClick={() => refetch()}>
                <RefreshCw className="h-3 w-3 mr-1" /> Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["general", "authentication"]} className="space-y-3">
            {CATEGORIES.map(cat => {
              const fields = byCategory(cat.key);
              return (
                <AccordionItem key={cat.key} value={cat.key} className="border border-white/10 rounded-xl bg-white/5 px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-2 text-left">
                      <cat.icon className="h-5 w-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="font-semibold text-white">{cat.label} Settings</p>
                        <p className="text-xs text-muted-foreground font-normal">{fields.length} field{fields.length !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Card className="bg-transparent border-0 shadow-none">
                      <CardHeader className="px-0 pt-0">
                        <div className="flex justify-between items-start">
                          <CardDescription>Configure {cat.label.toLowerCase()} platform settings.</CardDescription>
                          <Button
                            onClick={() => handleSave(cat.key)}
                            disabled={updateMutation.isPending}
                            className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2 shrink-0"
                          >
                            <Save className="h-4 w-4" />
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="px-0 space-y-6">
                        {cat.key === "appearance" && (
                          <Card className="border-amber-500/20 bg-gradient-to-br from-black/40 to-amber-500/5">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base text-white">Header Brand Title Preview</CardTitle>
                              <CardDescription>
                                This is how the site title appears in the dashboard header — gold word first, silver word second.
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="flex flex-wrap items-center gap-4">
                              {(values.logo_url || values.favicon_url) && (
                                <img
                                  src={values.logo_url || values.favicon_url}
                                  alt="Logo preview"
                                  className="h-12 w-12 object-contain rounded bg-white/10 p-1"
                                />
                              )}
                              <BrandTitle size="xl" branding={previewBranding} />
                            </CardContent>
                          </Card>
                        )}
                        {cat.key === "authentication" && (
                          <GoogleOAuthPreview
                            enabled={values.google_oauth_enabled === "true"}
                            clientId={values.google_client_id || ""}
                            envClientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
                          />
                        )}
                        {fields.map((setting: SiteSetting) => (
                          <div key={setting.key} className="space-y-1.5">
                            <Label className="text-sm font-medium text-foreground">
                              {setting.label}
                            </Label>
                            {renderField(setting)}
                            {setting.description && (
                              <p className="text-xs text-muted-foreground">{setting.description}</p>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
  );
}

export default function AdminSettingsPage() {
  return <SiteSettingsContent />;
}
