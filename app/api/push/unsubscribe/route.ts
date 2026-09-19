import { NextRequest, NextResponse } from "next/server";
import { removePushSubscription } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { endpoint } = body || {};

    if (!endpoint || typeof endpoint !== "string") {
      return NextResponse.json(
        { error: "Invalid request: endpoint string is required" },
        { status: 400 }
      );
    }

    const removed = await removePushSubscription(endpoint);

    return NextResponse.json(
      {
        success: true,
        removed,
        message: "Push subscription removed successfully",
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[api/push/unsubscribe] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to remove push subscription" },
      { status: 500 }
    );
  }
}

