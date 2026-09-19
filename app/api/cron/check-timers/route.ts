import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "disabled",
    message: "Background push notifications are currently disabled.",
  });
}
