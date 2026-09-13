import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { getDirectory, updateCasinoMetadata } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const directory = await getDirectory();
    return NextResponse.json(
      { ok: true, directory },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to fetch admin casino directory", error);
    return NextResponse.json({ error: "Failed to fetch directory" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json()) as {
      name: string;
      siteUrl?: string | null;
      affiliateUrl?: string | null;
      claimUrl?: string | null;
      bonusUrl?: string | null;
      bonusTitle?: string | null;
      trustpilotRating?: number | string | null;
      dailyBonus?: string | null;
      details?: string | null;
      resetAtTime?: string | null;
      intervalHours?: number | string | null;
      provider?: string | null;
    };

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Casino name is required." }, { status: 400 });
    }

    const updateData: Record<string, any> = { name: body.name.trim() };
    if ("siteUrl" in body) updateData.siteUrl = body.siteUrl === "" ? null : body.siteUrl;
    if ("affiliateUrl" in body) updateData.affiliateUrl = body.affiliateUrl === "" ? null : body.affiliateUrl;
    if ("claimUrl" in body) updateData.claimUrl = body.claimUrl === "" ? null : body.claimUrl;
    if ("bonusUrl" in body) updateData.bonusUrl = body.bonusUrl === "" ? null : body.bonusUrl;
    if ("bonusTitle" in body) updateData.bonusTitle = body.bonusTitle === "" ? null : body.bonusTitle;
    if ("trustpilotRating" in body) updateData.trustpilotRating = (body.trustpilotRating === "" || body.trustpilotRating === null) ? null : Number(body.trustpilotRating);
    if ("dailyBonus" in body) updateData.dailyBonus = body.dailyBonus === "" ? null : body.dailyBonus;
    if ("details" in body) updateData.details = body.details === "" ? null : body.details;
    if ("resetAtTime" in body) updateData.resetAtTime = body.resetAtTime === "" ? null : body.resetAtTime;
    if ("intervalHours" in body) updateData.intervalHours = (body.intervalHours === "" || body.intervalHours === null) ? 24 : Number(body.intervalHours);
    if ("provider" in body) updateData.provider = body.provider === "" ? null : body.provider;

    // 1. Audit Persistence: Write directly to shared Upstash Redis / DB
    const directory = await updateCasinoMetadata(updateData as any);

    // 2. Invalidate Cache: Immediately revalidate /tracker and 'casinos' tag
    try {
      revalidatePath("/tracker");
      revalidatePath("/dashboard/casinos");
      try {
        revalidateTag("casinos", "default");
      } catch {}
    } catch (cacheErr) {
      console.warn("Cache revalidation warning:", cacheErr);
    }

    return NextResponse.json(
      { ok: true, directory },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Admin casino update failed:", error);
    return NextResponse.json({ error: "Failed to update casino link" }, { status: 500 });
  }
}

export const PUT = POST;
export const PATCH = POST;
