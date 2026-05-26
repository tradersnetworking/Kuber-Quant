/** Register service worker and subscribe to Web Push when permitted */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export async function subscribeToPush(token: string): Promise<boolean> {
  if (!("PushManager" in window) || !("Notification" in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const reg = await registerServiceWorker();
  if (!reg) return false;

  const keyRes = await fetch("/api/notifications/push/vapid-public-key", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!keyRes.ok) return false;
  const { publicKey } = await keyRes.json();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const res = await fetch("/api/notifications/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return res.ok;
}

export function isPwaInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches
    || (window.navigator as any).standalone === true;
}

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function captureInstallPrompt() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
  });
}

export async function promptInstallApp(): Promise<boolean> {
  if (!deferredPrompt) return false;
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}

export function canInstallApp(): boolean {
  return !!deferredPrompt && !isPwaInstalled();
}
