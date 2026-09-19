import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  sendPushNotification,
  dispatchNotificationToUser,
  dispatchNotificationToCasinoSubscribers,
  dispatchNotificationToAll,
  type PushNotificationPayload,
} from "@/lib/web-push";
import { getPushSubscriptions } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    const session = await getCurrentSession().catch(() => null);

    const body = await req.json().catch(() => ({}));
    const {
      endpoint,
      userId,
      casinoId,
      sendToAll,
      payload,
    } = body || {};

    const notificationPayload: PushNotificationPayload = {
      title: payload?.title || "dailyroll | Bonus Ready!",
      body: payload?.body || "A sweepstakes casino daily cooldown has expired. Claim now!",
      icon: payload?.icon || "/icon-192.png",
      badge: payload?.badge || "/favicon-32x32.png",
      data: {
        url: payload?.data?.url || "/tracker",
        ...(payload?.data?.casinoId ? { casinoId: payload.data.casinoId } : {}),
      },
      tag: payload?.tag || "dailyroll-timer",
      renotify: payload?.renotify ?? true,
    };

    // Case 1: Send to a specific subscription endpoint
    if (endpoint) {
      const subscriptions = await getPushSubscriptions();
      const sub = subscriptions.find((s) => s.endpoint === endpoint);
      if (!sub) {
        return NextResponse.json(
          { error: "Subscription endpoint not found in database" },
          { status: 404 }
        );
      }
      const result = await sendPushNotification(sub, notificationPayload);
      return NextResponse.json({ success: result.success, result });
    }

    // Only allow broadcast/multi-user notifications if admin or cron authorized
    const isAdmin = session?.role === "admin";
    if (!isAdmin && !isCronAuthorized) {
      // Regular logged-in users can only send a test notification to themselves
      if (session?.email) {
        const result = await dispatchNotificationToUser(session.email.toLowerCase(), notificationPayload);
        return NextResponse.json({ success: true, result });
      }
      return NextResponse.json(
        { error: "Unauthorized: admin or user session required to trigger push notifications" },
        { status: 401 }
      );
    }

    // Case 2: Send to specific casino subscribers
    if (casinoId) {
      const result = await dispatchNotificationToCasinoSubscribers(casinoId, notificationPayload);
      return NextResponse.json({ success: true, result });
    }

    // Case 3: Send to specific user
    if (userId) {
      const result = await dispatchNotificationToUser(userId, notificationPayload);
      return NextResponse.json({ success: true, result });
    }

    // Case 4: Send to all
    if (sendToAll) {
      const result = await dispatchNotificationToAll(notificationPayload);
      return NextResponse.json({ success: true, result });
    }

    // Default: send to current session user if exists
    if (session?.email) {
      const result = await dispatchNotificationToUser(session.email.toLowerCase(), notificationPayload);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { error: "Please specify endpoint, userId, casinoId, or sendToAll" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[api/push/send] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to dispatch push notification" },
      { status: 500 }
    );
  }
}

