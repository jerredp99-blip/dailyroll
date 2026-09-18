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
 * Requests browser notification permission on demand.
 */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    const permission = await Notification.requestPermission();
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
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== "granted") return false;

  const title = `${casinoName} — Ready to Claim! 🎁`;
  const bonusSubtext = bonusText ? ` (${bonusText})` : "";
  const body = `Your daily reload bonus for ${casinoName}${bonusSubtext} is ready to claim now!`;
  const targetUrl = url || "/tracker";

  const options: NotificationOptions = {
    body,
    icon: "/icon-192x192.png",
    badge: "/favicon.ico",
    tag: `casino-ready-${casinoName.toLowerCase().replace(/\s+/g, "-")}`,
    renotify: true,
    data: { url: targetUrl },
  };

  // 1. Try ServiceWorkerRegistration.showNotification (recommended for PWA & mobile)
  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, options);
        return true;
      }
    } catch (err) {
      console.warn("ServiceWorker showNotification failed, falling back to window.Notification:", err);
    }
  }

  // 2. Fallback to native window.Notification
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      if (url && url.startsWith("http")) {
        window.open(url, "_blank");
      }
      notification.close();
    };
    return true;
  } catch (err) {
    console.error("Failed to show native browser notification:", err);
    return false;
  }
}
