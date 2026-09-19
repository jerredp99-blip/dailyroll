/**
 * Client-side Web Push Notification Utilities
 * Implements VAPID key conversion, permission handling, subscription lifecycle,
 * and iOS PWA installation compatibility checks.
 */

/**
 * Converts a URL-safe base64 string to a Uint8Array suitable for PushManager.subscribe.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks whether the current browser and environment support the Web Push API.
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Detects if the current user agent is an iOS device (iPhone, iPad, iPod).
 */
export function isIosDevice(): boolean {
  if (typeof window === "undefined") return false;
  const userAgent = window.navigator.userAgent || "";
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isMacWithTouch =
    /Macintosh/.test(userAgent) && window.navigator.maxTouchPoints > 1;
  return isIos || isMacWithTouch;
}

/**
 * Detects if the web app is running in installed standalone PWA mode.
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Validates iOS specific Web Push eligibility.
 * Apple requires iOS 16.4+ AND the app must be added to Home Screen (standalone).
 */
export function checkIosPushEligibility(): {
  isIos: boolean;
  isStandalone: boolean;
  needsInstall: boolean;
} {
  const isIos = isIosDevice();
  const isStandalone = isStandalonePwa();
  return {
    isIos,
    isStandalone,
    needsInstall: isIos && !isStandalone,
  };
}

/**
 * Retrieves the current notification permission state.
 */
export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Ensures the service worker is registered and returns the active registration.
 */
export async function getOrRegisterServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Workers are not supported in this browser.");
  }

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return existing;
  }

  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

/**
 * Retrieves the existing push subscription from the service worker, if any.
 */
export async function getExistingPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (err) {
    console.warn("[web-push] Error reading existing push subscription:", err);
    return null;
  }
}

/**
 * Fetches the VAPID public key from the backend API.
 */
export async function fetchVapidPublicKey(): Promise<string> {
  // If next public env var is available, we can use it directly
  if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  }

  const res = await fetch("/api/push/public-key");
  if (!res.ok) {
    throw new Error(`Failed to fetch VAPID public key: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.publicKey) {
    throw new Error("No public key returned from server");
  }
  return data.publicKey;
}

export type SubscribePushResult =
  | { success: true; subscription: PushSubscription }
  | {
      success: false;
      reason: "unsupported" | "ios_needs_install" | "permission_denied" | "error";
      error: string;
      permission?: NotificationPermission;
    };

/**
 * Initiates push subscription flow upon direct user interaction:
 * 1. Checks iOS PWA standalone constraints.
 * 2. Requests permission via Notification.requestPermission().
 * 3. Fetches VAPID public key and converts it.
 * 4. Subscribes via registration.pushManager.subscribe().
 * 5. Sends subscription payload to POST /api/push/subscribe.
 */
export async function subscribeToPush(options?: {
  userId?: string;
  casinoId?: string;
}): Promise<SubscribePushResult> {
  if (!isPushSupported()) {
    return {
      success: false,
      reason: "unsupported",
      error: "Web Push Notifications are not supported in this browser.",
    };
  }

  // Check iOS requirements: iOS only supports Web Push when installed to Home Screen
  const iosStatus = checkIosPushEligibility();
  if (iosStatus.needsInstall) {
    return {
      success: false,
      reason: "ios_needs_install",
      error:
        "On iPhone and iPad, push notifications require adding Daily Roll to your Home Screen first. Tap Share (square with arrow) -> 'Add to Home Screen', then launch the app from your home screen.",
    };
  }

  try {
    // Explicit user interaction permission request
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      return {
        success: false,
        reason: "permission_denied",
        permission,
        error:
          permission === "denied"
            ? "Notifications are blocked in your browser settings. Please update your browser site settings to allow notifications."
            : "Notification permission request was closed.",
      };
    }

    // Get registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = await fetchVapidPublicKey();
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // Persist subscription to backend
    const rawSub = subscription.toJSON();
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: rawSub,
        userId: options?.userId,
        casinoId: options?.casinoId,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to persist subscription on server");
    }

    return { success: true, subscription };
  } catch (error: any) {
    console.error("[web-push] Subscription failed:", error);
    return {
      success: false,
      reason: "error",
      error: error?.message || "Failed to complete push subscription",
    };
  }
}

/**
 * Unsubscribes from push notifications:
 * 1. Calls subscription.unsubscribe().
 * 2. Informs backend to delete endpoint.
 */
export async function unsubscribeFromPush(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isPushSupported()) return { success: true };

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      }).catch((err) => console.warn("[web-push] Failed to notify server of unsubscribe:", err));
    }

    return { success: true };
  } catch (error: any) {
    console.error("[web-push] Unsubscribe failed:", error);
    return { success: false, error: error?.message || "Failed to unsubscribe" };
  }
}

