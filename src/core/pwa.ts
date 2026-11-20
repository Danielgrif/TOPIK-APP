import { state } from "./state.ts";
import { SW_MESSAGES } from "./constants.ts";
import { showToast } from "../utils/utils.ts";
import {
  showUpdateNotification,
  showInstallBanner,
  dismissInstallBanner,
} from "../ui/ui_interactions.ts";

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function initPWA(): void {
  if ("serviceWorker" in navigator) {
    const swUrl = import.meta.env.DEV ? "/src/sw.ts" : "/sw.js";
    navigator.serviceWorker
      .register(swUrl, { type: import.meta.env.DEV ? "module" : "classic" })
      .then((reg) => {
        // Check for updates periodically every hour
        setInterval(() => reg.update(), 60 * 60 * 1000);

        if (reg.installing) {
          console.info("SW: Installing...");
        } else if (reg.active) {
          console.info("SW: Active and ready");
        }

        if (!navigator.serviceWorker.controller) {
          showToast("✅ Приложение готово к работе офлайн!");
        }

        // Register for Periodic Background Sync
        const registration = reg as ServiceWorkerRegistration & {
          periodicSync?: {
            register: (tag: string, options: { minInterval: number }) => Promise<void>;
          };
        };
        if (registration.periodicSync) {
          registration.periodicSync
            .register(SW_MESSAGES.CONTENT_SYNC, {
              minInterval: 12 * 60 * 60 * 1000,
            })
            .then(() => console.info("✅ Periodic Sync registered for tag: content-sync"))
            .catch((err) => console.error("❌ Periodic Sync registration failed:", err));
        }

        const handleUpdate = (worker: ServiceWorker) => {
          if (state.autoUpdate) {
            worker.postMessage({ type: SW_MESSAGES.SKIP_WAITING });
          } else {
            showUpdateNotification(worker);
          }
        };

        if (reg.waiting) handleUpdate(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                handleUpdate(newWorker);
              }
            });
          }
        });
      })
      .catch((err) => console.error("SW Registration Failed:", err));

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      window.location.reload();
      refreshing = true;
    });

    navigator.serviceWorker.addEventListener("message", (event: MessageEvent) => {
      const data = event.data as { type: string; count: number };
      if (data && data.type === SW_MESSAGES.DOWNLOAD_QUEUE_COMPLETED) {
        if (data.count > 0) showToast(`✅ Докачано файлов: ${data.count}`);
      }
    });
  }

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    const btn = document.getElementById("install-app-btn");
    if (btn) btn.style.display = "flex";

    showInstallBanner();
  });
}

export async function installApp(): Promise<void> {
  dismissInstallBanner();
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === "accepted") {
    deferredPrompt = null;
    const btn = document.getElementById("install-app-btn");
    if (btn) btn.style.display = "none";
  }
}

export async function forceUpdateSW(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) await reg.unregister();
    window.location.reload();
  }
}

export { dismissInstallBanner };
