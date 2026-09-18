import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getSpeedRunSessionStore,
  saveSpeedRunSessionStore,
  deleteSpeedRunSessionStore,
} from "@/lib/store";
import type { SpeedRunSessionState } from "@/types/casino";
import { trackUserActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function getSessionKey(email?: string | null): string {
  if (email && email.trim()) {
    return email.trim().toLowerCase();
  }
  return "anonymous";
}

export async function GET() {
  try {
    const userSession = await getCurrentSession();
    const key = getSessionKey(userSession?.email);
    const speedRun = await getSpeedRunSessionStore(key);

    return NextResponse.json({ session: speedRun }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to fetch speed run session:", error);
    return NextResponse.json({ error: "Failed to fetch session" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userSession = await getCurrentSession();
    const key = getSessionKey(userSession?.email);
    const body = (await request.json()) as { session: SpeedRunSessionState };

    if (!body?.session || !Array.isArray(body.session.queueIds)) {
      return NextResponse.json({ error: "Invalid speed run session payload" }, { status: 400 });
    }

    const saved = await saveSpeedRunSessionStore(key, body.session);

    if (userSession?.email) {
      const isComplete = Boolean(body.session.completed) || body.session.currentIndex >= body.session.queueIds.length;
      await trackUserActivity(
        userSession.email,
        isComplete ? "SPEED_RUN_COMPLETED" : "SPEED_RUN_STARTED",
        {
          queueLength: body.session.queueIds.length,
          currentIndex: body.session.currentIndex,
        }
      );
    }

    return NextResponse.json({ ok: true, session: saved }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to persist speed run session:", error);
    return NextResponse.json({ error: "Failed to persist session" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userSession = await getCurrentSession();
    const key = getSessionKey(userSession?.email);
    await deleteSpeedRunSessionStore(key);

    return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Failed to delete speed run session:", error);
    return NextResponse.json({ error: "Failed to delete session" }, { status: 500 });
  }
}

