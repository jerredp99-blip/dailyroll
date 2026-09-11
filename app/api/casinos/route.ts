import { NextRequest, NextResponse } from "next/server";
import { casinoKey, deleteCasinos, getCasinos, saveCasinos, Casino } from "@/lib/store";

export async function GET(request: NextRequest) {
  const key = casinoKey(request.nextUrl.searchParams.get("key"));
  const casinos = await getCasinos(key);
  return NextResponse.json({ casinos });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { key?: string; casinos: Casino[] };
  const key = casinoKey(body.key);
  const casinos = await saveCasinos(key, body.casinos);
  return NextResponse.json({ casinos });
}

export async function DELETE(request: NextRequest) {
  const key = casinoKey(request.nextUrl.searchParams.get("key"));
  await deleteCasinos(key);
  return NextResponse.json({ ok: true });
}
