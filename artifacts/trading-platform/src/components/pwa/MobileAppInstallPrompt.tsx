import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Smartphone, Share, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  canInstallApp,
  captureInstallPrompt,
  isPwaInstalled,
  promptInstallApp,
  registerServiceWorker,
} from "@/lib/push-notifications";
import {
  dismissInstallPrompt,
  isAndroidDevice,
  isInstallPromptDismissed,
  isIosDevice,
  isMobileDevice,
} from "@/lib/device";
import { useToast } from "@/hooks/use-toast";

/** Prompts mobile users to install the PWA for a native full-screen experience. */
export function MobileAppInstallPrompt() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    captureInstallPrompt();
    registerServiceWorker();

    const syncShell = () => {
      document.documentElement.classList.toggle("pwa-standalone", isPwaInstalled());
      document.documentElement.classList.toggle("mobile-device", isMobileDevice());
    };

    const evaluate = () => {
      syncShell();
      if (!isMobileDevice() || isPwaInstalled() || isInstallPromptDismissed()) {
        setOpen(false);
        return;
      }
      setCanInstall(canInstallApp());
      setOpen(true);
    };

    evaluate();
    window.addEventListener("beforeinstallprompt", evaluate);
    window.addEventListener("appinstalled", evaluate);
    return () => {
      window.removeEventListener("beforeinstallprompt", evaluate);
      window.removeEventListener("appinstalled", evaluate);
    };
  }, []);

  const handleInstall = async () => {
    const ok = await promptInstallApp();
    if (ok) {
      setOpen(false);
      toast({ title: t("pwa.installed") });
      return;
    }
    if (isIosDevice()) {
      toast({
        title: t("pwa.installTitle"),
        description: `${t("pwa.iosStep1")} → ${t("pwa.iosStep2")}`,
      });
    }
  };

  const handleDismiss = () => {
    dismissInstallPrompt();
    setOpen(false);
  };

  if (!open) return null;

  const ios = isIosDevice();
  const android = isAndroidDevice();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) handleDismiss(); }}>
      <DialogContent className="max-w-[min(100vw-1.5rem,24rem)] gap-0 p-0 overflow-hidden border-amber-500/30">
        <div className="bg-gradient-to-br from-amber-500/15 via-background to-background p-5 pb-4">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-start justify-between gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20">
                <Smartphone className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 -mr-1 -mt-1"
                onClick={handleDismiss}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <DialogTitle className="text-lg leading-snug pr-2">{t("pwa.installTitle")}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {t("pwa.installDescription")}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 pb-2 space-y-3">
          {ios ? (
            <ol className="text-xs text-muted-foreground space-y-2 list-none">
              <li className="flex gap-2 items-start">
                <Share className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>{t("pwa.iosStep1")}</span>
              </li>
              <li className="flex gap-2 items-start">
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-amber-500/20 text-[10px] font-bold text-amber-700 dark:text-amber-300">+</span>
                <span>{t("pwa.iosStep2")}</span>
              </li>
              <li className="flex gap-2 items-start">
                <Smartphone className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                <span>{t("pwa.iosStep3")}</span>
              </li>
            </ol>
          ) : (
            <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
              <li>{canInstall ? t("pwa.androidStep1") : t("pwa.androidStep2")}</li>
              {canInstall && <li>{t("pwa.androidStep2")}</li>}
            </ol>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 p-5 pt-3 sm:flex-col sm:space-x-0">
          {(canInstall || android) && !ios && (
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              onClick={handleInstall}
            >
              <Download className="h-4 w-4 mr-2" />
              {t("pwa.installNow")}
            </Button>
          )}
          {ios && (
            <Button
              className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              onClick={handleInstall}
            >
              <Share className="h-4 w-4 mr-2" />
              {t("pwa.installNow")}
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full text-muted-foreground" onClick={handleDismiss}>
            {t("pwa.continueBrowser")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
