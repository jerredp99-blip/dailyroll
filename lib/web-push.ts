import webpush from "web-push";
import {
  getPushSubscriptions,
  removePushSubscription,
  type StoredPushSubscription,
} from "./store";

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT ||
  process.env.VAPID_CONTACT_EMAIL ||
  "mailto:support@dailyroll.app";

const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BPygaQG9DlHDvKRjzYfwYI8kbipKG0nkqXb-C52HpO46j1Yy6GyaoHib433uXrJ2f2v6H3iwY9DOZ44bw_To5Qk";

const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  "OlPu-mK2inHBnHGzvqmWYmg7Hyw2a37cwHTZGfCNrrM";

let isVapidConfigured = false;

function ensureVapidConfigured() {
  if (isVapidConfigured) return;
  try {
    if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
      webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
      isVapidConfigured = true;
    }
  } catch (error) {
    console.error("[web-push] Error setting VAPID details:", error);
  }
}

export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

export type PushNotificationPayload = {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: {
    url?: string;
    casinoId?: string;
    [key: string]: unknown;
  };
  tag?: string;
  renotify?: boolean;
};

/**
 * Sends a push notification to a specific subscription endpoint.
 * Automatically deletes stale / expired subscriptions from the database on 410 Gone or 404 Not Found.
 */
export async function sendPushNotification(
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  },
  payload: PushNotificationPayload | string
): Promise<{ success: boolean; error?: string; expired?: boolean }> {
  ensureVapidConfigured();

  try {
    let payloadString: string;
    if (typeof payload === "string") {
      payloadString = payload;
    } else {
      const sanitizedPayload: PushNotificationPayload = {
        title: payload.title || "dailyroll | Bonus Ready!",
        body: payload.body || "A sweepstakes bonus cooldown has reset. Claim now!",
        icon: payload.icon || "/icon-192.png",
        badge: payload.badge || "/favicon-32x32.png",
        data: {
          url: payload.data?.url || "/tracker",
          ...(payload.data?.casinoId ? { casinoId: payload.data.casinoId } : {}),
        },
        tag: payload.tag || "dailyroll-timer",
        renotify: payload.renotify ?? true,
      };
      payloadString = JSON.stringify(sanitizedPayload);
    }

    // Ensure payload is under the 4KB Web Push specification limit
    const byteLength = Buffer.byteLength(payloadString, "utf-8");
    if (byteLength > 4000) {
      console.warn(`[web-push] Warning: payload size (${byteLength} bytes) is close to or exceeds 4KB limit.`);
    }

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payloadString
    );

    return { success: true };
  } catch (error: any) {
    const statusCode = error?.statusCode || error?.status;
    console.error(`[web-push] Delivery failed for endpoint ${subscription.endpoint}:`, statusCode || error?.message);

    // 410 Gone or 404 Not Found indicates the client has unsubscribed or subscription is expired/invalid
    if (statusCode === 410 || statusCode === 404) {
      console.info(`[web-push] Subscription expired or gone (${statusCode}). Removing from database...`);
      await removePushSubscription(subscription.endpoint);
      return { success: false, error: `Subscription expired (${statusCode})`, expired: true };
    }

    return { success: false, error: error?.message || "Web Push delivery failed" };
  }
}

/**
 * Dispatches a push notification to all subscriptions belonging to a user.
 */
export async function dispatchNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  const subscriptions = await getPushSubscriptions({ userId });
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.expired) pruned++;
    }
  }

  return { sent, failed, pruned };
}

/**
 * Dispatches a push notification to subscribers interested in a specific casino.
 */
export async function dispatchNotificationToCasinoSubscribers(
  casinoId: string,
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  const subscriptions = await getPushSubscriptions({ casinoId });
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.expired) pruned++;
    }
  }

  return { sent, failed, pruned };
}

/**
 * Dispatches a push notification to all stored push subscriptions.
 */
export async function dispatchNotificationToAll(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number; pruned: number }> {
  const subscriptions = await getPushSubscriptions();
  let sent = 0;
  let failed = 0;
  let pruned = 0;

  for (const sub of subscriptions) {
    const result = await sendPushNotification(sub, payload);
    if (result.success) {
      sent++;
    } else {
      failed++;
      if (result.expired) pruned++;
    }
  }

  return { sent, failed, pruned };
}

