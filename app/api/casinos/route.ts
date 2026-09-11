import { NextRequest, NextResponse } from "next/server";
import { casinoKey, deleteCasinos, getCasinos, saveCasinos, Casino } from "@/lib/store";

export async function GET(request: NextRequest) {
  try {
    const key = casinoKey(request.nextUrl.searchParams.get("key"));
    const casinos = await getCasinos(key);
    return NextResponse.json({ casinos });
  } catch (error) {
    console.error("Unable to load casinos", error);
    return NextResponse.json({ error: "Unable to load casinos." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { key?: string; casinos: Casino[] };
    const key = casinoKey(body.key);
    const casinos = await saveCasinos(key, body.casinos);
    return NextResponse.json({ casinos });
  } catch (error) {
    console.error("Unable to save casinos", error);
    return NextResponse.json({ error: "Unable to save casinos." }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const key = casinoKey(request.nextUrl.searchParams.get("key"));
    await deleteCasinos(key);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete casinos", error);
    return NextResponse.json({ error: "Unable to delete casinos." }, { status: 503 });
  }
}
