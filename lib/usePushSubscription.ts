"use client";

import { useRef, useCallback, useEffect } from "react";

/**
 * Converts a URL-safe base64 VAPID key to a Uint8Array for pushManager.subscribe().
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * React hook for managing Web Push subscriptions.
 *
 * Returns:
 * - `subscribe()` — subscribes the browser, stores in server, returns the PushSubscription JSON
 * - `getSubscription()` — returns the active subscription (auto-hydrated or freshly fetched)
 */
export function usePushSubscription() {
  const subscriptionRef = useRef<PushSubscriptionJSON | null>(null);
  const subscribingRef = useRef(false);

  const subscribe = useCallback(async (): Promise<PushSubscriptionJSON | null> => {
    // Return cached subscription if already subscribed
    if (subscriptionRef.current) {
      return subscriptionRef.current;
    }

    // Prevent concurrent subscription attempts
    if (subscribingRef.current) return null;
    subscribingRef.current = true;

    try {
      // 1. Check for service worker and push support
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window)
      ) {
        console.warn("[DailyRoll] Push notifications not supported in this browser");
        return null;
      }

      // 2. Get VAPID public key from server
      const vapidRes = await fetch("/api/notifications/vapid-public-key");
      if (!vapidRes.ok) {
        console.error("[DailyRoll] Failed to fetch VAPID public key");
        return null;
      }
      const { publicKey } = await vapidRes.json();
      if (!publicKey) {
        console.error("[DailyRoll] No VAPID public key returned");
        return null;
      }

      // 3. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 4. Check for existing subscription first
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 5. Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
        });
      }

      const subJson = subscription.toJSON();
      subscriptionRef.current = subJson;

      // 6. Send subscription to server for persistence
      try {
        await fetch("/api/user/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subJson }),
        });
      } catch (err) {
        console.warn("[DailyRoll] Failed to persist push subscription to server:", err);
      }

      console.log("[DailyRoll] Push subscription active");
      return subJson;
    } catch (err) {
      console.error("[DailyRoll] Push subscription failed:", err);
      return null;
    } finally {
      subscribingRef.current = false;
    }
  }, []);

  // Proactively auto-hydrate existing subscription on mount if permission was already granted
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            subscriptionRef.current = sub.toJSON();
          } else {
            // Subscribe if permission granted but no subscription object yet
            subscribe().catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [subscribe]);

  const getSubscription = useCallback(async (): Promise<PushSubscriptionJSON | null> => {
    if (subscriptionRef.current) return subscriptionRef.current;
    return subscribe();
  }, [subscribe]);

  return { subscribe, getSubscription };
}

