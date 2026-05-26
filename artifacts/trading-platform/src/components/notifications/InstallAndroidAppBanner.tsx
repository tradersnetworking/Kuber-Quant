import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Download, Bell, X } from "lucide-react";
import {
  canInstallApp, captureInstallPrompt, isPwaInstalled, promptInstallApp, subscribeToPush,
} from "@/lib/push-notifications";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function InstallAndroidAppBanner({ compact }: { compact?: boolean }) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    captureInstallPrompt();
    setInstalled(isPwaInstalled());
    const check = () => setVisible(canInstallApp() || (!isPwaInstalled() && /Android/i.test(navigator.userAgent)));
    check();
    window.addEventListener("beforeinstallprompt", check);
    return () => window.removeEventListener("beforeinstallprompt", check);
  }, []);

  if (installed || !visible) return null;

  const install = async () => {
    const ok = await promptInstallApp();
    if (ok) {
      setInstalled(true);
      setVisible(false);
      toast({ title: "App installed", description: "Kuber Quant is on your home screen." });
    } else {
      toast({
        title: "Install manually",
        description: "Chrome menu → Add to Home screen / Install app",
      });
    }
  };

  const enablePush = async () => {
    if (!token) return;
    const ok = await subscribeToPush(token);
    toast({
      title: ok ? "Push enabled" : "Push blocked",
      description: ok ? "You'll get pop alerts for deposits, withdrawals & services." : "Allow notifications in browser settings.",
      variant: ok ? "default" : "destructive",
    });
  };

  if (compact) {
    return (
      <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-400" onClick={install}>
        <Download className="h-3.5 w-3.5 mr-1" /> Install App
      </Button>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-600/5 border-amber-500/30 relative">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <p className="font-semibold text-sm">Install Kuber Quant on Android</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add our app to your home screen for fast access, deposit/withdrawal pop alerts, and service updates — no Play Store required.
            </p>
            <ol className="text-[11px] text-muted-foreground mt-2 list-decimal list-inside space-y-0.5">
              <li>Tap <strong className="text-foreground">Install App</strong> below (Chrome)</li>
              <li>Or: browser menu → <strong className="text-foreground">Add to Home screen</strong></li>
              <li>Enable push for instant deposit & withdrawal alerts</li>
            </ol>
          </div>
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <Button className="bg-amber-500 hover:bg-amber-600 text-black font-bold" onClick={install}>
            <Download className="h-4 w-4 mr-2" /> Install App
          </Button>
          <Button variant="outline" className="border-white/10" onClick={enablePush}>
            <Bell className="h-4 w-4 mr-2" /> Enable Pop Alerts
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="absolute top-2 right-2 sm:static" onClick={() => setVisible(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
