import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { casinoKey, createCleanDefaultCasinos, deleteCasinos, getCasinos, saveCasinos, Casino } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";
import { trackUserActivity } from "@/lib/activity";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const requestedKey = request.nextUrl.searchParams.get("key");
    const key = casinoKey(requestedKey || session.email);
    // Users can only access their own casinos. Admins can access any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    let casinos = await getCasinos(key);
    if (!casinos) {
      // Initialize brand-new user profile with an empty array (0 casinos added)
      casinos = [];
      await saveCasinos(key, casinos);
    }
    return NextResponse.json({ casinos }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Unable to load casinos", error);
    return NextResponse.json({ error: "Unable to load casinos." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const body = (await request.json()) as { key?: string; casinos: Casino[] };
    const key = casinoKey(body.key || session.email);
    // Users can only save their own casinos. Admins can save any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const previousCasinos = (await getCasinos(key)) || [];
    const casinos = await saveCasinos(key, body.casinos);

    // Track addition / removal telemetry
    try {
      const prevNames = new Set(previousCasinos.map((c) => c.name.toLowerCase()));
      const nextNames = new Set((body.casinos || []).map((c) => c.name.toLowerCase()));

      for (const casino of body.casinos || []) {
        if (!prevNames.has(casino.name.toLowerCase())) {
          await trackUserActivity(session.email, "CASINO_ADDED", {
            casinoId: casino.id,
            name: casino.name,
          });
        }
      }
      for (const casino of previousCasinos) {
        if (!nextNames.has(casino.name.toLowerCase())) {
          await trackUserActivity(session.email, "CASINO_REMOVED", {
            casinoId: casino.id,
            name: casino.name,
          });
        }
      }
    } catch (trackErr) {
      console.warn("Telemetry tracking warning:", trackErr);
    }

    // Invalidate caches so other devices receive fresh data
    try {
      revalidatePath("/tracker");
      revalidateTag("casinos", "default");
    } catch (err) {
      console.warn("Cache revalidation warning:", err);
    }

    return NextResponse.json({ casinos }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Unable to save casinos", error);
    return NextResponse.json({ error: "Unable to save casinos." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const requestedKey = request.nextUrl.searchParams.get("key");
    const key = casinoKey(requestedKey || session.email);
    // Users can only delete their own casinos. Admins can delete any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    await deleteCasinos(key);

    try {
      revalidatePath("/tracker");
      revalidateTag("casinos", "default");
    } catch (err) {
      console.warn("Cache revalidation warning:", err);
    }

    return NextResponse.json({ ok: true }, { headers: NO_CACHE_HEADERS });
  } catch (error) {
    console.error("Unable to delete casinos", error);
    return NextResponse.json({ error: "Unable to delete casinos." }, { status: 503 });
  }
}