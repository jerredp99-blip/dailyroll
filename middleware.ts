import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("dailyroll_session")?.value;
  const { pathname, searchParams } = request.nextUrl;

  // Normalize /login to /sign-in, preserving query parameters
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // If already authenticated and visiting sign-in or login, redirect to requested target or /tracker
  if (sessionToken && (pathname === "/sign-in" || pathname === "/login")) {
    const redirectTo = searchParams.get("redirect") || "/tracker";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/sign-in"],
};

