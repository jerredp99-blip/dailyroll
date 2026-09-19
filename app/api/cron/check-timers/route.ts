import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { configureWebPush, webpush } from "@/lib/serverPush";

const SCHEDULED_PUSH_KEY = "scheduled_push_timers";

/**
 * GET /api/cron/check-timers
 *
 * Cron-triggered endpoint that checks for due push timer entries and sends
 * Web Push notifications for any casino timers that have expired.
 *
 * Protected by Vercel's CRON_SECRET header in production.
 */
export async function GET(req: NextRequest) {
  // Verify cron caller (allow Vercel cron agent or Bearer CRON_SECRET)
  const isVercelCron = req.headers.get("user-agent")?.includes("vercel-cron");
  const cronSecret = process.env.CRON_SECRET;
  if (!isVercelCron && cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Configure web-push with VAPID credentials
    await configureWebPush();

    const nowMs = Date.now();

    // Find all entries with score (targetResetTimestamp) <= now
    const dueMembers = (await redis.zrange<string[]>(
      SCHEDULED_PUSH_KEY,
      0,
      nowMs,
      { byScore: true }
    )) || [];

    if (!dueMembers || dueMembers.length === 0) {
      return NextResponse.json({ sent: 0, errors: 0, message: "No due timers" });
    }

    let sent = 0;
    let errors = 0;
    const processedKeys: string[] = [];

    for (const memberKey of dueMembers) {
      try {
        // Fetch the stored payload from the data hash
        const raw = await redis.hget(`${SCHEDULED_PUSH_KEY}:data`, memberKey);
        if (!raw) {
          // Orphaned sorted set entry — clean it up
          processedKeys.push(memberKey);
          continue;
        }

        const payload = typeof raw === "string" ? JSON.parse(raw) : raw;
        const { casinoName, dailyBonus, subscription } = payload;

        if (!subscription || !subscription.endpoint) {
          console.warn(`[DailyRoll Cron] Invalid subscription for ${memberKey}, skipping`);
          processedKeys.push(memberKey);
          errors++;
          continue;
        }

        // Build the push notification payload
        const bonusText = dailyBonus ? ` (${dailyBonus})` : "";
        const pushPayload = JSON.stringify({
          title: `${casinoName} — Ready to Claim! 🎁`,
          body: `Your daily reload bonus for ${casinoName}${bonusText} is ready to claim now!`,
          icon: "/icon-192x192.png",
          tag: `casino-ready-${casinoName.toLowerCase().replace(/\s+/g, "-")}`,
          url: "/tracker",
        });

        // Send the push notification
        await webpush.sendNotification(
          subscription as webpush.PushSubscription,
          pushPayload
        );

        sent++;
        processedKeys.push(memberKey);
        console.log(`[DailyRoll Cron] Push sent for ${casinoName} (${memberKey})`);
      } catch (err: any) {
        // Handle expired/invalid subscriptions (status 410 or 404)
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          console.warn(`[DailyRoll Cron] Subscription expired for ${memberKey}, removing`);
          processedKeys.push(memberKey);
        } else {
          console.error(`[DailyRoll Cron] Push failed for ${memberKey}:`, err);
        }
        errors++;
      }
    }

    // Clean up processed entries from both sorted set and data hash
    if (processedKeys.length > 0) {
      await redis.zrem(SCHEDULED_PUSH_KEY, ...processedKeys);
      await redis.hdel(`${SCHEDULED_PUSH_KEY}:data`, ...processedKeys);
    }

    return NextResponse.json({
      sent,
      errors,
      processed: processedKeys.length,
      message: `Processed ${processedKeys.length} timer(s)`,
    });
  } catch (error) {
    console.error("[DailyRoll Cron] check-timers failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

