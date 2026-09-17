import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentSession } from "@/lib/auth";
import { updateCasinoMetadata } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session || session.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = (await request.json()) as {
      name: string;
      provider?: string | null;
      operator?: string | null;
      siteUrl?: string | null;
      url?: string | null;
      affiliateUrl?: string | null;
      claimUrl?: string | null;
      dailyBonus?: string | null;
      dailyBonusLabel?: string | null;
      dailyBonusSc?: string | null;
      dailyScAmount?: number | string | null;
      dailyBonusGc?: string | null;
      dailyGcAmount?: string | null;
      minRedemption?: string | null;
      minRedemptionText?: string | null;
      intervalHours?: number | string | null;
      resetHours?: number | string | null;
      resetAtTime?: string | null;
      claimTip?: string | null;
    };

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Casino name is required." }, { status: 400 });
    }

    const trimmedName = body.name.trim();

    // 1. Approve & publish casino metadata across master directory and users
    const directory = await updateCasinoMetadata({
      name: trimmedName,
      isPublished: true,
      pendingReview: false,
      provider: body.provider || body.operator || undefined,
      siteUrl: body.siteUrl || body.url || undefined,
      affiliateUrl: body.affiliateUrl || undefined,
      claimUrl: body.claimUrl || undefined,
      dailyBonus: body.dailyBonusLabel || body.dailyBonus || undefined,
      dailyBonusSc: body.dailyScAmount !== undefined && body.dailyScAmount !== null
        ? String(body.dailyScAmount)
        : body.dailyBonusSc || undefined,
      dailyBonusGc: body.dailyGcAmount || body.dailyBonusGc || undefined,
      minRedemption: body.minRedemptionText || body.minRedemption || undefined,
      intervalHours: (body.resetHours !== undefined && body.resetHours !== null)
        ? Number(body.resetHours)
        : body.intervalHours ? Number(body.intervalHours) : 24,
      resetAtTime: body.resetAtTime || undefined,
      claimTip: body.claimTip || undefined,
      claimInstructions: body.claimTip || undefined,
    });

    // 2. Invalidate cache tags and route paths
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
      { ok: true, casinoName: trimmedName, directory },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Failed to approve and publish casino:", error);
    return NextResponse.json({ error: "Failed to approve casino" }, { status: 500 });
  }
}

export const PUT = POST;
export const PATCH = POST;

