import { redis } from "@/lib/redis";

export type ActivityEventType =
  | "SIGNUP"
  | "LOGIN"
  | "CASINO_ADDED"
  | "CASINO_REMOVED"
  | "CLAIM"
  | "SPEED_RUN_STARTED"
  | "SPEED_RUN_COMPLETED"
  | "BALANCE_EDIT";

export interface ActivityEvent {
  type: ActivityEventType;
  details?: Record<string, any>;
  timestamp: number;
}

export async function trackUserActivity(
  userId: string,
  type: ActivityEventType,
  details: Record<string, any> = {}
) {
  if (!userId || !userId.trim()) return;
  const normalizedId = userId.trim().toLowerCase();

  try {
    const event: ActivityEvent = {
      type,
      details,
      timestamp: Date.now(),
    };

    // Push event to user-specific activity log (capped at last 100 events)
    const key = `user:${normalizedId}:activity_log`;
    await redis.lpush(key, JSON.stringify(event));
    await redis.ltrim(key, 0, 99);

    // Increment summary counters
    if (type === "CLAIM") {
      await redis.hincrby(`user:${normalizedId}:activity_summary`, "total_claims", 1);
    } else if (type === "SPEED_RUN_COMPLETED") {
      await redis.hincrby(`user:${normalizedId}:activity_summary`, "speed_runs", 1);
    } else if (type === "CASINO_ADDED") {
      await redis.hincrby(`user:${normalizedId}:activity_summary`, "total_casinos_added", 1);
    }

    await redis.hset(`user:${normalizedId}:activity_summary`, {
      last_active: Date.now(),
    });
  } catch (err) {
    console.error("Failed to log activity:", err);
  }
}

