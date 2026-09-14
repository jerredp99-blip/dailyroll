import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { getUsers, saveUserPreferences, UserPreferences } from "@/lib/store";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null, preferences: null });
  }

  const users = await getUsers();
  const profile = users.find(
    (user) => user.email.trim().toLowerCase() === session.email.trim().toLowerCase(),
  );

  return NextResponse.json({
    user: profile
      ? {
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl ?? profile.preferences?.avatarUrl ?? null,
        }
      : { name: session.email.split("@")[0], email: session.email, avatarUrl: null },
    preferences: profile?.preferences ?? null,
  });
}

export async function POST(request: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Partial<UserPreferences>;
    const prefUpdate: Partial<UserPreferences> = {};
    if ("notifications" in body) prefUpdate.notifications = Boolean(body.notifications);
    if ("amoe" in body) prefUpdate.amoe = Boolean(body.amoe);
    if ("sortOrder" in body) prefUpdate.sortOrder = body.sortOrder ?? "next-available";
    if ("name" in body) prefUpdate.name = body.name ? String(body.name).trim() : "";
    if ("contactEmail" in body) {
      prefUpdate.contactEmail =
        body.contactEmail === "" || body.contactEmail === null
          ? undefined
          : String(body.contactEmail).trim();
    }
    if ("avatarUrl" in body) {
      prefUpdate.avatarUrl =
        body.avatarUrl === "" || body.avatarUrl === null
          ? undefined
          : String(body.avatarUrl).trim();
    }

    const user = await saveUserPreferences(session.email, prefUpdate as UserPreferences);

    if (!user) {
      return NextResponse.json({ error: "Profile not found." }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? user.preferences?.avatarUrl ?? null,
      },
      preferences: user.preferences ?? null,
    });
  } catch (error) {
    console.error("Unable to save profile preferences", error);
    return NextResponse.json(
      { error: "Unable to save preferences right now." },
      { status: 503 },
    );
  }
}

export const PUT = POST;
export const PATCH = POST;
