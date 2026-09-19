import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { savePushSubscription } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId: providedUserId, subscription, casinoId, casinoTimer } = body || {};

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription payload: missing endpoint or keys" },
        { status: 400 }
      );
    }

    const { endpoint, keys, expirationTime } = subscription;
    if (!keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid subscription keys: p256dh and auth are required" },
        { status: 400 }
      );
    }

    let finalUserId = providedUserId;
    if (!finalUserId) {
      const session = await getCurrentSession().catch(() => null);
      if (session?.email) {
        finalUserId = session.email.toLowerCase();
      }
    }

    const saved = await savePushSubscription({
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      expirationTime: expirationTime ?? null,
      userId: finalUserId || null,
      casinoId: casinoId || null,
      casinoTimer: casinoTimer || null,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Push subscription registered successfully",
        subscription: {
          id: saved.id,
          endpoint: saved.endpoint,
          userId: saved.userId,
          enabledCasinos: saved.enabledCasinos,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[api/push/subscribe] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to process push subscription" },
      { status: 500 }
    );
  }
}

