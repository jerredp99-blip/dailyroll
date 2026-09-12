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
    const user = await saveUserPreferences(session.email, {
      notifications: Boolean(body.notifications),
      amoe: Boolean(body.amoe),
      sortOrder: body.sortOrder ?? "status",
      name: typeof body.name === "string" ? body.name : undefined,
      contactEmail:
        typeof body.contactEmail === "string" ? body.contactEmail : undefined,
      avatarUrl: typeof body.avatarUrl === "string" ? body.avatarUrl : undefined,
    });

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
