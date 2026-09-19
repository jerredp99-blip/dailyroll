"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getNotificationPermission,
  checkIosPushEligibility,
  getExistingPushSubscription,
  subscribeToPush,
  unsubscribeFromPush,
  type SubscribePushResult,
} from "@/lib/push-notifications";

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  isIosNeedsInstall: boolean;
  errorMessage: string | null;
  clearError: () => void;
  subscribe: (
    casinoId?: string,
    casinoTimer?: { name: string; targetResetTimestamp: number; dailyBonus?: string },
    userId?: string
  ) => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  toggle: (casinoId?: string) => Promise<boolean>;
  sendTestNotification: () => Promise<{ success: boolean; error?: string }>;
  refreshState: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isIosNeedsInstall, setIsIosNeedsInstall] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refreshState = useCallback(async () => {
    if (typeof window === "undefined") return;

    const supported = isPushSupported();
    setIsSupported(supported);

    const currentPermission = getNotificationPermission();
    setPermission(currentPermission);

    const iosCheck = checkIosPushEligibility();
    setIsIosNeedsInstall(iosCheck.needsInstall);

    if (supported) {
      try {
        const sub = await getExistingPushSubscription();
        setIsSubscribed(Boolean(sub));
      } catch {
        setIsSubscribed(false);
      }
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const subscribe = useCallback(
    async (
      casinoId?: string,
      casinoTimer?: { name: string; targetResetTimestamp: number; dailyBonus?: string },
      userId?: string
    ): Promise<boolean> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result: SubscribePushResult = await subscribeToPush({
          casinoId,
          casinoTimer,
          userId,
        });

        if (!result.success) {
          setErrorMessage(result.error);
          setPermission(getNotificationPermission());
          return false;
        }

        setIsSubscribed(true);
        setPermission("granted");
        return true;
      } catch (err: any) {
        setErrorMessage(err?.message || "Failed to enable notifications");
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await unsubscribeFromPush();
      if (result.success) {
        setIsSubscribed(false);
        return true;
      }
      setErrorMessage(result.error || "Failed to disable notifications");
      return false;
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to disable notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggle = useCallback(
    async (casinoId?: string): Promise<boolean> => {
      if (isSubscribed) {
        return unsubscribe();
      } else {
        return subscribe(casinoId);
      }
    },
    [isSubscribed, subscribe, unsubscribe]
  );

  const sendTestNotification = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const sub = await getExistingPushSubscription();
      if (!sub) {
        return {
          success: false,
          error: "No active push subscription found on this device. Please toggle reminders on first.",
        };
      }

      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          subscription: sub.toJSON(),
          payload: {
            title: "dailyroll | Test Alert 🔔",
            body: "Push notifications are active! You will receive alerts when daily bonus timers expire.",
            icon: "/icon-192.png",
            badge: "/favicon-32x32.png",
            data: { url: "/tracker" },
          },
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Server responded with ${res.status}: Failed to deliver test notification`,
        };
      }

      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || "Failed to dispatch test notification",
      };
    }
  }, []);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    isIosNeedsInstall,
    errorMessage,
    clearError,
    subscribe,
    unsubscribe,
    toggle,
    sendTestNotification,
    refreshState,
  };
}

