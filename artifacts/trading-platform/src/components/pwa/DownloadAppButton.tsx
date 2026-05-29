import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  canInstallApp,
  captureInstallPrompt,
  isPwaInstalled,
  promptInstallApp,
} from "@/lib/push-notifications";
import { isIosDevice, isMobileDevice } from "@/lib/device";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  compact?: boolean;
  className?: string;
};

/** Header action to install the PWA (Android prompt or iOS instructions). */
export function DownloadAppButton({ compact, className }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [canInstall, setCanInstall] = useState(false);
  const [installed, setInstalled] = useState(isPwaInstalled());

  useEffect(() => {
    captureInstallPrompt();
    const sync = () => {
      setInstalled(isPwaInstalled());
      setCanInstall(canInstallApp());
    };
    sync();
    window.addEventListener("beforeinstallprompt", sync);
    window.addEventListener("appinstalled", sync);
    return () => {
      window.removeEventListener("beforeinstallprompt", sync);
      window.removeEventListener("appinstalled", sync);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (isIosDevice()) {
      toast({
        title: t("pwa.installTitle"),
        description: `${t("pwa.iosStep1")} → ${t("pwa.iosStep2")}`,
      });
      return;
    }
    const ok = await promptInstallApp();
    if (ok) {
      toast({ title: t("pwa.installed") });
      setInstalled(true);
      return;
    }
    if (isMobileDevice()) {
      toast({
        title: t("pwa.installTitle"),
        description: t("pwa.androidStep2"),
      });
    } else {
      toast({
        title: t("pwa.installTitle"),
        description: t("pwa.installDescription"),
      });
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "sm" : "default"}
      className={cn(
        compact ? "h-8 sm:h-9 px-2.5 text-xs sm:text-sm shrink-0" : "",
        "border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10",
        className,
      )}
      onClick={() => void handleClick()}
    >
      {canInstall || !isIosDevice() ? (
        <Download className={cn(compact ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />
      ) : (
        <Smartphone className={cn(compact ? "h-3.5 w-3.5 mr-1.5" : "h-4 w-4 mr-2")} />
      )}
      {t("pwa.downloadApp", { defaultValue: "Download App" })}
    </Button>
  );
}
