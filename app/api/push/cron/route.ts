import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { checkAndDispatchDueBonusNotifications } from "@/lib/push-cron";

export const dynamic = "force-dynamic";

async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "dailyroll-cron-secret-change-me";
    const isVercelCronHeader = req.headers.get("x-vercel-cron") === "1";

    const isCronAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) || isVercelCronHeader;

    if (!isCronAuthorized) {
      const session = await getCurrentSession().catch(() => null);
      if (session?.role !== "admin") {
        return NextResponse.json(
          { error: "Unauthorized: Vercel Cron or admin session required" },
          { status: 401 }
        );
      }
    }

    const result = await checkAndDispatchDueBonusNotifications();

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        ...result,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[api/push/cron] Error executing bonus timer check:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to execute cron check" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

