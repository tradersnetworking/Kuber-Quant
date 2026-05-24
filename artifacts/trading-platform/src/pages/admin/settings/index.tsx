import { useState, useEffect } from "react";
import { useGetSiteSettings, useUpdateSiteSettings, SiteSetting } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Save, Globe, DollarSign, Phone, Palette, Settings } from "lucide-react";

const CATEGORIES = [
  { key: "general", label: "General", icon: Globe },
  { key: "financial", label: "Financial", icon: DollarSign },
  { key: "contact", label: "Contact", icon: Phone },
  { key: "appearance", label: "Appearance", icon: Palette },
];

export default function AdminSettingsPage() {
  const { data: settings, isLoading, refetch } = useGetSiteSettings();
  const updateMutation = useUpdateSiteSettings();
  const { toast } = useToast();

  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (settings) {
      const map: Record<string, string> = {};
      settings.forEach((s: SiteSetting) => { map[s.key] = s.value; });
      setValues(map);
    }
  }, [settings]);

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setDirty(prev => new Set(prev).add(key));
  };

  const handleSave = (category: string) => {
    const categoryKeys = settings?.filter((s: SiteSetting) => s.category === category).map((s: SiteSetting) => s.key) || [];
    const updates: Record<string, string> = {};
    categoryKeys.forEach(k => { if (values[k] !== undefined) updates[k] = values[k]; });

    updateMutation.mutate({ data: updates as any }, {
      onSuccess: () => {
        toast({ title: "Settings saved successfully" });
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

  const byCategory = (cat: string) => settings?.filter((s: SiteSetting) => s.category === cat) || [];

  const renderField = (setting: SiteSetting) => {
    const isBool = setting.value === "true" || setting.value === "false";
    const isColor = setting.key.includes("color");

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
        onChange={e => handleChange(setting.key, e.target.value)}
        className="bg-white/5 border-white/10 focus:border-amber-500"
      />
    );
  };

  return (
    <AppLayout>
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

        {isLoading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : (
          <Tabs defaultValue="general">
            <TabsList className="bg-white/5 border border-white/10">
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="data-[state=active]:bg-amber-500 data-[state=active]:text-black gap-1.5">
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {CATEGORIES.map(cat => (
              <TabsContent key={cat.key} value={cat.key} className="mt-4">
                <Card className="bg-white/5 border-white/10">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white flex items-center gap-2">
                          <cat.icon className="h-5 w-5 text-amber-500" />
                          {cat.label} Settings
                        </CardTitle>
                        <CardDescription>Configure {cat.label.toLowerCase()} platform settings.</CardDescription>
                      </div>
                      <Button
                        onClick={() => handleSave(cat.key)}
                        disabled={updateMutation.isPending}
                        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {updateMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {byCategory(cat.key).map((setting: SiteSetting) => (
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
                    {byCategory(cat.key).length === 0 && (
                      <p className="text-center text-muted-foreground py-8">No settings in this category.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}
