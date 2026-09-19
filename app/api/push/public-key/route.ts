import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const publicKey = getVapidPublicKey();
    if (!publicKey) {
      return NextResponse.json(
        { error: "VAPID public key not configured on server" },
        { status: 500 }
      );
    }
    return NextResponse.json({ publicKey }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

