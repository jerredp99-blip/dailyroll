import { NextResponse } from "next/server";
import { configureWebPush } from "@/lib/serverPush";

export async function GET() {
  try {
    const publicKey = await configureWebPush();
    return NextResponse.json({ publicKey });
  } catch (error) {
    console.error("[DailyRoll] Failed to get VAPID public key:", error);
    return NextResponse.json({ error: "Failed to get public key" }, { status: 500 });
  }
}
