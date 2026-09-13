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
      siteUrl?: string;
      affiliateUrl?: string;
      claimUrl?: string;
      bonusUrl?: string;
      bonusTitle?: string;
      trustpilotRating?: number;
      dailyBonus?: string;
      details?: string;
    };

    if (!body?.name?.trim()) {
      return NextResponse.json({ error: "Casino name is required." }, { status: 400 });
    }

    // 1. Audit Persistence: Write directly to shared Upstash Redis / DB
    const directory = await updateCasinoMetadata(body);

    // 2. Invalidate Cache: Immediately revalidate /tracker and 'casinos' tag
    try {
      revalidatePath("/tracker");
      revalidatePath("/dashboard/casinos");
      revalidateTag("casinos", "default");
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
