// Browser Notification & Web Push utilities for Casino Countdown Timers

const STORAGE_KEY = "dailyroll_casino_notifications";

export type NotificationPermissionState = NotificationPermission | "unsupported";

/**
 * Checks whether the current environment supports Notifications.
 */
export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * Returns the current notification permission state, or 'unsupported'.
 */
export function getNotificationPermission(): NotificationPermissionState {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * Proactively registers and returns the active Service Worker registration.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }
  try {
    let reg = await navigator.serviceWorker.getRegistration().catch(() => null);
    if (!reg) {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
    }
    return reg || null;
  } catch (err) {
    console.warn("Failed to get or register service worker:", err);
    return null;
  }
}

/**
 * Requests browser notification permission on demand.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";

  // Pre-register service worker so it's ready when permission is granted
  getOrRegisterServiceWorker().catch(() => {});

  try {
    let permission: NotificationPermission;
    const p = Notification.requestPermission();
    if (p && typeof p.then === "function") {
      permission = await p;
    } else {
      // Legacy callback for Safari
      permission = await new Promise((resolve) => {
        Notification.requestPermission(resolve);
      });
    }
    return permission;
  } catch (err) {
    console.error("Failed to request notification permission:", err);
    return Notification.permission;
  }
}

/**
 * Retrieves local casino notification preferences from localStorage.
 */
export function getCasinoNotificationPreferences(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Saves a casino's notification toggle preference locally and syncs with Upstash Redis API.
 */
export async function setCasinoNotificationPreference(
  casinoId: string,
  enabled: boolean,
  userEmail?: string | null
): Promise<Record<string, boolean>> {
  const current = getCasinoNotificationPreferences();
  const updated = { ...current, [casinoId]: enabled };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  // Background sync with Upstash Redis if signed in
  try {
    fetch("/api/user/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ casinoId, enabled, preferences: updated }),
    }).catch(() => {});
  } catch {}

  return updated;
}

/**
 * Fetches saved notification preferences from Upstash Redis and hydrates localStorage.
 */
export async function fetchServerNotificationPreferences(): Promise<Record<string, boolean>> {
  if (typeof window === "undefined") return {};
  try {
    const res = await fetch("/api/user/notifications", { cache: "no-store" });
    if (!res.ok) return getCasinoNotificationPreferences();
    const data = await res.json();
    if (data?.preferences && typeof data.preferences === "object") {
      const merged = { ...getCasinoNotificationPreferences(), ...data.preferences };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.warn("Failed to fetch notification preferences from server:", err);
  }
  return getCasinoNotificationPreferences();
}

import { playNotificationChime, vibrateDevice, flashTabTitle } from "@/lib/audioAlert";

const lastNotificationSentAt: Record<string, number> = {};

/**
 * Dispatches a multi-channel notification (Audio Chime, Device Vibration, Tab Flashing, & Native OS Notification)
 * when a casino's timer resets to zero.
 */
export async function sendCasinoReadyNotification(
  casinoName: string,
  bonusText?: string,
  url?: string,
  iconUrl?: string
): Promise<boolean> {
  const normalizedKey = casinoName.trim().toLowerCase();
  const now = Date.now();

  // Throttle duplicate notifications for the exact same casino within 30 seconds
  if (lastNotificationSentAt[normalizedKey] && now - lastNotificationSentAt[normalizedKey] < 30_000) {
    console.log(`[DailyRoll] Throttling duplicate notification for ${casinoName} (sent ${Math.round((now - lastNotificationSentAt[normalizedKey]) / 1000)}s ago)`);
    return false;
  }
  lastNotificationSentAt[normalizedKey] = now;

  const title = `${casinoName} — Ready to Claim! 🎁`;
  const bonusSubtext = bonusText ? ` (${bonusText})` : "";
  const body = `Your daily reload bonus for ${casinoName}${bonusSubtext} is ready to claim now!`;
  const targetUrl = url || "/tracker";
  const tag = `casino-ready-${casinoName.toLowerCase().replace(/\s+/g, "-")}`;
  const icon = iconUrl || "/icon-192.png";

  // 1. Multi-channel Immediate Feedback
  playNotificationChime();
  vibrateDevice([200, 100, 200]);
  flashTabTitle(`${casinoName} Ready!`);

  // 2. Native OS Notification (if supported and granted)
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const isMobile =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  let osDispatched = false;

  // On desktop browsers (Windows / macOS / Linux), try direct window.Notification first
  if (!isMobile && typeof window !== "undefined" && "Notification" in window) {
    try {
      const notification = new Notification(title, {
        body,
        icon,
        tag,
      });
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        if (targetUrl && targetUrl !== window.location.pathname) {
          window.location.href = targetUrl;
        }
        notification.close();
      };
      osDispatched = true;
      console.log(`[DailyRoll] Native desktop window.Notification dispatched for ${casinoName}`);
    } catch (desktopErr) {
      console.warn("[DailyRoll] Desktop window.Notification failed, trying ServiceWorker:", desktopErr);
    }
  }

  // On mobile (Android Chrome / PWA), or fallback from desktop
  if (!osDispatched && typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    // Immediate fallback: Post directly to active SW controller if available
    try {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          options: {
            body,
            icon,
            badge: "/favicon.ico",
            tag,
            renotify: false,
            vibrate: [200, 100, 200],
            data: { url: targetUrl },
          },
        });
      }
    } catch {}

    try {
      let reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 1200)),
      ]);

      if (!reg) {
        reg = (await navigator.serviceWorker.getRegistration().catch(() => null)) || null;
      }
      if (!reg) {
        reg = (await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null)) || null;
      }

      if (reg) {
        if (reg.installing) {
          await new Promise<void>((res) => {
            const w = reg!.installing;
            if (!w) return res();
            w.addEventListener("statechange", () => {
              if (w.state === "activated") res();
            });
            setTimeout(res, 1000);
          });
        }

        if (typeof reg.showNotification === "function") {
          await reg.showNotification(title, {
            body,
            icon,
            badge: "/favicon.ico",
            tag,
            renotify: false,
            vibrate: [200, 100, 200],
            data: { url: targetUrl },
          } as any);
          osDispatched = true;
          console.log(`[DailyRoll] ServiceWorker showNotification dispatched for ${casinoName}`);
        }
      }
    } catch (swErr) {
      console.warn("[DailyRoll] ServiceWorker showNotification failed:", swErr);
    }
  }

  return osDispatched;
}

/**
 * Triggers a notification when a countdown timer hits zero.
 */
export async function triggerTimerZeroNotification(
  casinoName: string,
  casinoLogo?: string,
  bonusText?: string,
  url?: string
): Promise<boolean> {
  return sendCasinoReadyNotification(casinoName, bonusText, url, casinoLogo);
}

/**
 * Dispatches an immediate test notification to verify audio chime, vibration, in-app toast, and native OS alert.
 */
export async function sendTestNotification(casinoName: string = "DailyRoll"): Promise<boolean> {
  return sendCasinoReadyNotification(
    casinoName,
    "Test Notification — Alerts Active!",
    "/tracker"
  );
}
