import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const session = await getCurrentSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await context.params;
  if (!userId) {
    return NextResponse.json({ error: "User ID required" }, { status: 400 });
  }

  const normalizedId = decodeURIComponent(userId).trim().toLowerCase();

  let summary: Record<string, any> = {};
  let log: any[] = [];

  try {
    summary = (await redis.hgetall(`user:${normalizedId}:activity_summary`)) || {};
    const rawLog = await redis.lrange(`user:${normalizedId}:activity_log`, 0, 49);
    log = (rawLog || []).map((entry) => {
      if (typeof entry === "string") {
        try {
          return JSON.parse(entry);
        } catch {
          return entry;
        }
      }
      return entry;
    });
  } catch (err) {
    console.error("Failed to fetch user activity telemetry:", err);
  }

  return NextResponse.json({ summary, log });
}

