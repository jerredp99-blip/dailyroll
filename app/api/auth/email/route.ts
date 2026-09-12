import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_EMAIL,
  createPasswordUser,
  createSessionForEmail,
  setSessionCookie,
  signInWithPassword,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; name?: string };
    const email = body.email?.trim().toLowerCase();
    const password = body.password?.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    if (!password) {
      return NextResponse.json({ error: "Enter a password." }, { status: 400 });
    }

    if (body.name) {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json({ error: "Enter your name to create a profile." }, { status: 400 });
      }
      if (email === ADMIN_EMAIL.toLowerCase()) {
        return NextResponse.json({ error: "The admin account is managed separately." }, { status: 403 });
      }

      try {
        await createPasswordUser(email, name, password);
      } catch (error) {
        const message = error instanceof Error ? error.message : "A profile with that email already exists.";
        return NextResponse.json({ error: message }, { status: 409 });
      }

      const session = await createSessionForEmail(email);
      await setSessionCookie(session);
      return NextResponse.json({ ok: true, redirectTo: session.role === "admin" ? "/dashboard" : "/tracker" });
    }

    const session = await signInWithPassword(email, password);
    if (!session) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    await setSessionCookie(session);
    return NextResponse.json({ ok: true, redirectTo: session.role === "admin" ? "/dashboard" : "/tracker" });
  } catch (error) {
    console.error("Unable to sign in with password", error);
    return NextResponse.json({ error: "Unable to sign in. Please try again." }, { status: 503 });
  }
}