import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("dailyroll_session")?.value;
  const { pathname, searchParams } = request.nextUrl;

  // 1. Normalize /login to /sign-in, preserving query parameters
  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // 2. Allow static files, Next.js assets, public auth and push endpoints
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/push") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    /\.(png|jpg|jpeg|svg|gif|webp|ico|css|js|mjs|map|json)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 3. Unauthenticated user protection:
  // Only allow access to /sign-in and / (landing page showing sign-in screen).
  // Block /tracker, /balances, /dashboard, /profile, /casinos, /speedrun, /user-profile, and protected API routes.
  if (!sessionToken) {
    if (pathname === "/sign-in" || pathname === "/") {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const signInUrl = new URL("/sign-in", request.url);
    const searchString = searchParams.toString();
    signInUrl.searchParams.set("redirect", pathname + (searchString ? `?${searchString}` : ""));
    return NextResponse.redirect(signInUrl);
  }

  // 4. Authenticated user redirection:
  // Redirect away from /sign-in or /login to /tracker (or redirect target)
  if (sessionToken && (pathname === "/sign-in" || pathname === "/login")) {
    const redirectTo = searchParams.get("redirect") || "/tracker";
    return NextResponse.redirect(new URL(redirectTo, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
