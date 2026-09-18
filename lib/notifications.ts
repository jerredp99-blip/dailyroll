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

/**
 * Dispatches a browser/service-worker notification when a casino's timer resets to zero.
 */
export async function sendCasinoReadyNotification(
  casinoName: string,
  bonusText?: string,
  url?: string
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn("[DailyRoll] Notifications not supported in this environment");
    return false;
  }
  if (Notification.permission !== "granted") {
    console.warn("[DailyRoll] Notification permission not granted:", Notification.permission);
    return false;
  }

  const title = `${casinoName} — Ready to Claim! 🎁`;
  const bonusSubtext = bonusText ? ` (${bonusText})` : "";
  const body = `Your daily reload bonus for ${casinoName}${bonusSubtext} is ready to claim now!`;
  const targetUrl = url || "/tracker";
  const tag = `casino-ready-${casinoName.toLowerCase().replace(/\s+/g, "-")}`;

  // 1. Try ServiceWorkerRegistration.showNotification first (required on Android Chrome & mobile PWAs)
  if ("serviceWorker" in navigator) {
    try {
      // Ensure registration exists without waiting indefinitely
      let registration = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (!registration) {
        registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => null);
      }

      // Race navigator.serviceWorker.ready with a 600ms timeout so it NEVER freezes
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 600)),
      ]);

      const activeReg = readyReg || registration;
      if (activeReg && typeof activeReg.showNotification === "function") {
        await activeReg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/favicon.ico",
          tag,
          renotify: true,
          vibrate: [200, 100, 200],
          data: { url: targetUrl },
        } as any);
        console.log(`[DailyRoll] SW Notification dispatched for ${casinoName}`);
        return true;
      }
    } catch (swErr) {
      console.warn("[DailyRoll] SW showNotification failed, trying window.Notification:", swErr);
    }
  }

  // 2. Fallback to native window.Notification (standard on desktop Windows/macOS/Linux)
  try {
    const notification = new Notification(title, {
      body,
      icon: "/icon-192.png",
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
    console.log(`[DailyRoll] Window Notification dispatched for ${casinoName}`);
    return true;
  } catch (notifErr) {
    console.error("[DailyRoll] Native window.Notification failed:", notifErr);
    return false;
  }
}

/**
 * Dispatches an immediate test notification to verify audio, vibration, and banner on device.
 */
export async function sendTestNotification(casinoName: string = "DailyRoll"): Promise<boolean> {
  return sendCasinoReadyNotification(
    casinoName,
    "Test Notification — Alerts Active!",
    "/tracker"
  );
}
