import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie, verifyMagicLink } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/sign-in?error=invalid", request.url));
  }

  const session = await verifyMagicLink(token);
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in?error=expired", request.url));
  }

  await setSessionCookie(session);
  const destination = session.role === "admin" ? "/dashboard" : "/tracker";
  return NextResponse.redirect(new URL(destination, request.url));
}