import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { redis } from "@/lib/redis";

const SCHEDULED_PUSH_KEY = "scheduled_push_timers";

interface SchedulePayload {
  casinoId: string;
  casinoName: string;
  dailyBonus?: string;
  targetResetTimestamp: number;
  subscription: PushSubscriptionJSON;
  userEmail: string;
}

/**
 * POST /api/notifications/schedule
 * Schedules a push notification for when a casino timer reaches zero.
 * Stores the entry in a Redis sorted set with score = targetResetTimestamp.
 */
function getUserIdentifier(sessionEmail?: string | null, endpoint?: string): string {
  if (sessionEmail && sessionEmail.trim()) {
    return sessionEmail.trim().toLowerCase();
  }
  if (endpoint) {
    const clean = endpoint.replace(/[^a-zA-Z0-9]/g, "");
    return `guest_${clean.slice(-32)}`;
  }
  return "guest_device";
}

/**
 * POST /api/notifications/schedule
 * Schedules a push notification for when a casino timer reaches zero.
 * Stores the entry in a Redis sorted set with score = targetResetTimestamp.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession().catch(() => null);
    const body = await req.json();
    const { casinoId, casinoName, dailyBonus, targetResetTimestamp, subscription } = body;

    if (!casinoId || !targetResetTimestamp || !subscription) {
      return NextResponse.json(
        { error: "Missing required fields: casinoId, targetResetTimestamp, subscription" },
        { status: 400 }
      );
    }

    const userIdentifier = getUserIdentifier(session?.email, subscription?.endpoint);

    // Create a unique member key so we can find/replace per user+casino
    const memberKey = `${userIdentifier}:${casinoId}`;

    const payload: SchedulePayload = {
      casinoId,
      casinoName: casinoName || "Casino",
      dailyBonus: dailyBonus || "",
      targetResetTimestamp,
      subscription,
      userEmail: userIdentifier,
    };

    // Store payload in data hash and index by timestamp in sorted set
    await redis.hset(`${SCHEDULED_PUSH_KEY}:data`, {
      [memberKey]: JSON.stringify(payload),
    });
    await redis.zadd(SCHEDULED_PUSH_KEY, {
      score: targetResetTimestamp,
      member: memberKey,
    });

    return NextResponse.json({ success: true, memberKey });
  } catch (error) {
    console.error("[DailyRoll] Failed to schedule push notification:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/schedule
 * Removes a scheduled push notification for a specific casino.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCurrentSession().catch(() => null);
    const body = await req.json();
    const { casinoId, endpoint } = body;

    if (!casinoId) {
      return NextResponse.json({ error: "Missing casinoId" }, { status: 400 });
    }

    const userIdentifier = getUserIdentifier(session?.email, endpoint);
    const memberKey = `${userIdentifier}:${casinoId}`;

    // Remove from both the sorted set index and the data hash
    await redis.zrem(SCHEDULED_PUSH_KEY, memberKey);
    await redis.hdel(`${SCHEDULED_PUSH_KEY}:data`, memberKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DailyRoll] Failed to delete scheduled push:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

