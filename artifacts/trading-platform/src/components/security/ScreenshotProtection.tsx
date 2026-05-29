import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useScreenshotProtectionSetting } from "@/hooks/use-screenshot-protection";
import { cn } from "@/lib/utils";

const ALLOW_SELECTOR = 'input, textarea, select, [contenteditable="true"], [data-allow-screenshot], [data-allow-copy]';

function isAllowedTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(ALLOW_SELECTOR));
}

function isBlockedSecurityShortcut(e: KeyboardEvent): boolean {
  const key = e.key;
  const lower = key.toLowerCase();

  if (key === "PrintScreen" || key === "Snapshot") return true;
  if (key === "F12") return true;

  const mod = e.metaKey || e.ctrlKey;

  if (mod && lower === "p") return true;
  if (mod && lower === "s") return true;
  if (mod && lower === "u") return true;
  if (mod && e.shiftKey && lower === "s") return true;
  if (mod && e.shiftKey && lower === "i") return true;
  if (mod && e.shiftKey && lower === "j") return true;
  if (mod && e.shiftKey && lower === "c") return true;
  if (mod && e.shiftKey && lower === "k") return true;
  if (mod && e.altKey && lower === "u") return true;

  if (e.metaKey && e.shiftKey && (key === "3" || key === "4" || key === "5")) return true;

  return false;
}

function WatermarkLayer({ label, opacity }: { label: string; opacity: number }) {
  const tiles = useMemo(() => Array.from({ length: 48 }, (_, i) => i), []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9998] overflow-hidden select-none"
      aria-hidden
    >
      <div
        className="absolute inset-[-50%] rotate-[-24deg] flex flex-wrap content-start gap-x-16 gap-y-12"
        style={{ opacity }}
      >
        {tiles.map((i) => (
          <span
            key={i}
            className="whitespace-nowrap text-[11px] sm:text-xs font-medium tracking-wide text-foreground"
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function PrivacyShield({ visible }: { visible: boolean }) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-xl transition-opacity duration-200",
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
      )}
      aria-hidden={!visible}
    >
      <div className="text-center px-6 max-w-sm">
        <p className="text-lg font-semibold text-foreground">Content hidden</p>
        <p className="text-sm text-muted-foreground mt-2">
          Return to the app to view your account. Screenshots and screen recording are restricted.
        </p>
      </div>
    </div>
  );
}

export function ScreenshotProtection() {
  const { user } = useAuth();
  const { config, enabled } = useScreenshotProtectionSetting();
  const [obscured, setObscured] = useState(false);

  const isSuperAdmin = user?.role === "superadmin";
  const protectionActive = enabled && !isSuperAdmin;

  const watermarkLabel = user
    ? `${user.email || user.fullName || "User"} · #${user.id}`
    : "Kuber Quant · Confidential";

  useEffect(() => {
    if (!protectionActive) {
      document.documentElement.classList.remove("screenshot-protected", "screenshot-print-blocked");
      setObscured(false);
      return;
    }

    document.documentElement.classList.add("screenshot-protected");

    const onContextMenu = (e: MouseEvent) => {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
    };

    const onClipboard = (e: ClipboardEvent) => {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      if (isAllowedTarget(e.target)) return;
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isAllowedTarget(e.target)) return;
      if (!isBlockedSecurityShortcut(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };

    const onVisibility = () => {
      setObscured(document.hidden);
    };

    const onBeforePrint = () => {
      document.documentElement.classList.add("screenshot-print-blocked");
    };
    const onAfterPrint = () => {
      document.documentElement.classList.remove("screenshot-print-blocked");
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onClipboard);
    document.addEventListener("cut", onClipboard);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    onVisibility();

    return () => {
      document.documentElement.classList.remove("screenshot-protected", "screenshot-print-blocked");
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onClipboard);
      document.removeEventListener("cut", onClipboard);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [protectionActive]);

  if (!protectionActive) return null;

  return (
    <>
      {config.watermarkEnabled && (
        <WatermarkLayer label={watermarkLabel} opacity={config.watermarkOpacity} />
      )}
      <PrivacyShield visible={obscured} />
    </>
  );
}
