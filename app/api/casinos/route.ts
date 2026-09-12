import { NextRequest, NextResponse } from "next/server";
import { casinoKey, deleteCasinos, getCasinos, saveCasinos, Casino } from "@/lib/store";
import { getCurrentSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const requestedKey = request.nextUrl.searchParams.get("key");
    const key = casinoKey(requestedKey);
    // Users can only access their own casinos. Admins can access any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const casinos = await getCasinos(key);
    return NextResponse.json({ casinos });
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
    const key = casinoKey(body.key);
    // Users can only save their own casinos. Admins can save any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    const casinos = await saveCasinos(key, body.casinos);
    return NextResponse.json({ casinos });
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
    const key = casinoKey(requestedKey);
    // Users can only delete their own casinos. Admins can delete any key.
    if (session.role !== "admin" && key !== casinoKey(session.email)) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
    await deleteCasinos(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete casinos", error);
    return NextResponse.json({ error: "Unable to delete casinos." }, { status: 503 });
  }
}