import { NextResponse } from "next/server";
import { touchUserLastActive } from "@/lib/activity";

export async function POST(req: Request) {
  try {
    const text = await req.text();
    let userId = "";

    if (text) {
      try {
        const body = JSON.parse(text);
        userId = body.userId;
      } catch {
        // Fallback if plain string or form data
      }
    }

    if (userId) {
      await touchUserLastActive(userId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Heartbeat handler error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

