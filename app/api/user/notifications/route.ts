import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { redis } from "@/lib/redis";

export async function GET() {
  const session = await getCurrentSession();
  if (!session?.email) {
    return NextResponse.json({ preferences: {} });
  }

  const normalizedEmail = session.email.trim().toLowerCase();
  const key = `user:${normalizedEmail}:notifications`;

  try {
    const raw = await redis.get<string | Record<string, boolean>>(key);
    let preferences: Record<string, boolean> = {};

    if (raw) {
      if (typeof raw === "string") {
        try {
          preferences = JSON.parse(raw);
        } catch {
          preferences = {};
        }
      } else if (typeof raw === "object") {
        preferences = raw;
      }
    }

    return NextResponse.json({ preferences });
  } catch (error) {
    console.error("Failed to retrieve user notifications from Redis:", error);
    return NextResponse.json({ preferences: {} });
  }
}

export async function POST(req: NextRequest) {
  const session = await getCurrentSession().catch(() => null);
  const body = await req.json();
  const { casinoId, enabled, preferences: incomingPreferences, subscription } = body;

  if (!session?.email) {
    if (subscription && typeof subscription === "object" && subscription.endpoint) {
      const clean = subscription.endpoint.replace(/[^a-zA-Z0-9]/g, "");
      const subKey = `guest:${clean.slice(-32)}:push_subscription`;
      await redis.set(subKey, JSON.stringify(subscription)).catch(() => {});
    }
    return NextResponse.json({ success: true, guest: true });
  }

  const normalizedEmail = session.email.trim().toLowerCase();
  const key = `user:${normalizedEmail}:notifications`;

  try {

    // 1. Fetch current preferences
    let existingPreferences: Record<string, boolean> = {};
    try {
      const raw = await redis.get<string | Record<string, boolean>>(key);
      if (raw) {
        if (typeof raw === "string") {
          existingPreferences = JSON.parse(raw);
        } else if (typeof raw === "object") {
          existingPreferences = raw;
        }
      }
    } catch {}

    // 2. Merge changes
    const updatedPreferences = {
      ...existingPreferences,
      ...(incomingPreferences || {}),
    };

    if (typeof casinoId === "string" && typeof enabled === "boolean") {
      updatedPreferences[casinoId] = enabled;
    }

    // 3. Persist in Redis
    await redis.set(key, JSON.stringify(updatedPreferences));

    // 4. Optionally save web push subscription if provided
    if (subscription && typeof subscription === "object") {
      const subKey = `user:${normalizedEmail}:push_subscription`;
      await redis.set(subKey, JSON.stringify(subscription));
    }

    return NextResponse.json({ success: true, preferences: updatedPreferences });
  } catch (error) {
    console.error("Failed to update user notification preferences in Redis:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

