import { NextRequest, NextResponse } from "next/server";
import { createSessionForEmail, setSessionCookie } from "@/lib/auth";
import { getUsers, saveUsers, type UserProfile } from "@/lib/store";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL("/sign-in?error=google-failed", request.url),
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL("/sign-in?error=google-not-configured", request.url),
    );
  }

  try {
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Google token exchange failed", await tokenResponse.text());
      return NextResponse.redirect(
        new URL("/sign-in?error=google-failed", request.url),
      );
    }

    const tokens = (await tokenResponse.json()) as { access_token: string };
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    if (!userInfoResponse.ok) {
      return NextResponse.redirect(
        new URL("/sign-in?error=google-failed", request.url),
      );
    }

    const googleUser = (await userInfoResponse.json()) as {
      email?: string;
      name?: string;
    };
    if (!googleUser.email) {
      return NextResponse.redirect(
        new URL("/sign-in?error=google-failed", request.url),
      );
    }

    const email = googleUser.email.toLowerCase();
    const users = await getUsers();
    const existing = users.find(
      (user) => user.email.toLowerCase() === email,
    );
    if (!existing) {
      const newUser: UserProfile = {
        id: crypto.randomUUID(),
        name: googleUser.name || email.split("@")[0] || "Player",
        email,
        createdAt: new Date().toISOString(),
        signInMethod: "passwordless email",
      };
      await saveUsers([...users, newUser]);
    }

    const session = await createSessionForEmail(email);
    await setSessionCookie(session);
    const destination = session.role === "admin" ? "/dashboard" : "/tracker";
    return NextResponse.redirect(new URL(destination, request.url));
  } catch (error) {
    console.error("Google OAuth callback failed", error);
    return NextResponse.redirect(
      new URL("/sign-in?error=google-failed", request.url),
    );
  }
}