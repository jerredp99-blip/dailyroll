import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import {
  getPushSubscriptions,
  toggleCasinoPushAlert,
  syncPushCasinoTimers,
  queueMutation,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { casinoId, enabled, endpoint, casinoTimer, casinoTimers } = body || {};

    if (!endpoint && !casinoId && !casinoTimers) {
      return NextResponse.json(
        { error: "casinoId or casinoTimers is required" },
        { status: 400 }
      );
    }

    // Bulk sync timers case
    if (endpoint && casinoTimers) {
      const updated = await syncPushCasinoTimers({
        endpoint,
        casinoTimers,
      });
      return NextResponse.json({
        success: true,
        enabledCasinos: updated?.enabledCasinos || [],
        casinoTimers: updated?.casinoTimers || {},
      });
    }

    if (endpoint && casinoId) {
      const updated = await toggleCasinoPushAlert({
        endpoint,
        casinoId,
        enabled,
        casinoTimer: enabled !== false ? casinoTimer : null,
      });
      return NextResponse.json({
        success: true,
        enabledCasinos: updated?.enabledCasinos || [],
        casinoTimers: updated?.casinoTimers || {},
      });
    }

    const session = await getCurrentSession().catch(() => null);
    const userId = session?.email ? session.email.toLowerCase() : null;

    // If endpoint not passed directly, match by userId
    if (userId) {
      let updatedCasinos: string[] = [];
      await queueMutation((store) => {
        if (!store.pushSubscriptions) return;
        for (const sub of store.pushSubscriptions) {
          if (sub.userId?.toLowerCase() === userId) {
            let list = sub.enabledCasinos || [];
            const has = list.includes(casinoId);
            const shouldEnable = enabled !== undefined ? enabled : !has;

            if (shouldEnable && !has) {
              list = [...list, casinoId];
            } else if (!shouldEnable && has) {
              list = list.filter((id) => id !== casinoId);
            }
            sub.enabledCasinos = list;
            sub.updatedAt = new Date().toISOString();
            updatedCasinos = list;
          }
        }
      });

      return NextResponse.json({
        success: true,
        enabledCasinos: updatedCasinos,
      });
    }

    return NextResponse.json(
      { error: "No endpoint or user session found to associate casino alert" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[api/push/toggle-casino] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to toggle casino push alert" },
      { status: 500 }
    );
  }
}

